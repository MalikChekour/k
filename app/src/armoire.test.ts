import test from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_ARMOIRE, parseArmoire, sanitize, toggleFavorite } from './armoire.ts';

test('stockage absent ou illisible = armoire vide, sans exception', () => {
  assert.deepEqual(parseArmoire(null), EMPTY_ARMOIRE);
  assert.deepEqual(parseArmoire('{pas du json'), EMPTY_ARMOIRE);
  assert.deepEqual(parseArmoire('42'), EMPTY_ARMOIRE);
});

test('valeurs corrompues écartées : indicateurs non booléens, âge absurde, drapeaux inconnus', () => {
  const a = sanitize({ favorites: ['a', 3, null], profile: { pregnant: 'oui', ageYears: -4, flags: ['drives', 'inconnu'], meds: ['warfarine', 7] } });
  assert.deepEqual(a.favorites, ['a']);
  assert.equal(a.profile.pregnant, false);
  assert.equal(a.profile.ageYears, null);
  assert.deepEqual(a.profile.flags, ['drives']);
  assert.deepEqual(a.profile.meds, ['warfarine']);
});

test('bascule d un favori : ajout puis retrait', () => {
  const a1 = toggleFavorite(EMPTY_ARMOIRE, 'valeriana_officinalis');
  assert.deepEqual(a1.favorites, ['valeriana_officinalis']);
  assert.deepEqual(toggleFavorite(a1, 'valeriana_officinalis').favorites, []);
});

test('aller-retour JSON conserve le profil', () => {
  const a = sanitize({ favorites: ['ginkgo_biloba'], profile: { pregnant: true, ageYears: 34, meds: ['Warfarine 5 mg'], flags: ['bleeding_disorder'] } });
  assert.deepEqual(parseArmoire(JSON.stringify(a)), a);
});
