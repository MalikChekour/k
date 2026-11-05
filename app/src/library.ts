import { normalize } from './safety.ts';
import type { Claim, PlantData } from './safety.ts';

export type Rubric = 'indication' | 'posologie' | 'precautions' | 'interactions' | 'grossesse';
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
];

/** Type d'affirmation -> rubrique de la fiche. Un type inconnu tombe dans « Précautions » (jamais masqué). */
export function rubricOf(type: string): Rubric {
  switch (type) {
    case 'indication': return 'indication';
    case 'posology': return 'posologie';
    case 'interaction': return 'interactions';
    case 'pregnancy':
    case 'lactation': return 'grossesse';
    default: return 'precautions';
  }
}

export function groupClaims(claims: Claim[]): Record<Rubric, Claim[]> {
  const out: Record<Rubric, Claim[]> = { indication: [], posologie: [], precautions: [], interactions: [], grossesse: [] };
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

/** Recherche insensible à la casse et aux accents, sur le nom français, le nom latin et la partie utilisée. */
export function filterPlants(plants: PlantData[], query: string, rubric: Rubric | null): PlantData[] {
  const q = normalize(query);
  return plants.filter(p => {
    if (rubric && !p.claims.some(c => rubricOf(c.type) === rubric)) return false;
    if (!q) return true;
    return normalize(`${p.fr} ${p.latin} ${p.part}`).includes(q);
  });
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
