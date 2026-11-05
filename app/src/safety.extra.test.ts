import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assess, matchMeds, normalize } from './safety.ts';

const bundle = JSON.parse(readFileSync(new URL('./data/bundle.json', import.meta.url), 'utf-8'));
const ALL: string[] = bundle.plants.map((p: { id: string }) => p.id);
const FLAGS = ['asteraceae_allergy', 'salicylate_allergy', 'bleeding_disorder', 'biliary_disease', 'fluid_restriction', 'drives', 'plant_allergy'];
const keys = (r: { alerts: { plantId: string; claimId: string }[] }) => new Set(r.alerts.map(a => a.plantId + '|' + a.claimId));
const assertSubset = (small: Set<string>, big: Set<string>, why: string) => {
  for (const k of small) assert.ok(big.has(k), `${k} a disparu : ${why}`);
};
const classOf = (m: string): string[] => matchMeds([m], bundle.classes).matched[0]?.classes ?? [];

// --- Accents, casse, espaces, tirets, apostrophes -----------------------------------------------------------------
test('normalisation : accents, casse, espaces et ponctuation', () => {
  assert.equal(normalize('  ÇA   ÉTÉ-ÎLE  '), 'ca ete ile');
  assert.equal(normalize(''), '');
  assert.equal(normalize('   '), '');
  assert.equal(normalize('Mini_Sintrom'), 'mini sintrom');
});
test('warfarine : casse, espaces, tirets et dosage ne changent rien', () => {
  for (const m of ['Warfarine', 'WARFARINE', '  warfarine  ', 'Warfarine-5mg', 'warfarine 5 mg', 'warfarine\t']) {
    assert.deepEqual(classOf(m), ['anticoagulant_coumarinique'], m);
  }
  assert.equal(assess(bundle, ['hypericum_perforatum'], { meds: ['WARFARINE'] }).verdict, 'contre_indication');
});
test('coumadine (marque) : toutes casses, avec dosage ou tiret', () => {
  for (const m of ['coumadine', 'COUMADINE', 'Coumadine 5 mg', 'Coumadine-5mg'])
    assert.deepEqual(classOf(m), ['anticoagulant_coumarinique'], m);
});
test('ibuprofène : accent ou non, casse, dosage', () => {
  for (const m of ['ibuprofène', 'IBUPROFENE', 'Ibuprofène 400 mg', 'ibuprofene'])
    assert.deepEqual(classOf(m), ['ains_salicyles'], m);
});
test('acide acétylsalicylique : accents et casse', () => {
  for (const m of ['acide acétylsalicylique', 'ACIDE ACÉTYLSALICYLIQUE', 'Acide  Acetylsalicylique'])
    assert.ok(classOf(m).includes('antiagregant') && classOf(m).includes('ains_salicyles'), m);
});
test('apostrophe : « L\'aspirine » reconnue comme aspirine', () => {
  assert.deepEqual(classOf("L'aspirine").sort(), ['ains_salicyles', 'antiagregant']);
});
test('pilule contraceptive : tirets, casse et espaces multiples', () => {
  for (const m of ['Pilule-Contraceptive', 'PILULE CONTRACEPTIVE', 'pilule   contraceptive.'])
    assert.deepEqual(classOf(m), ['contraceptif_hormonal'], m);
});
test('identifiant de classe saisi tel quel (underscore ou espace)', () => {
  assert.deepEqual(classOf('anticoagulant_coumarinique'), ['anticoagulant_coumarinique']);
  assert.deepEqual(classOf('anticoagulant coumarinique'), ['anticoagulant_coumarinique']);
  assert.deepEqual(classOf('anticoagulant'), [], 'un mot partiel de classe ne doit pas matcher');
});

// --- Marques françaises ajoutées (substance vérifiée dans la BDPM) -----------------------------------------------
const BRANDS: [string, string][] = [
  ['Coumadine', 'anticoagulant_coumarinique'], ['Sintrom', 'anticoagulant_coumarinique'], ['Mini-Sintrom', 'anticoagulant_coumarinique'],
  ['Plavix', 'antiagregant'], ['Kardegic', 'antiagregant'], ['Aspegic', 'antiagregant'],
  ['Nurofen', 'ains_salicyles'], ['Advil', 'ains_salicyles'], ['Voltarene', 'ains_salicyles'], ['Naprosyne', 'ains_salicyles'],
  ['Neoral', 'immunosuppresseur_greffe'], ['Sandimmun', 'immunosuppresseur_greffe'], ['Prograf', 'immunosuppresseur_greffe'],
  ['Certican', 'immunosuppresseur_greffe'], ['Rapamune', 'immunosuppresseur_greffe'], ['Afinitor', 'immunosuppresseur_greffe'],
  ['Glivec', 'cytostatique_cyp'],
  ['Minidril', 'contraceptif_hormonal'], ['Mercilon', 'contraceptif_hormonal'], ['Jasmine', 'contraceptif_hormonal'],
  ['Optimizette', 'contraceptif_hormonal'], ['Cerazette', 'contraceptif_hormonal'],
  ['Laroxyl', 'substrats_cyp_pgp'], ['Telfast', 'substrats_cyp_pgp'], ['Xanax', 'substrats_cyp_pgp'], ['Valium', 'substrats_cyp_pgp'],
  ['Zocor', 'substrats_cyp_pgp'], ['Chibro-Proscar', 'substrats_cyp_pgp'],
];
test('marques ajoutées : chacune rejoint la bonne classe (casse et tiret indifférents)', () => {
  for (const [brand, cls] of BRANDS) {
    assert.ok(classOf(brand).includes(cls), `${brand} -> ${classOf(brand)} (attendu ${cls})`);
    assert.ok(classOf(brand.toUpperCase()).includes(cls), `${brand.toUpperCase()} doit aussi matcher`);
  }
});
test('marques NON ajoutées (aucune classe correspondante) : restent INCONNUES, verdict « incomplet »', () => {
  for (const m of ['Xarelto', 'Eliquis', 'Pradaxa', 'Prozac', 'Zoloft', 'Seroplex', 'Deroxat']) {
    assert.deepEqual(classOf(m), [], m);
    assert.equal(assess(bundle, ['valeriana_officinalis'], { meds: [m] }).verdict, 'incomplet', m);
  }
});

// --- Sous-chaînes piégeuses : mot entier uniquement -------------------------------------------------------------
test('nom contenu dans un mot plus long : aucune correspondance (préfixe, suffixe, infixe)', () => {
  for (const m of ['warfarinee', 'antiwarfarin', 'xwarfarinex', 'warfarines', 'coumadinex', 'ultracoumadine', 'sintroms',
    'aspirinette', 'clopidogrelo', 'glivecs', 'xanaxx', 'valiumium', 'zocorr', 'telfasts', 'digoxines'])
    assert.deepEqual(classOf(m), [], m);
});
test('fragments trop courts d’une marque : aucune correspondance', () => {
  for (const m of ['mini', 'sintro', 'coumad', 'warfar', 'aspi', 'ibupro', 'pilule'])
    assert.deepEqual(classOf(m), [], m);
});
test('deux noms collés sans séparateur ne matchent pas une substance coupée', () => {
  assert.deepEqual(classOf('warfarinecoumadine'), [], 'mot unique « warfarinecoumadine » : aucun mot entier');
});

// --- Liste vide ---------------------------------------------------------------------------------------------------
test('liste de médicaments vide : aucune correspondance, aucune inconnue', () => {
  const m = matchMeds([], bundle.classes);
  assert.deepEqual(m.matched, []);
  assert.deepEqual(m.unknown, []);
});
test('entrées vides ou espaces seuls : ignorées (pas comptées comme inconnues)', () => {
  const r = assess(bundle, ['valeriana_officinalis'], { meds: ['', '   ', '\t'] });
  assert.deepEqual(r.unknownMeds, []);
  assert.equal(r.verdict, 'aucune_alerte_dans_notre_base');
});
test('aucune plante et liste de médicaments vide : aucune conclusion', () => {
  assert.equal(assess(bundle, [], {}).verdict, 'aucune_selection');
  assert.equal(assess(bundle, [], { meds: [], flags: [], pregnant: true }).verdict, 'aucune_selection');
});
test('liste de plantes vide mais médicament inconnu : toujours « aucune_selection », pas « incomplet »', () => {
  assert.equal(assess(bundle, [], { meds: ['Doliprane'] }).verdict, 'aucune_selection');
});

// --- Doublons -------------------------------------------------------------------------------------------------------
test('doublons de médicaments : mêmes alertes, même verdict, aucune note dupliquée', () => {
  const single = assess(bundle, ['hypericum_perforatum'], { meds: ['warfarine'] });
  const dup = assess(bundle, ['hypericum_perforatum'], { meds: ['warfarine', 'Warfarine', 'WARFARINE'] });
  assert.deepEqual(dup.alerts.map(a => a.claimId), single.alerts.map(a => a.claimId));
  assert.equal(dup.verdict, single.verdict);
  assert.equal(dup.notes.length, single.notes.length);
});
test('doublons de plantes : alertes non dupliquées', () => {
  const single = assess(bundle, ['hypericum_perforatum'], { meds: ['warfarine'] });
  const dup = assess(bundle, ['hypericum_perforatum', 'hypericum_perforatum'], { meds: ['warfarine'] });
  assert.deepEqual(dup.alerts.map(a => a.claimId), single.alerts.map(a => a.claimId));
});
test('doublons de plantes : notes non dupliquées', () => {
  // BUG (constaté) : la boucle sur plantIds ajoute les notes sans déduplication ; 2 notes au lieu de 1.
  const single = assess(bundle, ['valeriana_officinalis'], { meds: ['diazépam'] });
  const dup = assess(bundle, ['valeriana_officinalis', 'valeriana_officinalis'], { meds: ['diazépam'] });
  assert.equal(dup.notes.length, single.notes.length);
});
test('ordre des médicaments indifférent (permutation)', () => {
  const meds = ['warfarine', 'clopidogrel', 'ibuprofène', 'pilule contraceptive'];
  const a = assess(bundle, ALL, { meds });
  const b = assess(bundle, ALL, { meds: [...meds].reverse() });
  assert.deepEqual([...keys(a)].sort(), [...keys(b)].sort());
  assert.equal(a.verdict, b.verdict);
});

// --- Profil tout à faux ---------------------------------------------------------------------------------------------
test('profil tout à faux = profil vide : seules les infos générales restent', () => {
  const faux = { pregnant: false, lactating: false, ageYears: null, flags: [], meds: [] };
  for (const p of ALL) {
    const a = assess(bundle, [p], faux);
    const vide = assess(bundle, [p], {});
    assert.deepEqual([...keys(a)].sort(), [...keys(vide)].sort(), p);
    assert.ok(a.alerts.every(x => x.cause === 'Information générale sur cette plante'), `${p} : cause de profil inattendue`);
  }
});
test('profil tout à faux : aucune contre-indication, drapeaux inconnus ignorés sans erreur', () => {
  assert.notEqual(assess(bundle, ALL, { pregnant: false, lactating: false, ageYears: 40, flags: ['inconnu_xyz'] }).verdict, 'contre_indication');
  assert.deepEqual([...keys(assess(bundle, ALL, { flags: ['inconnu_xyz'] }))].sort(), [...keys(assess(bundle, ALL, {}))].sort());
});
test('âge : bornes 11 / 12 / 17 / 18 ans', () => {
  const causes = (age: number) => assess(bundle, ALL, { ageYears: age }).alerts.map(a => a.cause);
  assert.ok(causes(11).some(c => c.endsWith('age_lt_12')) && causes(11).some(c => c.endsWith('age_lt_18')));
  assert.ok(!causes(12).some(c => c.endsWith('age_lt_12')) && causes(12).some(c => c.endsWith('age_lt_18')));
  assert.ok(!causes(17).some(c => c.endsWith('age_lt_12')) && causes(17).some(c => c.endsWith('age_lt_18')));
  assert.ok(!causes(18).some(c => c.endsWith('age_lt_12') || c.endsWith('age_lt_18')));
  assert.ok(causes(-1).some(c => c.endsWith('age_lt_12')), 'âge négatif : traité comme enfant (conservateur)');
});

// --- Profil tout à vrai ---------------------------------------------------------------------------------------------
const MEDS_ALL = ['warfarine', 'clopidogrel', 'ibuprofène', 'ciclosporine', 'pilule contraceptive', 'digoxine', 'Previscan', 'Doliprane'];
const VRAI = { pregnant: true, lactating: true, ageYears: 0, flags: FLAGS, meds: MEDS_ALL };
test('profil tout à vrai : contient toutes les alertes de chaque profil partiel (mêmes médicaments)', () => {
  const big = keys(assess(bundle, ALL, VRAI));
  const partiels: object[] = [{}, { pregnant: true }, { lactating: true }, { ageYears: 8 }, { ageYears: 15 }, ...FLAGS.map(f => ({ flags: [f] }))];
  for (const p of partiels) assertSubset(keys(assess(bundle, ALL, { ...p, meds: MEDS_ALL })), big, JSON.stringify(p));
});
test('profil tout à vrai : verdict au niveau « contre-indication » (aucune dégradation)', () => {
  assert.equal(assess(bundle, ALL, VRAI).verdict, 'contre_indication');
  assert.equal(assess(bundle, ['ginkgo_biloba'], { pregnant: true, lactating: true, ageYears: 0, flags: FLAGS }).verdict, 'contre_indication');
});

// --- Monotonie : ajouter ne retire jamais --------------------------------------------------------------------------
test('monotonie : ajouter un drapeau ou un âge ne retire aucune alerte (plusieurs bases)', () => {
  const bases: object[] = [{}, { meds: ['warfarine'] }, { pregnant: true, meds: ['clopidogrel', 'pilule contraceptive'] }, { ageYears: 30, lactating: true, meds: ['ciclosporine'] }];
  const extras: { pregnant?: boolean; lactating?: boolean; ageYears?: number; flags?: string[] }[] =
    [{ pregnant: true }, { lactating: true }, { ageYears: 8 }, { ageYears: 15 }, ...FLAGS.map(f => ({ flags: [f] }))];
  for (const base of bases) for (const extra of extras) {
    const b = base as { flags?: string[] };
    const merged = { ...base, ...extra, flags: [...(b.flags ?? []), ...(extra.flags ?? [])] };
    assertSubset(keys(assess(bundle, ALL, base)), keys(assess(bundle, ALL, merged)), JSON.stringify(extra));
  }
});
test('monotonie : ajout cumulé de médicaments (connus, inconnus, vides) — alertes croissantes, contre-indication conservée', () => {
  const seq = ['', 'Doliprane', 'warfarine', 'Mini-Sintrom', 'Xarelto', 'clopidogrel', '  ', 'ciclosporine', 'Previscan', 'pilule contraceptive', 'digoxine', 'ibuprofène'];
  for (const plants of [['hypericum_perforatum'], ['ginkgo_biloba', 'filipendula_ulmaria'], ALL]) {
    let prev = new Set<string>();
    let prevVerdict = 'aucune_selection';
    const acc: string[] = [];
    for (const m of seq) {
      acc.push(m);
      const r = assess(bundle, plants, { meds: acc });
      assertSubset(prev, keys(r), `ajout de « ${m} »`);
      if (prevVerdict === 'contre_indication') assert.equal(r.verdict, 'contre_indication', `ajout de « ${m} » a dégradé la contre-indication`);
      prev = keys(r);
      prevVerdict = r.verdict;
    }
  }
});
test('monotonie : ajout cumulé de plantes (les 12) avec profil chargé — alertes croissantes', () => {
  const profile = { pregnant: true, ageYears: 8, meds: ['warfarine', 'clopidogrel', 'ibuprofène'], flags: FLAGS };
  let prev = new Set<string>();
  const acc: string[] = [];
  for (const p of ALL) {
    acc.push(p);
    const cur = keys(assess(bundle, acc, profile));
    assertSubset(prev, cur, `ajout de ${p}`);
    prev = cur;
  }
});

// --- Cas qui révèlent de VRAIS bugs de safety.ts (non corrigés ; marqués todo) ----------------------------------
test('médicament saisi en alphabet non latin : doit être « inconnu » (incomplet), pas ignoré', () => {
  // BUG (constaté) : normalize() remplace tout ce qui n'est pas [a-z0-9] par un espace, donc « варфарин » devient vide
  // et assess() l'écarte silencieusement (continue). Résultat obtenu : verdict « aucune_alerte_dans_notre_base », unknownMeds = [].
  // Attendu : verdict « incomplet », unknownMeds = ['варфарин'].
  const r = assess(bundle, ['valeriana_officinalis'], { meds: ['варфарин'] });
  assert.deepEqual(r.unknownMeds, ['варфарин']);
  assert.equal(r.verdict, 'incomplet');
});
test('médicament saisi uniquement en symboles (emoji) : doit être « inconnu », pas ignoré', () => {
  // BUG (constaté) : entrée « 💊 » -> normalize() = '' -> ignorée. Obtenu : aucune_alerte_dans_notre_base, unknownMeds = []. Attendu : incomplet.
  const r = assess(bundle, ['valeriana_officinalis'], { meds: ['💊'] });
  assert.deepEqual(r.unknownMeds, ['💊']);
  assert.equal(r.verdict, 'incomplet');
});
test('identifiant de plante inconnu : ne doit pas produire « aucune alerte dans notre base »', () => {
  // BUG (constaté) : assess() ignore une plante absente de bundle.plants (continue) mais le verdict reste
  // « aucune_alerte_dans_notre_base ». Obtenu : verdict aucune_alerte_dans_notre_base pour ['plante_inexistante'].
  // Attendu : un verdict qui ne rassure pas (incomplet, ou erreur explicite).
  const r = assess(bundle, ['plante_inexistante'], {});
  assert.notEqual(r.verdict, 'aucune_alerte_dans_notre_base');
});
test('verdict « aucune alerte » alors qu’une alerte (précaution) est listée', () => {
  // INCOHÉRENCE (à arbitrer) : seules contre-indication / alertes (majeure, moderee) influencent le verdict ; une alerte de
  // gravité « precaution » laisse le verdict à « aucune_alerte_dans_notre_base ». Exemple constaté : passiflora_incarnata, âge 8 ans
  // -> 1 alerte de gravité precaution ET verdict aucune_alerte_dans_notre_base.
  const r = assess(bundle, ['passiflora_incarnata'], { ageYears: 8 });
  assert.ok(r.alerts.length > 0);
  assert.notEqual(r.verdict, 'aucune_alerte_dans_notre_base');
});
test('gravité inconnue dans les données : l’alerte ne doit pas disparaître du verdict', () => {
  // BUG (constaté) : RANK[severity] est undefined pour une gravité hors liste ; aucun seuil de verdict ne la retient.
  // Données synthétiques : une seule affirmation « grave » -> 1 alerte listée, verdict obtenu aucune_alerte_dans_notre_base.
  const synth = {
    plants: [{ id: 'plante_test', fr: 'Test', latin: 'Test', part: 'x', claims: [{
      id: 'plante_test-01', type: 'warning', statement: 'Affirmation de test', severity: 'grave', status: 'verifie',
      applies_to: ['always'], source: 'Source de test', url: 'https://example.org', quote: 'Extrait suffisamment long pour le test',
    }] }],
    classes: [], rules: [],
  };
  const r = assess(synth, ['plante_test'], {});
  assert.equal(r.alerts.length, 1);
  assert.notEqual(r.verdict, 'aucune_alerte_dans_notre_base');
});
