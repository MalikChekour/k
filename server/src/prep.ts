/** Commande de mélange : validation stricte + bon de préparation. Aucune donnée de santé n'entre ici. */
export type Line = { plantId: string; grams: number };
export type Policy = { verified_plants: string[]; max_total_grams: number; max_lines: number };
export type PlantRef = { id: string; fr: string; latin: string; part: string };
export type Order = { id: string; code: string; lines: Line[]; totalG: number; createdAt: number };

export class OrderError extends Error {}

/** Ne retient QUE plantId et grams : toute autre clé (profil, symptôme, médicament…) est refusée, pas ignorée. */
export function validateLines(input: unknown, policy: Policy, known: PlantRef[]): Line[] {
  if (!Array.isArray(input) || input.length === 0) throw new OrderError('commande vide');
  if (input.length > policy.max_lines) throw new OrderError(`trop de lignes (max ${policy.max_lines})`);
  const seen = new Set<string>();
  let total = 0;
  const out: Line[] = [];
  for (const raw of input) {
    if (typeof raw !== 'object' || raw === null) throw new OrderError('ligne invalide');
    const extra = Object.keys(raw).filter(k => k !== 'plantId' && k !== 'grams');
    if (extra.length) throw new OrderError(`champ interdit dans une commande : ${extra.join(', ')}`);
    const { plantId, grams } = raw as { plantId?: unknown; grams?: unknown };
    if (typeof plantId !== 'string' || !known.some(p => p.id === plantId)) throw new OrderError('plante inconnue');
    if (!policy.verified_plants.includes(plantId)) throw new OrderError(`vente non autorisée pour ${plantId} : statut juridique non vérifié`);
    if (typeof grams !== 'number' || !Number.isFinite(grams) || grams <= 0) throw new OrderError('quantité invalide');
    if (seen.has(plantId)) throw new OrderError('plante en double');
    seen.add(plantId);
    total += grams;
    out.push({ plantId, grams: Math.round(grams * 10) / 10 });
  }
  if (total > policy.max_total_grams) throw new OrderError(`total trop élevé (max ${policy.max_total_grams} g)`);
  return out;
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans I, O, 0, 1 : lisible sur un bon papier

/** Code de préparation : 10 caractères dérivés de HMAC(secret, id) — non devinable sans le secret. */
export async function prepCode(id: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(id)));
  let s = '';
  for (let i = 0; i < 10; i++) s += ALPHABET[mac[i] % 32];
  return s.slice(0, 5) + '-' + s.slice(5);
}

export function prepSheet(o: Order, plants: PlantRef[]): string {
  const rows = o.lines.map(l => {
    const p = plants.find(x => x.id === l.plantId)!;
    return `${p.fr} (${p.latin}) — partie utilisée : ${p.part} — ${l.grams} g`;
  });
  return [
    `BON DE PRÉPARATION ${o.code}`,
    `Commande ${o.id} — ${new Date(o.createdAt).toISOString().slice(0, 10)}`,
    '',
    ...rows,
    '',
    `Total : ${o.totalG} g`,
    '',
    "À préparer et contrôler par un pharmacien ou un professionnel habilité (identification botanique, qualité, étiquetage).",
    "Ce bon ne contient aucune information de santé sur le destinataire.",
  ].join('\n');
}
