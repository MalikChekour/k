import test from 'node:test';
import assert from 'node:assert/strict';
import { tincture } from './tincture.ts';

test('50 g en 1:5 à 45 % depuis alcool 96 %', () => {
  assert.deepEqual(tincture(50, 5, 45), { solventMl: 250, alcoholMl: 117.2, waterMl: 132.8 });
});
test('alcool final supérieur au titre du stock refusé', () => {
  assert.equal(tincture(50, 5, 97), null);
});
test('valeurs nulles, négatives ou NaN refusées', () => {
  for (const a of [[0, 5, 45], [-1, 5, 45], [50, 0, 45], [NaN, 5, 45], [50, 5, 0]] as const) {
    assert.equal(tincture(...a), null);
  }
});
test('somme alcool + eau = solvant', () => {
  const r = tincture(37.5, 4, 60)!;
  assert.ok(Math.abs(r.alcoholMl + r.waterMl - r.solventMl) < 0.11);
});
