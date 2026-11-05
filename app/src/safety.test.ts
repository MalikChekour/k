import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assess, matchMeds, normalize } from './safety.ts';

const bundle = JSON.parse(readFileSync(new URL('./data/bundle.json', import.meta.url), 'utf-8'));
const ALL: string[] = bundle.plants.map((p: { id: string }) => p.id);
const ids = (a: { alerts: { claimId: string }[] }) => a.alerts.map(x => x.claimId);

// --- Cas de référence (écrits avant le code ; un échec bloque le CI) -------------------------------------------
test('millepertuis + warfarine = contre-indiqué (EMA)', () => {
  const r = assess(bundle, ['hypericum_perforatum'], { meds: ['Warfarine 5 mg'] });
  assert.equal(r.verdict, 'contre_indication');
  assert.ok(ids(r).includes('hypericum_perforatum-01'));
});
test('millepertuis + pilule contraceptive = majeure', () => {
  const r = assess(bundle, ['hypericum_perforatum'], { meds: ['pilule contraceptive'] });
  assert.equal(r.alerts.find(a => a.claimId === 'hypericum_perforatum-03')?.severity, 'majeure');
});
test('millepertuis + ciclosporine, tacrolimus, imatinib = contre-indiqué', () => {
  for (const m of ['Ciclosporine', 'tacrolimus', 'imatinib']) {
    assert.equal(assess(bundle, ['hypericum_perforatum'], { meds: [m] }).verdict, 'contre_indication', m);
  }
});
test('ginkgo + warfarine et ginkgo + clopidogrel = modérée ; trouble de coagulation = majeure', () => {
  assert.ok(ids(assess(bundle, ['ginkgo_biloba'], { meds: ['warfarine'] })).includes('ginkgo_biloba-02'));
  assert.ok(ids(assess(bundle, ['ginkgo_biloba'], { meds: ['clopidogrel'] })).includes('ginkgo_biloba-06'));
  const r = assess(bundle, ['ginkgo_biloba'], { flags: ['bleeding_disorder'] });
  assert.equal(r.alerts.find(a => a.claimId === 'ginkgo_biloba-03')?.severity, 'majeure');
});
test('ginkgo + grossesse = contre-indiqué', () => {
  assert.equal(assess(bundle, ['ginkgo_biloba'], { pregnant: true }).verdict, 'contre_indication');
});
test('reine-des-prés : ibuprofène = modérée ; allergie aux salicylés = contre-indiquée', () => {
  assert.equal(assess(bundle, ['filipendula_ulmaria'], { meds: ['ibuprofène'] }).alerts[0].severity, 'moderee');
  assert.equal(assess(bundle, ['filipendula_ulmaria'], { flags: ['salicylate_allergy'] }).verdict, 'contre_indication');
});
test('camomille et chardon-Marie : allergie aux Astéracées = contre-indiquée', () => {
  for (const p of ['matricaria_recutita', 'silybum_marianum'])
    assert.equal(assess(bundle, [p], { flags: ['asteraceae_allergy'] }).verdict, 'contre_indication', p);
});

// --- Honnêteté : ne jamais rassurer sans preuve -----------------------------------------------------------------
test("valériane + diazépam : AUCUNE alerte inventée (l'EMA ne rapporte rien), mais une note qui le dit sans promettre", () => {
  const r = assess(bundle, ['valeriana_officinalis'], { meds: ['diazépam'] });
  assert.equal(r.alerts.length, 0);
  assert.equal(r.notes[0].status, 'aucune_rapportee');
  assert.match(r.notes[0].text, /ne prouve pas/);
  assert.match(r.coverage, /ne prouve pas l'absence/);
});
test("Previscan (fluindione, indanedione) n'est PAS assimilé aux coumariniques : non couvert", () => {
  const r = assess(bundle, ['hypericum_perforatum'], { meds: ['Previscan'] });
  assert.ok(!ids(r).includes('hypericum_perforatum-01'));
  assert.equal(r.notes.find(n => n.medClass === 'anticoagulant_indanedione')?.status, 'non_couvert');
});
test('médicament inconnu => verdict « incomplet », jamais « aucune alerte »', () => {
  const r = assess(bundle, ['valeriana_officinalis'], { meds: ['Doliprane'] });
  assert.deepEqual(r.unknownMeds, ['Doliprane']);
  assert.equal(r.verdict, 'incomplet');
});
test('aucune plante sélectionnée => aucune conclusion', () => {
  assert.equal(assess(bundle, [], { meds: ['warfarine'] }).verdict, 'aucune_selection');
});
test('le verdict « sans danger » n’existe pas', () => {
  const r = assess(bundle, ['valeriana_officinalis'], {});
  assert.notEqual((r.verdict as string), 'sans_danger');
  assert.equal(r.verdict, 'aucune_alerte_dans_notre_base');
});
test('correspondance par mot entier uniquement', () => {
  assert.equal(matchMeds(['aspirine'], bundle.classes).matched.length, 1);
  assert.equal(matchMeds(['aspiri'], bundle.classes).matched.length, 0);
  assert.equal(matchMeds(['  ASPIRINE  500mg'], bundle.classes).matched.length, 1);
  assert.equal(normalize('Acétylsalicylique'), 'acetylsalicylique');
});

// --- Couverture des données ------------------------------------------------------------------------------------
test('grossesse : CHAQUE plante de la base produit une alerte (aucun trou silencieux)', () => {
  for (const p of ALL) assert.ok(assess(bundle, [p], { pregnant: true }).alerts.length > 0, `aucune alerte grossesse pour ${p}`);
});
test('âge 8 ans : les plantes avec une limite d’âge la signalent', () => {
  const r = assess(bundle, ALL, { ageYears: 8 });
  assert.ok(r.alerts.some(a => a.cause.includes('age_lt_12')) && r.alerts.some(a => a.cause.includes('age_lt_18')));
});
test('chaque alerte porte un extrait et un lien source', () => {
  const r = assess(bundle, ALL, { pregnant: true, lactating: true, ageYears: 5, flags: ['asteraceae_allergy', 'salicylate_allergy', 'bleeding_disorder', 'biliary_disease', 'fluid_restriction', 'drives', 'plant_allergy'],
    meds: ['warfarine', 'clopidogrel', 'ibuprofène', 'ciclosporine', 'pilule contraceptive', 'digoxine'] });
  assert.ok(r.alerts.length > 20);
  for (const a of r.alerts) assert.ok(a.quote.length > 10 && a.url.startsWith('https://'), a.claimId);
});

// --- Propriété : ajouter une plante ne fait jamais disparaître une alerte ---------------------------------------
test('monotonie : alertes(S) ⊆ alertes(S + plante), pour tous les sous-ensembles de 4 plantes', () => {
  const profile = { pregnant: true, ageYears: 30, meds: ['warfarine', 'clopidogrel', 'pilule contraceptive'], flags: ['asteraceae_allergy'] };
  const pool = ['hypericum_perforatum', 'ginkgo_biloba', 'matricaria_recutita', 'filipendula_ulmaria'];
  for (let mask = 0; mask < 16; mask++) {
    const base = pool.filter((_, i) => mask & (1 << i));
    const keys = new Set(assess(bundle, base, profile).alerts.map(a => a.plantId + a.claimId));
    for (const extra of pool.filter(p => !base.includes(p))) {
      const bigger = new Set(assess(bundle, [...base, extra], profile).alerts.map(a => a.plantId + a.claimId));
      for (const k of keys) assert.ok(bigger.has(k), `${k} a disparu en ajoutant ${extra}`);
    }
  }
});
test('l’ordre de sélection ne change pas le résultat', () => {
  const p = { meds: ['warfarine'], pregnant: true };
  const a = assess(bundle, ['ginkgo_biloba', 'hypericum_perforatum'], p).alerts.map(x => x.claimId).sort();
  const b = assess(bundle, ['hypericum_perforatum', 'ginkgo_biloba'], p).alerts.map(x => x.claimId).sort();
  assert.deepEqual(a, b);
});
