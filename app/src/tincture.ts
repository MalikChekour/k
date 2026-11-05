/** Teinture-mère : plante sèche (g) en ratio 1:N (g:mL). Dilution C1*V1 = C2*V2 (contraction de volume ignorée). */
const round = (n: number) => Math.round(n * 10) / 10;

export function tincture(herbG: number, ratio: number, targetPct: number, stockPct = 96) {
  if (!(herbG > 0) || !(ratio > 0) || !(targetPct > 0) || targetPct > stockPct) return null;
  const solventMl = herbG * ratio;
  const alcoholMl = (solventMl * targetPct) / stockPct;
  return { solventMl: round(solventMl), alcoholMl: round(alcoholMl), waterMl: round(solventMl - alcoholMl) };
}
