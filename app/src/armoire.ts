import type { Profile } from './safety.ts';

/** Contenu de l'armoire, stocké UNIQUEMENT sur le téléphone (stockage local NON chiffré). */
export type Armoire = { favorites: string[]; profile: Profile };
export const EMPTY_ARMOIRE: Armoire = { favorites: [], profile: { pregnant: false, lactating: false, ageYears: null, flags: [], meds: [] } };

const FLAG_IDS = ['asteraceae_allergy', 'salicylate_allergy', 'bleeding_disorder', 'biliary_disease', 'fluid_restriction', 'drives', 'plant_allergy', 'gastric_ulcer', 'kidney_disease', 'hypertension', 'liver_disease', 'cardiovascular_disease', 'hypokalaemia'];
const MAX_MEDS = 30;
const MAX_LEN = 80;

function strList(x: unknown, max: number): string[] {
  if (!Array.isArray(x)) return [];
  return x.filter((v): v is string => typeof v === 'string').map(v => v.trim().slice(0, MAX_LEN)).filter(Boolean).slice(0, max);
}

/** Nettoie tout ce qui vient du stockage : une donnée corrompue ne doit jamais faire planter l'app. */
export function sanitize(x: unknown): Armoire {
  if (!x || typeof x !== 'object') return EMPTY_ARMOIRE;
  const o = x as Record<string, unknown>;
  const p = (o.profile && typeof o.profile === 'object' ? o.profile : {}) as Record<string, unknown>;
  const age = typeof p.ageYears === 'number' && Number.isFinite(p.ageYears) && p.ageYears >= 0 && p.ageYears < 130 ? Math.floor(p.ageYears) : null;
  return {
    favorites: strList(o.favorites, 200),
    profile: {
      pregnant: p.pregnant === true,
      lactating: p.lactating === true,
      ageYears: age,
      flags: strList(p.flags, FLAG_IDS.length).filter(f => FLAG_IDS.includes(f)),
      meds: strList(p.meds, MAX_MEDS),
    },
  };
}

export function parseArmoire(raw: string | null | undefined): Armoire {
  if (!raw) return EMPTY_ARMOIRE;
  try { return sanitize(JSON.parse(raw)); } catch { return EMPTY_ARMOIRE; }
}

export function toggleFavorite(a: Armoire, plantId: string): Armoire {
  const has = a.favorites.includes(plantId);
  return { ...a, favorites: has ? a.favorites.filter(x => x !== plantId) : [...a.favorites, plantId] };
}
