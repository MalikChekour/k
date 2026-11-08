import { normalize } from './safety.ts';
import type { Bundle, Claim, PlantData } from './safety.ts';
import { plantsForUsage } from './usages.ts';
import type { Usage } from './usages.ts';

export type Rubric = 'indication' | 'posologie' | 'precautions' | 'interactions' | 'grossesse' | 'savoir';
/** Les doses de l'EMA valent pour des préparations précises (extrait standardisé, tisane…) : jamais à transposer. */
export const POSOLOGY_NOTE =
  "Ces doses sont celles de préparations précises décrites dans la monographie officielle (extrait standardisé, tisane…). " +
  "Elles ne s'appliquent ni à un autre produit, ni à une préparation maison, ni à une personne qui n'est pas dans le public visé. Demandez conseil à un pharmacien.";

export const RUBRICS: { id: Rubric; fr: string }[] = [
  { id: 'indication', fr: 'Indications' },
  { id: 'posologie', fr: 'Posologie' },
  { id: 'precautions', fr: 'Précautions' },
  { id: 'interactions', fr: 'Interactions' },
  { id: 'grossesse', fr: 'Grossesse' },
  { id: 'savoir', fr: 'En savoir plus' },
];

/** Type d'affirmation -> rubrique de la fiche. Un type inconnu tombe dans « Précautions » (jamais masqué). */
export function rubricOf(type: string): Rubric {
  switch (type) {
    case 'indication':
    case 'indication_basis':
    case 'traditional_use': return 'indication';
    case 'posology':
    case 'preparation': return 'posologie';
    case 'interaction': return 'interactions';
    case 'pregnancy':
    case 'lactation': return 'grossesse';
    case 'pharmacology':
    case 'pharmacodynamics':
    case 'pharmacokinetics':
    case 'preclinical':
    case 'quality': return 'savoir';
    default: return 'precautions';
  }
}

export function groupClaims(claims: Claim[]): Record<Rubric, Claim[]> {
  const out: Record<Rubric, Claim[]> = { indication: [], posologie: [], precautions: [], interactions: [], grossesse: [], savoir: [] };
  for (const c of claims) out[rubricOf(c.type)].push(c);
  return out;
}

export const SEVERITY_LABEL: Record<string, string> = {
  contraindiquee: 'Contre-indiquée',
  majeure: 'Interaction majeure',
  moderee: 'Interaction modérée',
  precaution: 'Précaution',
  donnees_absentes: 'Données absentes',
  aucune_rapportee: 'Aucune rapportée',
};
export function severityLabel(sev?: string | null): string {
  return sev ? SEVERITY_LABEL[sev] ?? sev : 'Information';
}

/** Recherche insensible à la casse et aux accents : nom français, nom latin, partie utilisée, autres noms (chinois, pinyin…),
 * et — via `viaUsage` — les plantes dont une indication figure dans une catégorie de symptôme qui correspond à la saisie. */
export function filterPlants(plants: PlantData[], query: string, rubric: Rubric | null, viaUsage?: Set<string>, groupIds?: string[] | null): PlantData[] {
  const q = normalize(query);
  return plants.filter(p => {
    if (groupIds && !groupIds.includes(p.id)) return false;
    if (rubric && !p.claims.some(c => rubricOf(c.type) === rubric)) return false;
    if (!q) return true;
    return normalize(`${p.fr} ${p.latin} ${p.part} ${(p.aliases ?? []).join(' ')}`).includes(q) || !!viaUsage?.has(p.id);
  });
}

/** Plantes des familles (ex. « Adaptogènes ») dont le nom contient la saisie (≥ 3 lettres). */
export function plantIdsForGroupQuery(groups: { fr: string; plants: string[] }[], query: string): Set<string> {
  const q = normalize(query);
  const out = new Set<string>();
  if (q.length < 3) return out;
  for (const g of groups) if (normalize(g.fr).includes(q)) for (const id of g.plants) out.add(id);
  return out;
}

/** Identifiants des plantes proposées pour les catégories de symptôme dont le libellé contient la saisie (≥ 3 lettres). */
export function plantIdsForSymptomQuery(bundle: Bundle, usages: Usage[], query: string): Set<string> {
  const q = normalize(query);
  const out = new Set<string>();
  if (q.length < 3) return out;
  for (const u of usages) {
    if (!normalize(u.fr).includes(q)) continue;
    for (const h of plantsForUsage(bundle, usages, u.id)) out.add(h.plantId);
  }
  return out;
}

/** Documents officiels réellement cités dans le bundle, sans doublon (écran « Sources et méthode »). */
export function sourcesOf(plants: PlantData[]): { title: string; url: string; plants: string[] }[] {
  const map = new Map<string, { title: string; url: string; plants: string[] }>();
  for (const p of plants) {
    for (const c of p.claims) {
      const cur = map.get(c.url) ?? { title: c.source, url: c.url, plants: [] };
      if (!cur.plants.includes(p.fr)) cur.plants.push(p.fr);
      map.set(c.url, cur);
    }
  }
  return [...map.values()].sort((a, b) => a.title.localeCompare(b.title, 'fr'));
}
