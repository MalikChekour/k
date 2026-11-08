import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { overviewOf, FLAG_LABEL } from './overview.ts';

const bundle = JSON.parse(readFileSync(new URL('./data/bundle.json', import.meta.url), 'utf-8'));
const get = (id: string) => overviewOf(bundle.plants.find((p: { id: string }) => p.id === id), bundle);

test('synthèse : chaque fiche a ses chiffres et des libellés français, jamais un identifiant technique', () => {
  for (const p of bundle.plants) {
    const o = overviewOf(p, bundle);
    assert.equal(o.claimCount, p.claims.length, p.id);
    assert.ok(o.sourceCount >= 1, p.id);
    for (const l of [...o.avoid, ...o.caution]) assert.ok(!/_/.test(l), `${p.id}: ${l}`);
  }
});
test('synthèse : saule = interdit aux moins de 18 ans, en cas d’ulcère et d’allergie aux salicylés ; warfarine et aspirine listées', () => {
  const o = get('salix_purpurea');
  for (const l of [FLAG_LABEL.age_lt_18, FLAG_LABEL.gastric_ulcer, FLAG_LABEL.salicylate_allergy]) assert.ok(o.avoid.includes(l), l);
  assert.ok(o.medClasses.length >= 2);
});
test('synthèse : une situation interdite n’est pas répétée en « prudence », et la tisane de camomille est décrite', () => {
  for (const p of bundle.plants) {
    const o = overviewOf(p, bundle);
    for (const l of o.avoid) assert.ok(!o.caution.includes(l), `${p.id}: ${l}`);
  }
  assert.ok(get('matricaria_recutita').infusion);
});
test('synthèse : les usages viennent des catégories du mélange (valériane → sommeil)', () => {
  assert.ok(get('valeriana_officinalis').usages.some(u => /sommeil/i.test(u)));
});
