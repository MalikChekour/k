/**
 * Cloudflare Worker : webhook RevenueCat + commandes de mélanges. Aucune donnée de santé.
 * Secrets (wrangler secret put) : REVENUECAT_WEBHOOK_SECRET, ORDER_CODE_SECRET, ARTISAN_TOKEN
 */
import { OrderError, prepCode, prepSheet, validateLines } from './prep.ts';
import type { Order, PlantRef, Policy } from './prep.ts';

export type D1Like = { prepare(sql: string): { bind(...v: unknown[]): { run(): Promise<{ meta?: { changes?: number } }>; first<T = unknown>(): Promise<T | null> } } };
export type Env = { DB: D1Like; REVENUECAT_WEBHOOK_SECRET: string; ORDER_CODE_SECRET: string; ARTISAN_TOKEN: string };
export type Ctx = { env: Env; plants: PlantRef[]; policy: Policy; now?: () => number; uuid?: () => string };

const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });

/** Comparaison à temps constant (évite de deviner un secret caractère par caractère). */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
const bearer = (r: Request) => (r.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');

const GRANT = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'NON_RENEWING_PURCHASE', 'PRODUCT_CHANGE']);
const REVOKE = new Set(['EXPIRATION', 'CANCELLATION', 'BILLING_ISSUE_EXPIRED']);

export async function handle(req: Request, c: Ctx): Promise<Response> {
  const { env } = c;
  const now = (c.now ?? Date.now)();
  const url = new URL(req.url);

  if (req.method === 'POST' && url.pathname === '/revenuecat') {
    if (!env.REVENUECAT_WEBHOOK_SECRET || !safeEqual(bearer(req), env.REVENUECAT_WEBHOOK_SECRET)) return json({ error: 'non autorisé' }, 401);
    const body = (await req.json().catch(() => null)) as { event?: Record<string, unknown> } | null;
    const e = body?.event;
    if (!e || typeof e.id !== 'string' || typeof e.type !== 'string' || typeof e.app_user_id !== 'string') return json({ error: 'événement invalide' }, 400);
    const seen = await env.DB.prepare('INSERT OR IGNORE INTO webhook_events (event_id, received_at) VALUES (?, ?)').bind(e.id, now).run();
    if (seen.meta?.changes === 0) return json({ ok: true, duplicate: true }); // idempotence
    const ents = Array.isArray(e.entitlement_ids) ? (e.entitlement_ids as string[]) : ['pro'];
    for (const ent of ents) {
      if (GRANT.has(e.type)) {
        const exp = typeof e.expiration_at_ms === 'number' ? e.expiration_at_ms : null;
        await env.DB.prepare(
          'INSERT INTO entitlements (app_user_id, entitlement, expires_at, updated_at, last_event) VALUES (?, ?, ?, ?, ?) ' +
          'ON CONFLICT(app_user_id, entitlement) DO UPDATE SET expires_at = excluded.expires_at, updated_at = excluded.updated_at, last_event = excluded.last_event',
        ).bind(e.app_user_id, ent, exp, now, e.type).run();
      } else if (REVOKE.has(e.type)) {
        await env.DB.prepare('UPDATE entitlements SET expires_at = ?, updated_at = ?, last_event = ? WHERE app_user_id = ? AND entitlement = ?')
          .bind(now, now, e.type, e.app_user_id, ent).run();
      }
    }
    return json({ ok: true });
  }

  if (req.method === 'POST' && url.pathname === '/orders') {
    const body = (await req.json().catch(() => null)) as { lines?: unknown } | null;
    if (!body || Object.keys(body).some(k => k !== 'lines')) return json({ error: 'seul le champ « lines » est accepté' }, 400);
    try {
      const lines = validateLines(body.lines, c.policy, c.plants);
      const id = (c.uuid ?? (() => crypto.randomUUID()))();
      const code = await prepCode(id, env.ORDER_CODE_SECRET);
      const totalG = Math.round(lines.reduce((s, l) => s + l.grams, 0) * 10) / 10;
      await env.DB.prepare('INSERT INTO orders (id, code, lines_json, total_g, created_at) VALUES (?, ?, ?, ?, ?)').bind(id, code, JSON.stringify(lines), totalG, now).run();
      return json({ id, code, totalG }, 201);
    } catch (err) {
      if (err instanceof OrderError) return json({ error: err.message }, 422);
      throw err;
    }
  }

  const m = url.pathname.match(/^\/prep\/([A-Z2-9]{5}-[A-Z2-9]{5})$/);
  if (req.method === 'GET' && m) {
    if (!env.ARTISAN_TOKEN || !safeEqual(bearer(req), env.ARTISAN_TOKEN)) return json({ error: 'non autorisé' }, 401);
    const row = await env.DB.prepare('SELECT id, code, lines_json, total_g, created_at FROM orders WHERE code = ?').bind(m[1]).first<{ id: string; code: string; lines_json: string; total_g: number; created_at: number }>();
    if (!row) return json({ error: 'introuvable' }, 404);
    const o: Order = { id: row.id, code: row.code, lines: JSON.parse(row.lines_json), totalG: row.total_g, createdAt: row.created_at };
    return new Response(prepSheet(o, c.plants), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }

  return json({ error: 'introuvable' }, 404);
}
