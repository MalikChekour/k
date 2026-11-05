import test from 'node:test';
import assert from 'node:assert/strict';
import { compareToRange } from './infusion.ts';

test('bornes incluses : 1,5 g et 4 g dans 1,5-4 g', () => {
  assert.equal(compareToRange(1.5, 1.5, 4), 'dans_la_fourchette');
  assert.equal(compareToRange(4, 1.5, 4), 'dans_la_fourchette');
});
test('en dessous et au-dessus de la fourchette', () => {
  assert.equal(compareToRange(1, 1.5, 4), 'en_dessous');
  assert.equal(compareToRange(4.5, 1.5, 4), 'au_dessus');
});
test('valeurs nulles, négatives, vides ou NaN = invalide', () => {
  for (const g of [0, -2, NaN, Infinity]) assert.equal(compareToRange(g, 1, 2), 'invalide', String(g));
});
