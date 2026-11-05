import React from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Assessment, Alert as SafetyAlert } from '../safety';
import { severityLabel } from '../library';

// Direction : planche d'herbier. Papier chaud, encre, un seul accent terre cuite ; filets fins plutôt que cartes ;
// serif pour ce qu'on LIT (titres, affirmations), sans-serif pour ce qu'on UTILISE (étiquettes, boutons).
// Les noms de clés historiques (green, gold…) sont conservés pour les écrans : seules les valeurs ont changé.
export const C = {
  bg: '#F3EDDF', card: '#FAF6EB', line: '#CBC1A8', ink: '#1B2620', text: '#1B2620', body: '#27302A', muted: '#5C655D',
  gold: '#9C3F24', green: '#43603B', amber: '#8A5C0B', red: '#A3231B', grey: '#5C655D', rule: '#8E8774',
};
export const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, "Times New Roman", serif' }) as string;
export const SEV_COLOR: Record<string, string> = {
  contraindiquee: C.red, majeure: C.red, moderee: C.amber, precaution: C.amber, donnees_absentes: C.grey, aucune_rapportee: C.grey,
};
export const EDU = 'Information éducative, non médicale. Ne remplace pas l’avis d’un pharmacien ou d’un médecin.';

const VERDICT: Record<string, { t: string; c: string }> = {
  aucune_selection: { t: 'Choisissez au moins une plante.', c: C.muted },
  contre_indication: { t: 'Contre-indication signalée', c: C.red },
  alertes: { t: 'Alertes à lire avant tout usage', c: C.amber },
  incomplet: { t: 'Évaluation incomplète : médicament non reconnu', c: C.amber },
  aucune_alerte_dans_notre_base: { t: 'Aucune alerte dans notre base (ce n’est pas une garantie)', c: C.green },
};

export function Notice() {
  return <Text style={s.notice}>{EDU}</Text>;
}

export function Badge({ severity }: { severity?: string | null }) {
  const color = SEV_COLOR[severity ?? ''] ?? C.green;
  return (
    <View style={[s.badge, { borderColor: color }, (severity === 'contraindiquee' || severity === 'majeure') && { transform: [{ rotate: '-2deg' }] }]} accessible accessibilityLabel={`Gravité : ${severityLabel(severity)}`}>
      <Text style={[s.badgeTxt, { color }]}>{severityLabel(severity)}</Text>
    </View>
  );
}

export function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, on && s.chipOn]} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={label}>
      <Text style={on ? s.chipTxtOn : s.chipTxt}>{label}</Text>
    </Pressable>
  );
}

export function AlertCard({ a }: { a: SafetyAlert }) {
  return (
    <View style={s.claim}>
      <View style={s.row}>
        <Text style={s.tag}>{a.plantFr}</Text>
        <Badge severity={a.severity} />
      </View>
      <Text style={s.body}>{a.statement}</Text>
      <Text style={s.muted}>{a.cause}</Text>
      <Text style={s.quote}>« {a.quote} »</Text>
      <Pressable onPress={() => Linking.openURL(a.url)} accessibilityRole="link" accessibilityLabel={`Source : ${a.source}`}>
        <Text style={s.link}>{a.source}</Text>
      </Pressable>
      {!a.reviewed && <Text style={s.warn}>Pas encore relu par un professionnel</Text>}
    </View>
  );
}

/** Verdict + alertes + notes + limites : même rendu partout (Sécurité, Mélange). */
export function SafetyReport({ r }: { r: Assessment }) {
  const v = VERDICT[r.verdict];
  return (
    <View style={{ gap: 12 }}>
      <View style={[s.verdict, { borderTopColor: v.c }]} accessibilityLiveRegion="polite">
        <Text style={s.tag}>Constat</Text>
        <Text style={[s.verdictTxt, { color: v.c }]}>{v.t}</Text>
        {r.unknownMeds.length > 0 && <Text style={s.warn}>Non reconnu : {r.unknownMeds.join(', ')}. Demandez à votre pharmacien.</Text>}
      </View>
      {r.alerts.map(a => <AlertCard key={a.plantId + a.claimId} a={a} />)}
      {r.notes.map((n, i) => <Text key={i} style={s.muted}>• {n.plantFr} : {n.text}</Text>)}
      <Text style={s.muted}>{r.coverage}</Text>
    </View>
  );
}

export const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  pad: { padding: 20, gap: 14, paddingBottom: 40 },
  h1: { color: C.ink, fontFamily: SERIF, fontSize: 32, lineHeight: 38, letterSpacing: -0.5 },
  h2: { color: C.ink, fontFamily: SERIF, fontSize: 21, lineHeight: 27 },
  h3: { color: C.gold, fontSize: 11.5, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase', marginTop: 10, paddingBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.rule },
  latin: { color: C.muted, fontFamily: SERIF, fontStyle: 'italic', fontSize: 16 },
  body: { color: C.body, fontFamily: SERIF, fontSize: 16.5, lineHeight: 25 },
  quote: { color: C.muted, fontFamily: SERIF, fontStyle: 'italic', fontSize: 14, lineHeight: 21, paddingLeft: 12, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: C.rule },
  muted: { color: C.muted, fontSize: 13.5, lineHeight: 19 },
  link: { color: C.gold, textDecorationLine: 'underline', fontSize: 13.5 },
  ok: { color: C.green, fontSize: 12.5 },
  warn: { color: C.amber, fontSize: 12.5, lineHeight: 18 },
  notice: { color: C.muted, fontSize: 12, lineHeight: 17, fontStyle: 'italic' },
  card: { backgroundColor: C.card, borderWidth: StyleSheet.hairlineWidth, borderColor: C.rule, borderRadius: 2, padding: 16, gap: 6 },
  verdict: { backgroundColor: C.card, borderTopWidth: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: C.rule, padding: 16, gap: 6 },
  verdictTxt: { fontFamily: SERIF, fontSize: 23, lineHeight: 29 },
  backdrop: { flex: 1, backgroundColor: C.bg },
  sheet: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 20, paddingTop: 12 },
  close: { color: C.ink, fontSize: 12, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', padding: 12, paddingRight: 0 },
  claim: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line, paddingTop: 14, marginTop: 6, gap: 6 },
  tag: { color: C.gold, fontSize: 11, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase' },
  badge: { alignSelf: 'flex-start', borderWidth: 1.5, borderRadius: 2, paddingVertical: 2, paddingHorizontal: 7 },
  badgeTxt: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.3, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, gap: 12 },
  input: { backgroundColor: C.card, color: C.ink, fontFamily: SERIF, borderWidth: StyleSheet.hairlineWidth, borderColor: C.rule, borderRadius: 2, paddingHorizontal: 12, minWidth: 100, minHeight: 48, textAlign: 'right', fontSize: 17 },
  inputWide: { width: '100%', textAlign: 'left' },
  tabs: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.ink, backgroundColor: C.card },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', minHeight: 52, justifyContent: 'center', borderTopWidth: 3, borderTopColor: 'transparent', marginTop: -1 },
  tabActive: { borderTopColor: C.gold },
  tabTxt: { color: C.muted, fontSize: 11, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase' },
  tabOn: { color: C.gold, fontWeight: '800' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: C.rule, borderRadius: 2, paddingVertical: 8, paddingHorizontal: 12, minHeight: 44, justifyContent: 'center' },
  chipOn: { backgroundColor: C.ink, borderColor: C.ink },
  chipTxt: { color: C.ink, fontSize: 13, letterSpacing: 0.2 },
  chipTxtOn: { color: C.bg, fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
  brand: { color: C.ink, fontFamily: SERIF, fontSize: 27, letterSpacing: 0.3 },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10, gap: 6, borderBottomWidth: 3, borderBottomColor: C.ink, borderStyle: 'solid' },
  index: { flexDirection: 'row', alignItems: 'baseline', gap: 14, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.rule },
  num: { color: C.gold, fontFamily: SERIF, fontSize: 14, width: 26, fontVariant: ['tabular-nums'] },
});
