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
  glycyrrhiza_glabra: '#8A5A2B', humulus_lupulus: '#A8C23A', aesculus_hippocastanum: '#B5651D', vitis_vinifera: '#9B2D5B',
  althaea_officinalis: '#D9A3B8', allium_sativum: '#C9B79C', camellia_sinensis: '#4F8A3C', rosa_damascena: '#D8648A', rubus_idaeus: '#B23A5A', syzygium_aromaticum: '#7A4A2A', tanacetum_parthenium: '#9BB86B', trigonella_foenum_graecum: '#C9A24A', vaccinium_myrtillus: '#4B4A8C', cinnamomum_verum: '#A5642F', gentiana_lutea: '#D8B53A', levisticum_officinale: '#6F9A4A', linum_usitatissimum: '#6C86C4', marrubium_vulgare: '#8FA58C', ononis_spinosa: '#C26E86', orthosiphon_aristatus: '#7F6FB5', pimpinella_anisum: '#B8A24A', potentilla_erecta: '#C23B3B', solidago_virgaurea: '#E3B71E', artemisia_absinthium: '#9DB08A', fumaria_officinalis: '#B56A8C', melaleuca_alternifolia: '#5E9E7E', melilotus_officinalis: '#E6C84F', peumus_boldus: '#6F8F4E', rheum_palmatum: '#B0452F', salix_purpurea: '#A8B878', symphytum_officinale: '#7B4B8E', actaea_racemosa: '#B7A7C9', capsicum_frutescens: '#D8321F', eucalyptus_globulus: '#4F9D8A', oenothera_biennis: '#E8C83A', rhamnus_purshiana: '#7A5236', senna_alexandrina: '#8A9A3A', verbascum_densiflorum: '#F0D24A', vitex_agnus_castus: '#6E6BA8', agrimonia_eupatoria: '#8FA84B', carum_carvi: '#7A8B3C', malva_sylvestris: '#8E5BA8', origanum_majorana: '#7FA23F', ribes_nigrum: '#4B2A6B', serenoa_repens: '#6B8E4E', vaccinium_macrocarpon: '#9E1B32', hamamelis_virginiana: '#6A4C93', hedera_helix: '#2B6E4E', plantago_ovata: '#9C7A4A', primula_veris: '#E3B93C', eleutherococcus_senticosus: '#6B8E3A', panax_ginseng: '#B5472B', carthamus_tinctorius: '#2F7D8C', gentiana_scabra: '#3E5BB8', ziziphus_jujuba: '#7A8B3C', angelica_sinensis: '#2E8B57', rehmannia_glutinosa: '#8C5A8E', schisandra_chinensis: '#C23A55', scutellaria_baicalensis: '#5B5BC8', equisetum_arvense: '#4E8F6A', betula_pendula: '#7FB069', arctostaphylos_uva_ursi: '#D04A5C', pelargonium_sidoides: '#C2457A',
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
