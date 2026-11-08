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
test('AOD : reconnus mais sans règle avec le millepertuis ; ISRS : désormais couverts (affirmation EMA ajoutée)', () => {
  const aod = ['Xarelto', 'Eliquis', 'Pradaxa'], isrs = ['Prozac', 'Zoloft', 'Seroplex', 'Deroxat'];
  for (const m of aod) assert.deepEqual(classOf(m), ['anticoagulant_oral_direct'], m);
  for (const m of isrs) assert.deepEqual(classOf(m), ['antidepresseur_isrs'], m);
  // millepertuis + anticoagulant direct : l'association n'est pas couverte => jamais « aucune alerte » rassurante
  for (const m of aod) {
    const r = assess(bundle, ['hypericum_perforatum'], { meds: [m] });
    assert.notEqual(r.verdict, 'aucune_alerte_dans_notre_base', m);
    assert.ok(r.notes.some((n: { status: string }) => n.status === 'non_couvert'), m);
  }
  // millepertuis + ISRS : alerte sourcée (effets sérotoninergiques)
  for (const m of isrs) assert.ok(assess(bundle, ['hypericum_perforatum'], { meds: [m] }).alerts.some(a => a.claimId === 'hypericum_perforatum-add-03'), m);
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

test('association « non couverte » : le verdict est « incomplet », jamais « aucune alerte »', () => {
  const claim = { id: 'x-01', type: 'interaction', statement: 's', severity: 'majeure', status: 'verifie', applies_to: [], source: 'src', url: 'u', quote: 'q' };
  const mini = {
    plants: [{ id: 'x', fr: 'X', latin: 'X x', part: 'feuille', claims: [claim] }],
    classes: [{ id: 'a', fr: 'Classe A', substances: ['alpha'] }, { id: 'b', fr: 'Classe B', substances: ['beta'] }],
    rules: [{ plant: 'x', class: 'a', claim: 'x-01' }],
  };
  const r = assess(mini, ['x'], { meds: ['beta'] });
  assert.ok(r.notes.some(n => n.status === 'non_couvert'));
  assert.equal(r.verdict, 'incomplet');
  // et quand la classe est couverte, c'est bien une alerte
  assert.equal(assess(mini, ['x'], { meds: ['alpha'] }).verdict, 'alertes');
});

test('réglisse : hypertension et diurétiques déclenchent des alertes sourcées', () => {
  const hta = assess(bundle, ['glycyrrhiza_glabra'], { flags: ['hypertension'] });
  assert.ok(hta.alerts.some(a => a.claimId === 'glycyrrhiza_glabra-hta' && a.severity === 'majeure'));
  const diur = assess(bundle, ['glycyrrhiza_glabra'], { meds: ['Lasilix'] });
  assert.ok(diur.alerts.some(a => a.claimId === 'glycyrrhiza_glabra-diur'));
  assert.notEqual(diur.verdict, 'aucune_alerte_dans_notre_base');
  const sans = assess(bundle, ['glycyrrhiza_glabra'], {});
  assert.ok(!sans.alerts.some(a => a.claimId === 'glycyrrhiza_glabra-hta'), 'sans hypertension, pas d’alerte spécifique');
});
test('busserole : maladie des reins est une contre-indication', () => {
  const r = assess(bundle, ['arctostaphylos_uva_ursi'], { flags: ['kidney_disease'] });
  assert.equal(r.verdict, 'contre_indication');
});
test('rehmannia : grossesse, foie et intestin sont des contre-indications', () => {
  for (const f of ['pregnant', 'liver_disease', 'digestive_disease'])
    assert.equal(assess(bundle, ['rehmannia_glutinosa'], { flags: [f] }).verdict, 'contre_indication', f);
});
test('scutellaire : contre-indiquée chez l’enfant de moins de 12 ans', () => {
  assert.equal(assess(bundle, ['scutellaria_baicalensis'], { flags: ['age_lt_12'] }).verdict, 'contre_indication');
});
test('schisandra + warfarine : alerte d’interaction', () => {
  const r = assess(bundle, ['schisandra_chinensis'], { flags: [], meds: ['warfarine'] });
  assert.ok(r.alerts.some(a => a.claimId === 'schisandra_chinensis-02'));
});
test('plante OMS sans essai contrôlé : jamais « aucune alerte » sans avertissement', () => {
  assert.notEqual(assess(bundle, ['rehmannia_glutinosa'], { flags: [] }).verdict, 'aucune_alerte_dans_notre_base');
});
test('ginseng : avertissement « moins de 18 ans » pour un adolescent, pas pour un adulte', () => {
  const ado = assess(bundle, ['panax_ginseng'], { ageYears: 16, flags: [] });
  const adulte = assess(bundle, ['panax_ginseng'], { ageYears: 40, flags: [] });
  assert.ok(ado.alerts.some(a => a.claimId === 'panax_ginseng-02'));
  assert.ok(!adulte.alerts.some(a => a.claimId === 'panax_ginseng-02'));
});
test('carthame : trouble de la coagulation = contre-indication ; warfarine = alerte', () => {
  assert.equal(assess(bundle, ['carthamus_tinctorius'], { flags: ['bleeding_disorder'] }).verdict, 'contre_indication');
  assert.ok(assess(bundle, ['carthamus_tinctorius'], { flags: [], meds: ['warfarine'] }).alerts.some(a => a.claimId === 'carthamus_tinctorius-08'));
});
test('carthame : un adulte sans profil particulier n’a pas de « contre-indication » automatique', () => {
  assert.notEqual(assess(bundle, ['carthamus_tinctorius'], { flags: [] }).verdict, 'contre_indication');
});
test('angélique chinoise + warfarine : alerte', () => {
  assert.ok(assess(bundle, ['angelica_sinensis'], { flags: [], meds: ['warfarine'] }).alerts.some(a => a.claimId === 'angelica_sinensis-06'));
});
test('lierre : contre-indiqué avant 2 ans, pas à 5 ans', () => {
  assert.equal(assess(bundle, ['hedera_helix'], { ageYears: 1, flags: [] }).verdict, 'contre_indication');
  assert.notEqual(assess(bundle, ['hedera_helix'], { ageYears: 5, flags: [] }).verdict, 'contre_indication');
});

test('canneberge : warfarine et tacrolimus = alerte ; cassis : restriction hydrique = contre-indication', () => {
  const w = assess(bundle, ['vaccinium_macrocarpon'], { flags: [], meds: ['warfarine'] });
  assert.ok(w.alerts.some(a => a.claimId === 'vaccinium_macrocarpon-02'));
  assert.ok(assess(bundle, ['vaccinium_macrocarpon'], { flags: [], meds: ['tacrolimus'] }).alerts.some(a => a.claimId === 'vaccinium_macrocarpon-12'));
  assert.equal(assess(bundle, ['ribes_nigrum'], { flags: ['fluid_restriction'] }).verdict, 'contre_indication');
  assert.notEqual(assess(bundle, ['ribes_nigrum'], { flags: [] }).verdict, 'contre_indication');
});
test('mauve, carvi, aigremoine, marjolaine, palmier : allergie = contre-indication, jamais pour tous', () => {
  for (const id of ['malva_sylvestris', 'carum_carvi', 'agrimonia_eupatoria', 'origanum_majorana', 'serenoa_repens']) {
    assert.equal(assess(bundle, [id], { flags: ['plant_allergy'] }).verdict, 'contre_indication', id);
    assert.notEqual(assess(bundle, [id], { flags: [] }).verdict, 'contre_indication', id);
  }
});

test('laxatifs stimulants (séné, cascara) : enfant, grossesse, MICI = contre-indication ; diurétique = alerte', () => {
  for (const id of ['senna_alexandrina', 'rhamnus_purshiana']) {
    assert.equal(assess(bundle, [id], { flags: ['pregnant'] }).verdict, 'contre_indication', id);
    assert.equal(assess(bundle, [id], { flags: ['digestive_disease'] }).verdict, 'contre_indication', id);
    assert.equal(assess(bundle, [id], { flags: [], ageYears: 8 }).verdict, 'contre_indication', id);
    assert.notEqual(assess(bundle, [id], { flags: [], ageYears: 40 }).verdict, 'contre_indication', id);
    assert.ok(assess(bundle, [id], { flags: [], meds: ['furosémide'] }).alerts.some(a => a.claimId.startsWith(id + '-1')), id);
  }
});
test('eucalyptus : contre-indiqué avant 2 ans ; piment : jamais bloquant pour tous', () => {
  assert.equal(assess(bundle, ['eucalyptus_globulus'], { flags: [], ageYears: 1 }).verdict, 'contre_indication');
  assert.notEqual(assess(bundle, ['eucalyptus_globulus'], { flags: [], ageYears: 30 }).verdict, 'contre_indication');
  assert.notEqual(assess(bundle, ['capsicum_frutescens'], { flags: [] }).verdict, 'contre_indication');
});
test('séné et cascara ne sont proposés pour aucun symptôme du mélange', () => {
  for (const u of bundle.usages ?? []) {
    const ids = JSON.stringify(u);
    assert.ok(!ids.includes('senna_alexandrina') && !ids.includes('rhamnus_purshiana'), u.id);
  }
});

test('saule : enfant, ulcère, allergie aux salicylés = contre-indication ; warfarine et aspirine = alerte', () => {
  assert.equal(assess(bundle, ['salix_purpurea'], { flags: [], ageYears: 10 }).verdict, 'contre_indication');
  assert.equal(assess(bundle, ['salix_purpurea'], { flags: ['gastric_ulcer'] }).verdict, 'contre_indication');
  assert.equal(assess(bundle, ['salix_purpurea'], { flags: ['salicylate_allergy'] }).verdict, 'contre_indication');
  assert.notEqual(assess(bundle, ['salix_purpurea'], { flags: [], ageYears: 40 }).verdict, 'contre_indication');
  assert.ok(assess(bundle, ['salix_purpurea'], { flags: [], meds: ['warfarine'] }).alerts.some(a => a.claimId === 'salix_purpurea-15'));
  assert.ok(assess(bundle, ['salix_purpurea'], { flags: [], meds: ['aspirine'] }).alerts.some(a => a.claimId === 'salix_purpurea-14'));
});
test('rhubarbe : grossesse = contre-indication ; absinthe et boldo : maladie du foie = contre-indication', () => {
  assert.equal(assess(bundle, ['rheum_palmatum'], { flags: ['pregnant'] }).verdict, 'contre_indication');
  assert.ok(assess(bundle, ['rheum_palmatum'], { flags: [], meds: ['furosémide'] }).alerts.length > 0);
  for (const id of ['artemisia_absinthium', 'peumus_boldus']) {
    assert.equal(assess(bundle, [id], { flags: ['liver_disease'] }).verdict, 'contre_indication', id);
    assert.notEqual(assess(bundle, [id], { flags: [] }).verdict, 'contre_indication', id);
  }
});

test('lot 4 : eau (orthosiphon, solidage, bugrane), foie/voies biliaires (marrube), diurétiques (solidage)', () => {
  assert.equal(assess(bundle, ['orthosiphon_aristatus'], { flags: ['fluid_restriction'] }).verdict, 'contre_indication');
  assert.equal(assess(bundle, ['solidago_virgaurea'], { flags: ['kidney_disease'] }).verdict, 'contre_indication');
  assert.equal(assess(bundle, ['ononis_spinosa'], { flags: ['fluid_restriction'] }).verdict, 'contre_indication');
  assert.equal(assess(bundle, ['marrubium_vulgare'], { flags: ['liver_disease'] }).verdict, 'contre_indication');
  assert.equal(assess(bundle, ['marrubium_vulgare'], { flags: ['biliary_disease'] }).verdict, 'contre_indication');
  assert.ok(assess(bundle, ['solidago_virgaurea'], { flags: [], meds: ['furosémide'] }).alerts.some(a => a.claimId === 'solidago_virgaurea-05'));
  for (const id of ['pimpinella_anisum', 'gentiana_lutea', 'cinnamomum_verum', 'potentilla_erecta', 'linum_usitatissimum', 'levisticum_officinale'])
    assert.notEqual(assess(bundle, [id], { flags: [], ageYears: 40 }).verdict, 'contre_indication', id);
});

test('lot 5 : ail (anticoagulants, saquinavir), thé vert (caféine), fenugrec (antidiabétique), grande camomille (astéracées)', () => {
  assert.ok(assess(bundle, ['allium_sativum'], { flags: [], meds: ['warfarine'] }).alerts.some(a => a.claimId === 'allium_sativum-11'));
  assert.ok(assess(bundle, ['allium_sativum'], { flags: [], meds: ['aspirine'] }).alerts.some(a => a.claimId === 'allium_sativum-11'));
  assert.ok(assess(bundle, ['allium_sativum'], { flags: [], meds: ['ritonavir'] }).alerts.some(a => a.claimId === 'allium_sativum-12'));
  assert.equal(assess(bundle, ['camellia_sinensis'], { flags: ['hypertension'] }).verdict, 'contre_indication');
  assert.equal(assess(bundle, ['camellia_sinensis'], { flags: ['gastric_ulcer'] }).verdict, 'contre_indication');
  assert.ok(assess(bundle, ['trigonella_foenum_graecum'], { flags: [], meds: ['metformine'] }).alerts.some(a => a.claimId === 'trigonella_foenum_graecum-06'));
  assert.equal(assess(bundle, ['tanacetum_parthenium'], { flags: ['asteraceae_allergy'] }).verdict, 'contre_indication');
  for (const id of ['vaccinium_myrtillus', 'rubus_idaeus', 'rosa_damascena', 'syzygium_aromaticum', 'allium_sativum'])
    assert.notEqual(assess(bundle, [id], { flags: [], ageYears: 40 }).verdict, 'contre_indication', id);
});

test('lot 6 : kola (caféine), eau (renouée, olivier), bain de chêne = précaution seulement, noyer (plaies)', () => {
  assert.equal(assess(bundle, ['cola_nitida'], { flags: ['hypertension'] }).verdict, 'contre_indication');
  assert.equal(assess(bundle, ['cola_nitida'], { flags: ['gastric_ulcer'] }).verdict, 'contre_indication');
  assert.equal(assess(bundle, ['polygonum_aviculare'], { flags: ['fluid_restriction'] }).verdict, 'contre_indication');
  assert.equal(assess(bundle, ['olea_europaea'], { flags: ['fluid_restriction'] }).verdict, 'contre_indication');
  assert.equal(assess(bundle, ['centaurium_erythraea'], { flags: ['gastric_ulcer'] }).verdict, 'contre_indication');
  assert.notEqual(assess(bundle, ['quercus_robur'], { flags: ['hypertension'] }).verdict, 'contre_indication');
  assert.notEqual(assess(bundle, ['juglans_regia'], { flags: [] }).verdict, 'contre_indication');
  for (const id of ['ruscus_aculeatus', 'cucurbita_pepo', 'prunus_africana', 'capsella_bursa_pastoris'])
    assert.notEqual(assess(bundle, [id], { flags: [], ageYears: 40 }).verdict, 'contre_indication', id);
});

test('enrichissement : ginkgo + dabigatran / nifédipine alertés ; valériane seule sans alerte ; les infos de fiche ne déclenchent pas d’alerte générale', () => {
  assert.ok(assess(bundle, ['ginkgo_biloba'], { flags: [], meds: ['dabigatran'] }).alerts.some(a => a.claimId === 'ginkgo_biloba-add-15'));
  assert.ok(assess(bundle, ['ginkgo_biloba'], { flags: [], meds: ['nifedipine'] }).alerts.some(a => a.claimId === 'ginkgo_biloba-add-16'));
  assert.equal(assess(bundle, ['valeriana_officinalis'], { flags: [] }).alerts.length, 0);
  // une affirmation « information » (ex. bain de valériane) reste lisible sur la fiche mais n'est jamais une alerte
  const p = bundle.plants.find((x: { id: string }) => x.id === 'valeriana_officinalis');
  assert.ok(p.claims.some((c: { type: string }) => c.type === 'information'));
});
