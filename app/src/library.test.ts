import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { filterPlants, groupClaims, plantIdsForGroupQuery, rubricOf, severityLabel, sourcesOf } from './library.ts';
import type { PlantData } from './safety.ts';

const bundle = JSON.parse(readFileSync(new URL('./data/bundle.json', import.meta.url), 'utf-8'));
const plants: PlantData[] = bundle.plants;

test('types EMA rangés dans la bonne rubrique', () => {
  assert.equal(rubricOf('indication'), 'indication');
  assert.equal(rubricOf('posology'), 'posologie');
  assert.equal(rubricOf('interaction'), 'interactions');
  assert.equal(rubricOf('pregnancy'), 'grossesse');
  assert.equal(rubricOf('lactation'), 'grossesse');
  assert.equal(rubricOf('pharmacodynamics'), 'savoir');
  assert.equal(rubricOf('preclinical'), 'savoir');
  assert.equal(rubricOf('adverse_effect'), 'precautions');
  assert.equal(rubricOf('contraindication'), 'precautions');
  assert.equal(rubricOf('type_inconnu'), 'precautions');
});

test('aucune affirmation perdue au regroupement', () => {
  for (const p of plants) {
    const g = groupClaims(p.claims);
    const n = Object.values(g).reduce((s, arr) => s + arr.length, 0);
    assert.equal(n, p.claims.length, p.id);
  }
});

test('recherche sans accents ni casse : « VALÉRIANE » et le nom latin trouvent la valériane', () => {
  assert.ok(filterPlants(plants, 'VALÉRIANE', null).some(p => p.id === 'valeriana_officinalis'));
  assert.ok(filterPlants(plants, 'valeriana', null).some(p => p.id === 'valeriana_officinalis'));
  assert.deepEqual(filterPlants(plants, 'zzz-inexistant', null), []);
});

test('filtre par rubrique : seules les plantes ayant une indication restent', () => {
  const r = filterPlants(plants, '', 'indication');
  assert.ok(r.length > 0);
  for (const p of r) assert.ok(p.claims.some(c => c.type === 'indication'), p.id);
});

test('sources : un document par URL, toutes officielles (EMA ou OMS), sans doublon', () => {
  const src = sourcesOf(plants);
  assert.equal(new Set(src.map(x => x.url)).size, src.length);
  for (const x of src) assert.match(x.url, /^https:\/\/(www\.ema\.europa\.eu\/en\/documents\/herbal-monograph\/|archive\.org\/download\/WHOMonographsOnSelectedMedicinalPlantsVol[1-4]\/)/);
  // chaque plante figure dans au moins un document
  for (const p of plants) assert.ok(src.some(x => x.plants.includes(p.fr)), p.id);
});

test('gravité lisible, jamais le code brut', () => {
  assert.equal(severityLabel('contraindiquee'), 'Contre-indiquée');
  assert.equal(severityLabel(null), 'Information');
  assert.equal(severityLabel('inconnue'), 'inconnue');
});

test('la rubrique posologie porte un avertissement : doses propres à une préparation précise', async () => {
  const { POSOLOGY_NOTE } = await import('./library.ts');
  assert.match(POSOLOGY_NOTE, /préparations précises/);
  assert.match(POSOLOGY_NOTE, /pharmacien/);
});

test('recherche : autre nom (pinyin) et symptôme', async () => {
  const { plantIdsForSymptomQuery } = await import('./library.ts');
  assert.deepEqual(filterPlants(bundle.plants, 'di huang', null).map(p => p.id), ['rehmannia_glutinosa']);
  const ids = plantIdsForSymptomQuery(bundle, bundle.usages, 'sommeil');
  assert.ok(ids.has('valeriana_officinalis'));
  assert.ok(filterPlants(bundle.plants, 'sommeil', null, ids).some(p => p.id === 'valeriana_officinalis'));
  assert.equal(plantIdsForSymptomQuery(bundle, bundle.usages, 'so').size, 0);
});

test('familles : « Adaptogènes » filtre la liste, répond à la recherche et ne cite que des plantes connues', () => {
  const g = bundle.groups.find((x: { id: string }) => x.id === 'adaptogenes');
  assert.ok(g && g.note.includes('réglementaire'));
  const ids = new Set(bundle.plants.map((p: { id: string }) => p.id));
  for (const id of g.plants) assert.ok(ids.has(id), id);
  assert.deepEqual(filterPlants(bundle.plants, '', null, undefined, g.plants).map(p => p.id).sort(), [...g.plants].sort());
  assert.ok(plantIdsForGroupQuery(bundle.groups, 'adaptogene').has('rhodiola_rosea'));
  assert.equal(plantIdsForGroupQuery(bundle.groups, 'ad').size, 0);
});
