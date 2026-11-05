import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Assessment, Alert as SafetyAlert } from '../safety';
import { severityLabel } from '../library';

export const C = {
  bg: '#060B08', card: '#0E1712', line: '#1B2A21', text: '#F2F5F3', body: '#E4E9E6', muted: '#B4BFB9',
  gold: '#D4AF37', green: '#6FD5A4', amber: '#FFC061', red: '#FF7A7E', grey: '#B4BFB9',
};
export const SEV_COLOR: Record<string, string> = {
  contraindiquee: C.red, majeure: C.red, moderee: C.amber, precaution: C.amber, donnees_absentes: C.grey, aucune_rapportee: C.grey,
};
export const EDU = 'Information éducative, non médicale. Ne remplace pas l’avis d’un pharmacien ou d’un médecin.';

const VERDICT: Record<string, { t: string; c: string }> = {
  aucune_selection: { t: 'Choisissez au moins une plante.', c: '#9AA5A0' },
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
    <View style={[s.badge, { borderColor: color }]} accessible accessibilityLabel={`Gravité : ${severityLabel(severity)}`}>
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
    <View style={[s.claim, { borderLeftColor: SEV_COLOR[a.severity] ?? C.green }]}>
      <Text style={s.tag}>{a.plantFr.toUpperCase()}</Text>
      <Badge severity={a.severity} />
      <Text style={s.body}>{a.statement}</Text>
      <Text style={s.muted}>{a.cause}</Text>
      <Text style={s.muted}>« {a.quote} »</Text>
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
      <View style={[s.card, { borderLeftWidth: 4, borderLeftColor: v.c }]} accessibilityLiveRegion="polite">
        <Text style={[s.h2, { color: v.c }]}>{v.t}</Text>
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
  pad: { padding: 16, gap: 12 },
  h1: { color: C.text, fontSize: 24, fontWeight: '600' },
  h2: { color: C.text, fontSize: 18, fontWeight: '600' },
  h3: { color: C.gold, fontSize: 15, fontWeight: '600', marginTop: 8 },
  latin: { color: C.green, fontStyle: 'italic', fontSize: 15 },
  body: { color: C.body, fontSize: 16, lineHeight: 23 },
  muted: { color: C.muted, fontSize: 14, lineHeight: 20 },
  link: { color: C.green, textDecorationLine: 'underline', fontSize: 14 },
  ok: { color: C.green, fontSize: 13 },
  warn: { color: C.amber, fontSize: 13 },
  notice: { color: C.muted, fontSize: 13, lineHeight: 18 },
  card: { backgroundColor: C.card, borderRadius: 14, padding: 16, gap: 6 },
  backdrop: { flex: 1, backgroundColor: '#000A', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '88%' },
  close: { color: C.muted, alignSelf: 'flex-end', padding: 12, fontSize: 15 },
  claim: { borderLeftWidth: 3, paddingLeft: 12, marginTop: 12, gap: 4 },
  tag: { color: C.gold, fontSize: 12, letterSpacing: 1 },
  badge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 8, paddingVertical: 2, paddingHorizontal: 8, marginVertical: 2 },
  badgeTxt: { fontSize: 12, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  input: { backgroundColor: C.card, color: C.text, borderRadius: 10, padding: 12, minWidth: 100, minHeight: 44, textAlign: 'right', fontSize: 16 },
  inputWide: { width: '100%', textAlign: 'left' },
  tabs: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.line },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  tabTxt: { color: C.muted, fontSize: 13 },
  tabOn: { color: C.green, fontWeight: '600' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#3A4D42', borderRadius: 20, paddingVertical: 10, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center' },
  chipOn: { backgroundColor: C.green, borderColor: C.green },
  chipTxt: { color: '#D5DDD9', fontSize: 14 },
  chipTxtOn: { color: '#06140C', fontSize: 14, fontWeight: '600' },
  brand: { color: C.gold, fontSize: 22, fontWeight: '600' },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6, gap: 4 },
});
