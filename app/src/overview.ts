import type { Bundle, PlantData } from './safety.ts';
import type { Usage } from './usages.ts';
import type { Infusion } from './infusion.ts';

/** Synthèse « À retenir » d'une fiche : calculée UNIQUEMENT à partir des affirmations déjà vérifiées (aucune information nouvelle). */
export type Overview = {
  part: string;
  claimCount: number;
  sourceCount: number;
  infusion: Infusion | null;
  usages: string[];
  avoid: string[];
  caution: string[];
  generalCautions: number;
  medClasses: string[];
  aliases: string[];
};

export const FLAG_LABEL: Record<string, string> = {
  pregnant: 'Grossesse', lactating: 'Allaitement', age_lt_2: 'Enfant de moins de 2 ans', age_lt_6: 'Enfant de moins de 6 ans',
  age_lt_12: 'Enfant de moins de 12 ans', age_lt_18: 'Moins de 18 ans', plant_allergy: 'Allergie à la plante',
  asteraceae_allergy: 'Allergie aux astéracées', salicylate_allergy: 'Allergie aux salicylés', bleeding_disorder: 'Trouble de la coagulation',
  biliary_disease: 'Maladie des voies biliaires', fluid_restriction: 'Restriction hydrique', gastric_ulcer: 'Ulcère gastro-duodénal',
  kidney_disease: 'Maladie des reins', hypertension: 'Hypertension', liver_disease: 'Maladie du foie',
  cardiovascular_disease: 'Maladie cardiovasculaire', hypokalaemia: 'Manque de potassium', digestive_disease: 'Maladie digestive',
};
const ORDER = Object.keys(FLAG_LABEL);

export function overviewOf(
  plant: PlantData,
  bundle: Bundle & { usages?: Usage[]; infusions?: Infusion[] },
): Overview {
  const avoid = new Set<string>();
  const caution = new Set<string>();
  let general = 0;
  for (const c of plant.claims) {
    const flags = c.applies_to ?? [];
    if (c.severity === 'contraindiquee') for (const f of flags) if (FLAG_LABEL[f]) avoid.add(f);
    if (c.severity === 'precaution') {
      for (const f of flags) if (FLAG_LABEL[f]) caution.add(f);
      if (flags.includes('always')) general++;
    }
  }
  for (const f of avoid) caution.delete(f);
  const sort = (s: Set<string>) => ORDER.filter(f => s.has(f)).map(f => FLAG_LABEL[f]);
  const ids = new Set(plant.claims.map(c => c.id));
  const usages = (bundle.usages ?? []).filter(u => u.claims.some(id => ids.has(id))).map(u => u.fr);
  const classIds = new Set(bundle.rules.filter(r => r.plant === plant.id).map(r => r.class));
  return {
    part: plant.part,
    claimCount: plant.claims.length,
    sourceCount: new Set(plant.claims.map(c => c.url)).size,
    infusion: (bundle.infusions ?? []).find(i => i.plant === plant.id) ?? null,
    usages,
    avoid: sort(avoid),
    caution: sort(caution),
    generalCautions: general,
    medClasses: bundle.classes.filter(c => classIds.has(c.id)).map(c => c.fr),
    aliases: plant.aliases ?? [],
  };
}
