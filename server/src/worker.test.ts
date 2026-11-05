import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { handle, safeEqual } from './worker.ts';
import { prepCode } from './prep.ts';

const plants = JSON.parse(readFileSync(new URL('../../data/plants.json', import.meta.url), 'utf-8'));
const realPolicy = JSON.parse(readFileSync(new URL('../../data/sale_policy.json', import.meta.url), 'utf-8'));
const policy = { ...realPolicy, verified_plants: ['valeriana_officinalis', 'matricaria_recutita'] };

/** D1 factice en mémoire : suffit pour les requêtes du Worker. */
function fakeDb() {
  const ents = new Map<string, any>(), events = new Set<string>(), orders: any[] = [];
  let writes = 0;
  const db = {
    prepare(sql: string) {
      return { bind: (...v: any[]) => ({
        async run() {
          writes++;
          if (sql.startsWith('INSERT OR IGNORE INTO webhook_events')) { if (events.has(v[0])) return { meta: { changes: 0 } }; events.add(v[0]); return { meta: { changes: 1 } }; }
          if (sql.startsWith('INSERT INTO entitlements')) { ents.set(v[0] + '|' + v[1], { expires_at: v[2], updated_at: v[3], last_event: v[4] }); return {}; }
          if (sql.startsWith('UPDATE entitlements')) { const k = v[3] + '|' + v[4]; if (ents.has(k)) ents.set(k, { expires_at: v[0], updated_at: v[1], last_event: v[2] }); return {}; }
          if (sql.startsWith('INSERT INTO orders')) { orders.push({ id: v[0], code: v[1], lines_json: v[2], total_g: v[3], created_at: v[4] }); return {}; }
          throw new Error('SQL non géré : ' + sql);
        },
        async first() { if (sql.includes('FROM orders WHERE code')) return orders.find(o => o.code === v[0]) ?? null; return null; },
      }) };
    },
  };
  return { db, ents, orders, writes: () => writes };
}
const env = (db: any) => ({ DB: db, REVENUECAT_WEBHOOK_SECRET: 'rc-secret', ORDER_CODE_SECRET: 'code-secret', ARTISAN_TOKEN: 'artisan-token' });
const ctx = (db: any, p = policy) => ({ env: env(db), plants, policy: p, now: () => 1_000, uuid: () => '11111111-2222-3333-4444-555555555555' });
const post = (path: string, body: unknown, token?: string) =>
  new Request('https://x' + path, { method: 'POST', body: JSON.stringify(body), headers: token ? { authorization: 'Bearer ' + token } : {} });
const ev = (type: string, id: string, extra = {}) => ({ event: { id, type, app_user_id: 'user-1', entitlement_ids: ['pro'], ...extra } });

test('webhook : sans secret ou avec un mauvais secret = 401, rien n’est écrit', async () => {
  const f = fakeDb();
  assert.equal((await handle(post('/revenuecat', ev('INITIAL_PURCHASE', 'e1')), ctx(f.db))).status, 401);
  assert.equal((await handle(post('/revenuecat', ev('INITIAL_PURCHASE', 'e1'), 'faux'), ctx(f.db))).status, 401);
  assert.equal(f.writes(), 0);
});
test('webhook : achat → droit Pro ; doublon ignoré ; expiration → révoqué', async () => {
  const f = fakeDb();
  const r1 = await handle(post('/revenuecat', ev('INITIAL_PURCHASE', 'e1', { expiration_at_ms: 9_999 }), 'rc-secret'), ctx(f.db));
  assert.equal(r1.status, 200);
  assert.equal(f.ents.get('user-1|pro').expires_at, 9_999);
  const before = f.writes();
  const dup = await (await handle(post('/revenuecat', ev('INITIAL_PURCHASE', 'e1', { expiration_at_ms: 1 }), 'rc-secret'), ctx(f.db))).json();
  assert.equal(dup.duplicate, true);
  assert.equal(f.writes(), before + 1, 'le doublon ne doit écrire que la tentative d’insertion idempotente');
  assert.equal(f.ents.get('user-1|pro').expires_at, 9_999, 'le doublon ne doit pas modifier le droit');
  await handle(post('/revenuecat', ev('EXPIRATION', 'e2'), 'rc-secret'), ctx(f.db));
  assert.equal(f.ents.get('user-1|pro').expires_at, 1_000);
});
test('webhook : événement mal formé = 400', async () => {
  const f = fakeDb();
  assert.equal((await handle(post('/revenuecat', { event: { type: 'X' } }, 'rc-secret'), ctx(f.db))).status, 400);
});

test('commande BLOQUÉE tant qu’aucune plante n’a un statut de vente vérifié (politique réelle = liste vide)', async () => {
  const f = fakeDb();
  const r = await handle(post('/orders', { lines: [{ plantId: 'valeriana_officinalis', grams: 50 }] }), ctx(f.db, realPolicy));
  assert.equal(r.status, 422);
  assert.match((await r.json()).error, /statut juridique non vérifié/);
  assert.equal(f.orders.length, 0);
});
test('commande valide : code de préparation lisible, total calculé', async () => {
  const f = fakeDb();
  const r = await handle(post('/orders', { lines: [{ plantId: 'valeriana_officinalis', grams: 60 }, { plantId: 'matricaria_recutita', grams: 30.04 }] }), ctx(f.db));
  assert.equal(r.status, 201);
  const o = await r.json();
  assert.match(o.code, /^[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/);
  assert.equal(o.totalG, 90);
});
test('commande : AUCUNE donnée de santé acceptée (ni au niveau racine, ni dans une ligne)', async () => {
  const f = fakeDb();
  const a = await handle(post('/orders', { lines: [{ plantId: 'valeriana_officinalis', grams: 50 }], profile: { pregnant: true } }), ctx(f.db));
  assert.equal(a.status, 400);
  const b = await handle(post('/orders', { lines: [{ plantId: 'valeriana_officinalis', grams: 50, symptom: 'insomnie' }] }), ctx(f.db));
  assert.equal(b.status, 422);
  assert.match((await b.json()).error, /champ interdit/);
  assert.equal(f.orders.length, 0);
});
test('commande : quantités invalides, doublons, total excessif, plante inconnue refusés', async () => {
  const f = fakeDb();
  const bad = [
    [{ plantId: 'valeriana_officinalis', grams: -5 }], [{ plantId: 'valeriana_officinalis', grams: 0 }], [{ plantId: 'valeriana_officinalis', grams: 'beaucoup' }],
    [{ plantId: 'valeriana_officinalis', grams: 10 }, { plantId: 'valeriana_officinalis', grams: 10 }],
    [{ plantId: 'valeriana_officinalis', grams: 300 }, { plantId: 'matricaria_recutita', grams: 300 }],
    [{ plantId: 'mandragore', grams: 10 }], [],
  ];
  for (const lines of bad) assert.equal((await handle(post('/orders', { lines }), ctx(f.db))).status, 422, JSON.stringify(lines));
  assert.equal(f.orders.length, 0);
});

test('bon de préparation : jeton artisan obligatoire, contenu sans donnée de santé', async () => {
  const f = fakeDb();
  const o = await (await handle(post('/orders', { lines: [{ plantId: 'valeriana_officinalis', grams: 50 }] }), ctx(f.db))).json();
  const get = (t?: string) => handle(new Request('https://x/prep/' + o.code, { headers: t ? { authorization: 'Bearer ' + t } : {} }), ctx(f.db));
  assert.equal((await get()).status, 401);
  assert.equal((await get('faux')).status, 401);
  const ok = await get('artisan-token');
  assert.equal(ok.status, 200);
  const txt = await ok.text();
  assert.match(txt, new RegExp(o.code));
  assert.match(txt, /Valériane \(Valeriana officinalis L\.\)/);
  assert.match(txt, /aucune information de santé/);
  assert.doesNotMatch(txt, /enceinte|médicament|insomnie|symptôme/i);
  assert.equal((await handle(new Request('https://x/prep/AAAAA-22222', { headers: { authorization: 'Bearer artisan-token' } }), ctx(f.db))).status, 404);
});

test('code de préparation : déterministe avec le secret, différent sans lui', async () => {
  assert.equal(await prepCode('id-1', 's'), await prepCode('id-1', 's'));
  assert.notEqual(await prepCode('id-1', 's'), await prepCode('id-1', 't'));
  assert.notEqual(await prepCode('id-1', 's'), await prepCode('id-2', 's'));
});
test('safeEqual', () => {
  assert.ok(safeEqual('abc', 'abc'));
  assert.ok(!safeEqual('abc', 'abd'));
  assert.ok(!safeEqual('abc', 'abcd'));
});
