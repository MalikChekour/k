import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { filterPlants, groupClaims, rubricOf, severityLabel, sourcesOf } from './library.ts';
import type { PlantData } from './safety.ts';

const bundle = JSON.parse(readFileSync(new URL('./data/bundle.json', import.meta.url), 'utf-8'));
const plants: PlantData[] = bundle.plants;

test('types EMA rangés dans la bonne rubrique', () => {
  assert.equal(rubricOf('indication'), 'indication');
  assert.equal(rubricOf('posology'), 'posologie');
  assert.equal(rubricOf('interaction'), 'interactions');
  assert.equal(rubricOf('pregnancy'), 'grossesse');
  assert.equal(rubricOf('lactation'), 'grossesse');
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

test('sources : une entrée par document EMA, toutes officielles, sans doublon', () => {
  const src = sourcesOf(plants);
  assert.equal(new Set(src.map(x => x.url)).size, src.length);
  assert.equal(src.length, plants.length);
  for (const x of src) assert.match(x.url, /^https:\/\/www\.ema\.europa\.eu\/en\/documents\/herbal-monograph\//);
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
