import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { plantsForUsage } from './usages.ts';
import type { Usage } from './usages.ts';

const bundle = JSON.parse(readFileSync(new URL('./data/bundle.json', import.meta.url), 'utf-8'));
const usages: Usage[] = bundle.usages;

test('chaque catégorie du bundle a au moins une plante, et chaque plante vient d une indication', () => {
  for (const u of usages) {
    const hits = plantsForUsage(bundle, usages, u.id);
    assert.ok(hits.length > 0, `catégorie vide : ${u.id}`);
    for (const h of hits) assert.ok(u.claims.includes(h.claimId), `${h.claimId} hors catégorie ${u.id}`);
  }
});

test('sommeil propose la valériane et ne propose pas le ginkgo', () => {
  const ids = plantsForUsage(bundle, usages, 'sommeil').map(h => h.plantId);
  assert.ok(ids.includes('valeriana_officinalis'));
  assert.ok(!ids.includes('ginkgo_biloba'));
});

test('catégorie inconnue = aucune plante (jamais de suggestion inventée)', () => {
  assert.deepEqual(plantsForUsage(bundle, usages, 'inconnue'), []);
});
