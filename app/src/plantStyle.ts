/** Identité visuelle d'une plante : une couleur et un motif dessiné. Purement décoratif, aucune donnée de santé. */
export type Motif = 'rosette' | 'feuilles' | 'baies' | 'racine';
export type PlantStyle = { color: string; tint: string; motif: Motif; petals: number; turn: number };

const COLORS: Record<string, string> = {
  matricaria_recutita: '#E9A60C', valeriana_officinalis: '#9A6FD0', hypericum_perforatum: '#E6B800', passiflora_incarnata: '#B04FB8',
  melissa_officinalis: '#6FA82A', crataegus_spp: '#E0587C', curcuma_longa: '#E8741A', rhodiola_rosea: '#E4573D',
  ginkgo_biloba: '#C9A227', silybum_marianum: '#8E4FA8', urtica_dioica: '#2E9A57', filipendula_ulmaria: '#E8A07A',
  zingiber_officinale: '#D98A1E', mentha_piperita: '#1FB38F', foeniculum_vulgare: '#86B83C', thymus_vulgaris: '#6E9E6A',
  lavandula_angustifolia: '#8B79D6', tilia_cordata: '#C8B43A', harpagophytum_procumbens: '#C7552F', echinacea_purpurea: '#CC3E86',
  rosmarinus_officinalis: '#5B8DB8', salvia_officinalis: '#7C9A8E', calendula_officinalis: '#F08A12', taraxacum_officinale: '#F2C200',
  sambucus_nigra: '#B8A27A', plantago_lanceolata: '#4F9D4A', cynara_scolymus: '#7A6FB5',
};
const FALLBACK = ['#E9A60C', '#E4573D', '#1FB38F', '#9A6FD0', '#6FA82A', '#E0587C', '#2E9A57', '#E8741A'];

/** Hash stable : une plante sans couleur dédiée garde toujours la même. */
export function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Mélange avec du blanc : `t` = part de couleur conservée (0..1). */
export function tintOf(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.round(255 - (255 - v) * t).toString(16).padStart(2, '0');
  return '#' + ch((n >> 16) & 255) + ch((n >> 8) & 255) + ch(n & 255);
}

export function motifOf(part: string): Motif {
  const p = part.toLowerCase();
  if (/(racine|rhizome)/.test(p)) return 'racine';
  if (/(fruit|baie|calice)/.test(p)) return 'baies';
  if (/(feuille|herbe|aérienne|aerienne|sommité|sommite)/.test(p)) return 'feuilles';
  return 'rosette';
}

export function styleFor(plant: { id: string; part: string }): PlantStyle {
  const h = hash(plant.id);
  const color = COLORS[plant.id] ?? FALLBACK[h % FALLBACK.length];
  return { color, tint: tintOf(color, 0.16), motif: motifOf(plant.part), petals: 5 + (h % 4), turn: (h % 37) };
}
