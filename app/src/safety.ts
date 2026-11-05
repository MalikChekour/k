/**
 * Moteur de sécurité déterministe (hors ligne, aucune IA).
 * Principe : il ne conclut JAMAIS « sans danger ». Au mieux « aucune alerte dans notre base », avec la liste de ce qui n'a pas été évalué.
 * Chaque alerte renvoie à une affirmation sourcée (extrait exact d'un document officiel).
 */
export type Severity = 'contraindiquee' | 'majeure' | 'moderee' | 'precaution' | 'donnees_absentes' | 'aucune_rapportee';
export type Claim = {
  id: string; type: string; statement: string; severity?: string | null; population?: string | null;
  status: string; reviewed_by?: string | null; applies_to?: string[]; source: string; url: string; quote: string;
};
export type PlantData = { id: string; fr: string; latin: string; part: string; claims: Claim[] };
export type MedClass = { id: string; fr: string; substances: string[] };
export type Bundle = { plants: PlantData[]; classes: MedClass[]; rules: { plant: string; class: string; claim: string }[] };

export type Profile = {
  pregnant?: boolean; lactating?: boolean; ageYears?: number | null;
  /** asteraceae_allergy, salicylate_allergy, bleeding_disorder, biliary_disease, fluid_restriction, drives, plant_allergy */
  flags?: string[];
  /** noms saisis (« Warfarine 5 mg », « pilule contraceptive »…) ou identifiants de classe */
  meds?: string[];
};

export type Alert = {
  plantId: string; plantFr: string; severity: Severity; claimId: string; statement: string;
  source: string; url: string; quote: string; reviewed: boolean; cause: string;
};
export type Note = { plantId: string; plantFr: string; medClass: string; status: 'non_couvert' | 'aucune_rapportee' | 'aucune_donnee'; text: string };
export type Verdict = 'aucune_selection' | 'contre_indication' | 'alertes' | 'incomplet' | 'aucune_alerte_dans_notre_base';
export type Assessment = { verdict: Verdict; alerts: Alert[]; notes: Note[]; unknownMeds: string[]; matchedMeds: { input: string; classes: string[] }[]; coverage: string };

const RANK: Record<string, number> = { contraindiquee: 0, majeure: 1, moderee: 2, precaution: 3, donnees_absentes: 4, aucune_rapportee: 5 };
export const COVERAGE =
  "Évaluation limitée aux plantes et aux classes de médicaments présentes dans notre base, d'après des monographies officielles. " +
  "Les associations entre plantes ne sont pas évaluées. L'absence d'alerte ne prouve pas l'absence de risque : demandez l'avis d'un pharmacien.";

export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Rapproche un nom saisi des classes : mot entier uniquement, jamais de correspondance floue (un doute = « inconnu »). */
export function matchMeds(inputs: string[], classes: MedClass[]) {
  const matched: { input: string; classes: string[] }[] = [];
  const unknown: string[] = [];
  for (const raw of inputs) {
    const n = ' ' + normalize(raw) + ' ';
    if (raw.trim() === '') continue; // saisie vide seulement ; un nom illisible (alphabet non latin, emoji) reste « inconnu »
    const hit = new Set<string>();
    for (const c of classes) {
      if (normalize(c.id) === n.trim()) hit.add(c.id);
      for (const s of c.substances) if (n.includes(' ' + normalize(s) + ' ')) hit.add(c.id);
    }
    if (hit.size) matched.push({ input: raw, classes: [...hit] }); else unknown.push(raw);
  }
  return { matched, unknown };
}

function activeFlags(p: Profile): Set<string> {
  const f = new Set<string>(['always', ...(p.flags ?? [])]);
  if (p.pregnant) f.add('pregnant');
  if (p.lactating) f.add('lactating');
  if (typeof p.ageYears === 'number') {
    if (p.ageYears < 12) f.add('age_lt_12');
    if (p.ageYears < 18) f.add('age_lt_18');
  }
  return f;
}

export function assess(bundle: Bundle, plantIds: string[], profile: Profile): Assessment {
  const { matched, unknown } = matchMeds(profile.meds ?? [], bundle.classes);
  const classIds = new Set(matched.flatMap(m => m.classes));
  const flags = activeFlags(profile);
  const classFr = (id: string) => bundle.classes.find(c => c.id === id)?.fr ?? id;
  const alerts = new Map<string, Alert>();
  const notes: Note[] = [];
  let unknownPlant = false;

  const push = (pl: PlantData, c: Claim, cause: string) => {
    const key = pl.id + '|' + c.id;
    if (alerts.has(key)) return;
    alerts.set(key, { plantId: pl.id, plantFr: pl.fr, severity: (c.severity ?? 'precaution') as Severity, claimId: c.id, statement: c.statement,
      source: c.source, url: c.url, quote: c.quote, reviewed: !!c.reviewed_by, cause });
  };

  for (const id of new Set(plantIds)) {
    const pl = bundle.plants.find(p => p.id === id);
    if (!pl) { unknownPlant = true; continue; }
    for (const c of pl.claims) {
      const hit = (c.applies_to ?? []).find(a => flags.has(a));
      if (hit) push(pl, c, hit === 'always' ? 'Information générale sur cette plante' : `Profil : ${hit}`);
    }
    const rules = bundle.rules.filter(r => r.plant === id);
    for (const r of rules) {
      const c = pl.claims.find(x => x.id === r.claim);
      if (c && classIds.has(r.class)) push(pl, c, `Médicament : ${classFr(r.class)}`);
    }
    const covered = new Set(rules.map(r => r.class));
    const status = pl.claims.find(c => c.type === 'interaction' && (c.severity === 'aucune_rapportee' || c.severity === 'donnees_absentes'));
    for (const cid of classIds) {
      if (covered.has(cid)) continue;
      if (rules.length === 0 && status?.severity === 'aucune_rapportee')
        notes.push({ plantId: id, plantFr: pl.fr, medClass: cid, status: 'aucune_rapportee', text: "La monographie officielle ne rapporte aucune interaction pour cette plante. Cela ne prouve pas l'absence d'interaction." });
      else if (rules.length === 0 && status?.severity === 'donnees_absentes')
        notes.push({ plantId: id, plantFr: pl.fr, medClass: cid, status: 'aucune_donnee', text: "Aucune donnée disponible sur les interactions de cette plante." });
      else
        notes.push({ plantId: id, plantFr: pl.fr, medClass: cid, status: 'non_couvert', text: `Association avec « ${classFr(cid)} » non couverte par notre base pour cette plante.` });
    }
  }

  const sorted = [...alerts.values()].sort((a, b) => (RANK[a.severity] ?? 1) - (RANK[b.severity] ?? 1));
  let verdict: Verdict;
  if (plantIds.length === 0) verdict = 'aucune_selection';
  else if (sorted.some(a => a.severity === 'contraindiquee')) verdict = 'contre_indication';
  // Toute alerte affichée est comptée, sauf les deux statuts « rien à signaler » ; une gravité inconnue compte comme une alerte.
  else if (sorted.some(a => a.severity !== 'aucune_rapportee' && a.severity !== 'donnees_absentes')) verdict = 'alertes';
  else if (unknown.length > 0 || unknownPlant) verdict = 'incomplet';
  else verdict = 'aucune_alerte_dans_notre_base';
  return { verdict, alerts: sorted, notes, unknownMeds: unknown, matchedMeds: matched, coverage: COVERAGE };
}
