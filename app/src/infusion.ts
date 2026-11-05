/** Infusion (tisane) : compare une dose saisie à la fourchette EMA. Ne compose rien, ne calcule aucun pourcentage. */
export type Infusion = { plant: string; claim: string; min_g: number; max_g: number; water_ml: number; quote_fragment: string; label: string };
export type RangeStatus = 'invalide' | 'en_dessous' | 'dans_la_fourchette' | 'au_dessus';

export function compareToRange(grams: number, min: number, max: number): RangeStatus {
  if (!(grams > 0) || !Number.isFinite(grams)) return 'invalide';
  if (grams < min) return 'en_dessous';
  if (grams > max) return 'au_dessus';
  return 'dans_la_fourchette';
}

export const RANGE_TEXT: Record<RangeStatus, string> = {
  invalide: 'Saisissez une quantité en grammes.',
  en_dessous: 'En dessous de la dose unitaire citée par l’EMA.',
  dans_la_fourchette: 'Dans la fourchette unitaire citée par l’EMA.',
  au_dessus: 'Au-dessus de la dose unitaire citée par l’EMA : ne pas dépasser sans avis professionnel.',
};
