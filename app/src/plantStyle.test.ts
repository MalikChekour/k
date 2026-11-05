import test from 'node:test';
import assert from 'node:assert/strict';
import { hash, motifOf, styleFor, tintOf } from './plantStyle.ts';

test('couleur stable pour une même plante, même sans entrée dédiée', () => {
  const a = styleFor({ id: 'plante_inconnue', part: 'fleur' });
  const b = styleFor({ id: 'plante_inconnue', part: 'fleur' });
  assert.deepEqual(a, b);
  assert.match(a.color, /^#[0-9A-F]{6}$/i);
});
test('motif déduit de la partie utilisée', () => {
  assert.equal(motifOf('racine'), 'racine');
  assert.equal(motifOf('rhizome'), 'racine');
  assert.equal(motifOf('fruit'), 'baies');
  assert.equal(motifOf('feuille'), 'feuilles');
  assert.equal(motifOf('sommité fleurie'), 'feuilles');
  assert.equal(motifOf('fleur'), 'rosette');
});
test('teinte : blanc à 0, couleur pleine à 1', () => {
  assert.equal(tintOf('#E9A60C', 0).toUpperCase(), '#FFFFFF');
  assert.equal(tintOf('#E9A60C', 1).toUpperCase(), '#E9A60C');
});
test('hash déterministe et positif', () => {
  assert.equal(hash('a'), hash('a'));
  assert.ok(hash('zzzzzzzzzzzzzzzzzzzz') >= 0);
});
