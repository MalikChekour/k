import type { Bundle } from './safety.ts';

export type Usage = { id: string; fr: string; claims: string[] };
export type UsageHit = {
  plantId: string; plantFr: string; latin: string; claimId: string; statement: string;
  quote: string; source: string; url: string; reviewed: boolean;
};

/** Plantes dont une INDICATION EMA figure dans la catégorie. Ne consulte jamais les alertes. */
export function plantsForUsage(bundle: Bundle, usages: Usage[], usageId: string): UsageHit[] {
  const usage = usages.find(u => u.id === usageId);
  if (!usage) return [];
  const wanted = new Set(usage.claims);
  const hits: UsageHit[] = [];
  for (const plant of bundle.plants) {
    for (const c of plant.claims) {
      if (c.type === 'indication' && wanted.has(c.id)) {
        hits.push({
          plantId: plant.id, plantFr: plant.fr, latin: plant.latin, claimId: c.id, statement: c.statement,
          quote: c.quote, source: c.source, url: c.url, reviewed: !!c.reviewed_by,
        });
      }
    }
  }
  return hits.sort((a, b) => a.plantFr.localeCompare(b.plantFr, 'fr'));
}
