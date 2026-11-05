import React from 'react';
import { Animated, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Assessment, Alert as SafetyAlert } from '../safety';
import { severityLabel } from '../library';
import { F } from '../fonts';

// Direction : l'étal du marché. Crème chaud, vert profond pour l'encre, corail et safran pour la bonne humeur,
// une couleur propre à chaque plante. Mots clés en gras, extraits officiels repliés (un toucher pour les lire).
// Les noms de clés historiques (green, gold…) sont conservés pour les écrans : seules les valeurs ont changé.
export const C = {
  bg: '#FFF8EA', card: '#FFFFFF', line: '#EADFC9', ink: '#17382F', text: '#17382F', body: '#2B3B35', muted: '#5F6D66',
  gold: '#C8402A', green: '#2F7D4F', amber: '#965800', red: '#B3261E', grey: '#5F6D66', rule: '#D9CDB4', sun: '#F5B731', soft: '#FFE9C7',
};
export const SEV_COLOR: Record<string, string> = {
  contraindiquee: C.red, majeure: C.red, moderee: C.amber, precaution: C.amber, donnees_absentes: C.grey, aucune_rapportee: C.grey,
};
export const EDU = 'Information éducative, non médicale. Ne remplace pas l’avis d’un pharmacien ou d’un médecin.';

/** Bouton qui répond au toucher : léger rebond au lieu d'un simple changement d'opacité. */
export function Tap({ onPress, style, children, ...rest }: React.ComponentProps<typeof Pressable> & { children?: React.ReactNode }) {
  const v = React.useRef(new Animated.Value(1)).current;
  const to = (x: number) => Animated.spring(v, { toValue: x, useNativeDriver: true, speed: 40, bounciness: 8 }).start();
  return (
    <Pressable onPress={onPress} onPressIn={() => to(0.96)} onPressOut={() => to(1)} {...rest}>
      <Animated.View style={[style as object, { transform: [{ scale: v }] }]}>{children as React.ReactNode}</Animated.View>
    </Pressable>
  );
}

/** Apparition en fondu + glissement, échelonnée par l'index. */
export function Reveal({ i = 0, children }: { i?: number; children: React.ReactNode }) {
  const v = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 380, delay: Math.min(i, 8) * 55, useNativeDriver: true }).start();
  }, []);
  return <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>{children}</Animated.View>;
}

/** Extrait officiel + lien, repliés par défaut : on lit d'abord l'essentiel, la preuve est à un toucher. */
export function Source({ quote, url, source, reviewed }: { quote: string; url: string; source: string; reviewed?: boolean }) {
  const [open, setOpen] = React.useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Pressable onPress={() => setOpen(o => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }}
        accessibilityLabel="Extrait officiel" style={{ minHeight: 40, justifyContent: 'center' }}>
        <Text style={s.link}>{open ? '▾ Masquer l’extrait officiel' : '▸ Voir l’extrait officiel'}</Text>
      </Pressable>
      {open && (
        <View style={{ gap: 6 }}>
          <Text style={s.quote}>« {quote} »</Text>
          <Pressable onPress={() => Linking.openURL(url)} accessibilityRole="link" accessibilityLabel={`Source : ${source}`}>
            <Text style={s.link}>{source} ↗</Text>
          </Pressable>
          <Text style={reviewed ? s.ok : s.warn}>{reviewed ? 'Relu par un professionnel' : 'Source vérifiée automatiquement : pas encore relue par un professionnel'}</Text>
        </View>
      )}
    </View>
  );
}

const VERDICT: Record<string, { t: string; bg: string; fg: string; glyph: string }> = {
  aucune_selection: { t: 'Choisissez au moins une plante.', bg: C.line, fg: C.muted, glyph: '·' },
  contre_indication: { t: 'Contre-indication signalée', bg: C.red, fg: '#FFFFFF', glyph: '!' },
  alertes: { t: 'Alertes à lire avant tout usage', bg: C.sun, fg: C.ink, glyph: '!' },
  incomplet: { t: 'Évaluation incomplète : médicament ou plante non reconnu', bg: C.sun, fg: C.ink, glyph: '?' },
  aucune_alerte_dans_notre_base: { t: 'Aucune alerte dans notre base (ce n’est pas une garantie)', bg: '#DDF0E3', fg: '#14502F', glyph: '✓' },
};

export function Notice() {
  return <Text style={s.notice}>{EDU}</Text>;
}

export function Badge({ severity }: { severity?: string | null }) {
  const color = SEV_COLOR[severity ?? ''] ?? C.green;
  const strong = severity === 'contraindiquee';
  return (
    <View style={[s.badge, strong ? { backgroundColor: color } : { backgroundColor: color + '1F' }]} accessible accessibilityLabel={`Gravité : ${severityLabel(severity)}`}>
      <Text style={[s.badgeTxt, { color: strong ? '#FFFFFF' : color }]}>{severityLabel(severity)}</Text>
    </View>
  );
}

export function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Tap onPress={onPress} style={[s.chip, on && s.chipOn]} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={label}>
      <Text style={on ? s.chipTxtOn : s.chipTxt}>{label}</Text>
    </Tap>
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
      <Source quote={a.quote} url={a.url} source={a.source} reviewed={a.reviewed} />
    </View>
  );
}

/** Verdict + alertes + notes + limites : même rendu partout (Sécurité, Mélange). */
export function SafetyReport({ r }: { r: Assessment }) {
  const v = VERDICT[r.verdict];
  return (
    <View style={{ gap: 12 }}>
      <View style={[s.verdict, { backgroundColor: v.bg }]} accessibilityLiveRegion="polite">
        <View style={[s.glyph, { backgroundColor: v.fg + '26' }]}><Text style={[s.glyphTxt, { color: v.fg }]}>{v.glyph}</Text></View>
        <Text style={[s.verdictTxt, { color: v.fg }]}>{v.t}</Text>
        {r.unknownMeds.length > 0 && <Text style={[s.warn, { color: v.fg }]}>Non reconnu : {r.unknownMeds.join(', ')}. Demandez à votre pharmacien.</Text>}
      </View>
      {r.alerts.map(a => <AlertCard key={a.plantId + a.claimId} a={a} />)}
      {r.notes.map((n, i) => <Text key={i} style={s.muted}>• {n.plantFr} : {n.text}</Text>)}
      <Text style={s.muted}>{r.coverage}</Text>
    </View>
  );
}

const SHADOW = { shadowColor: '#7A5C1E', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 3 } as const;

export const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  pad: { padding: 20, gap: 14, paddingBottom: 40 },
  h1: { color: C.ink, fontFamily: F.title, fontSize: 34, lineHeight: 38, letterSpacing: -1 },
  h2: { color: C.ink, fontFamily: F.heading, fontSize: 20, lineHeight: 25, letterSpacing: -0.3 },
  h3: { color: C.gold, fontFamily: F.bold, fontSize: 12.5, letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 18 },
  latin: { color: C.muted, fontFamily: F.italic, fontSize: 16 },
  body: { color: C.body, fontFamily: F.body, fontSize: 16, lineHeight: 25 },
  quote: { color: C.muted, fontFamily: F.italic, fontSize: 14.5, lineHeight: 22, paddingLeft: 12, borderLeftWidth: 3, borderLeftColor: C.sun },
  muted: { color: C.muted, fontFamily: F.body, fontSize: 13.5, lineHeight: 19 },
  link: { color: C.gold, fontFamily: F.bold, fontSize: 13.5 },
  ok: { color: C.green, fontFamily: F.medium, fontSize: 12.5 },
  warn: { color: C.amber, fontFamily: F.medium, fontSize: 12.5, lineHeight: 18 },
  notice: { color: C.muted, fontFamily: F.body, fontSize: 12, lineHeight: 17 },
  card: { backgroundColor: C.card, borderRadius: 20, padding: 16, gap: 6, ...SHADOW },
  verdict: { borderRadius: 22, padding: 18, gap: 10 },
  verdictTxt: { fontFamily: F.title, fontSize: 24, lineHeight: 29, letterSpacing: -0.5 },
  glyph: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  glyphTxt: { fontFamily: F.title, fontSize: 19 },
  backdrop: { flex: 1, backgroundColor: C.bg },
  sheet: { flex: 1, backgroundColor: C.bg },
  close: { color: C.ink, fontFamily: F.bold, fontSize: 14, padding: 12 },
  claim: { backgroundColor: C.card, borderRadius: 18, padding: 16, gap: 8, ...SHADOW },
  tag: { color: C.gold, fontFamily: F.bold, fontSize: 11.5, letterSpacing: 1.5, textTransform: 'uppercase' },
  badge: { alignSelf: 'flex-start', borderRadius: 8, paddingVertical: 3, paddingHorizontal: 9 },
  badgeTxt: { fontFamily: F.bold, fontSize: 11, letterSpacing: 0.4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, gap: 12 },
  input: { backgroundColor: C.card, color: C.ink, fontFamily: F.medium, borderWidth: 1.5, borderColor: C.line, borderRadius: 16, paddingHorizontal: 14, minWidth: 100, minHeight: 50, textAlign: 'right', fontSize: 16 },
  inputWide: { width: '100%', textAlign: 'left' },
  tabs: { flexDirection: 'row', backgroundColor: C.card, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 8, paddingTop: 8, paddingBottom: 10, ...SHADOW, shadowOffset: { width: 0, height: -4 } },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', minHeight: 48, justifyContent: 'center', borderRadius: 18 },
  tabActive: { backgroundColor: C.soft },
  tabTxt: { color: C.muted, fontFamily: F.medium, fontSize: 12.5 },
  tabOn: { color: C.gold, fontFamily: F.bold },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: C.card, borderWidth: 1.5, borderColor: C.line, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center' },
  chipOn: { backgroundColor: C.ink, borderColor: C.ink },
  chipTxt: { color: C.ink, fontFamily: F.medium, fontSize: 14 },
  chipTxtOn: { color: '#FFFFFF', fontFamily: F.bold, fontSize: 14 },
  brand: { color: C.ink, fontFamily: F.title, fontSize: 27, letterSpacing: -0.8 },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8, gap: 4 },
  index: { flexDirection: 'row', alignItems: 'baseline', gap: 14, paddingVertical: 14 },
  num: { color: C.gold, fontFamily: F.heading, fontSize: 14, width: 26 },
});
