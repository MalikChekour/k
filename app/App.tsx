import React, { useState } from 'react';
import { Linking, Modal, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import bundle from './src/data/bundle.json';
import { tincture } from './src/tincture';
import type { Plant } from './src/types';

const plants = bundle.plants as Plant[];
const SEV: Record<string, string> = {
  contraindiquee: '#E5484D', majeure: '#E5484D', moderee: '#F5A524', precaution: '#F5A524', aucune_rapportee: '#8B8B8B',
};

function Disclaimer() {
  return (
    <Text style={s.disc}>
      Information éducative, non médicale. Ne remplace pas l’avis d’un pharmacien ou d’un médecin. Contenu en cours de relecture professionnelle.
    </Text>
  );
}

function Library({ onOpen }: { onOpen: (p: Plant) => void }) {
  return (
    <ScrollView contentContainerStyle={s.pad}>
      <Disclaimer />
      {plants.map(p => (
        <Pressable key={p.id} style={s.card} onPress={() => onOpen(p)} accessibilityRole="button" accessibilityLabel={`Fiche ${p.fr}`}>
          <Text style={s.h2}>{p.fr}</Text>
          <Text style={s.latin}>{p.latin} · {p.part}</Text>
          <Text style={s.muted}>{p.claims.length} affirmation(s) sourcée(s)</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function Sheet({ plant, onClose }: { plant: Plant | null; onClose: () => void }) {
  return (
    <Modal visible={!!plant} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <Pressable onPress={onClose} accessibilityLabel="Fermer"><Text style={s.close}>Fermer ✕</Text></Pressable>
          {plant && (
            <ScrollView>
              <Text style={s.h1}>{plant.fr}</Text>
              <Text style={s.latin}>{plant.latin}</Text>
              {plant.claims.map(c => (
                <View key={c.id} style={[s.claim, { borderLeftColor: SEV[c.severity ?? ''] ?? '#52B788' }]}>
                  <Text style={s.tag}>
                    {c.type.toUpperCase()}{c.severity ? ` · ${c.severity}` : ''}{c.population ? ` · ${c.population}` : ''}
                  </Text>
                  <Text style={s.body}>{c.statement}</Text>
                  <Text style={s.muted}>« {c.quote} »</Text>
                  <Pressable onPress={() => Linking.openURL(c.url)}><Text style={s.link}>{c.source}</Text></Pressable>
                  <Text style={c.reviewed_by ? s.ok : s.warn}>
                    {c.reviewed_by ? `Relu par ${c.reviewed_by}` : 'Source vérifiée automatiquement — pas encore relu par un professionnel'}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function Lab() {
  const [g, setG] = useState('50');
  const [r, setR] = useState('5');
  const [t, setT] = useState('45');
  const out = tincture(parseFloat(g.replace(',', '.')), parseFloat(r.replace(',', '.')), parseFloat(t.replace(',', '.')));
  const field = (label: string, v: string, set: (x: string) => void) => (
    <View style={s.row}>
      <Text style={s.body}>{label}</Text>
      <TextInput style={s.input} value={v} onChangeText={set} keyboardType="decimal-pad" accessibilityLabel={label} />
    </View>
  );
  return (
    <ScrollView contentContainerStyle={s.pad}>
      <Text style={s.h1}>Teinture mère</Text>
      {field('Plante sèche (g)', g, setG)}
      {field('Ratio 1 : N', r, setR)}
      {field('Alcool final (% vol)', t, setT)}
      <View style={s.card}>
        {out ? (
          <>
            <Text style={s.h2}>Solvant total : {out.solventMl} mL</Text>
            <Text style={s.body}>Alcool 96 % : {out.alcoholMl} mL</Text>
            <Text style={s.body}>Eau : {out.waterMl} mL</Text>
          </>
        ) : (
          <Text style={s.warn}>Valeurs invalides (alcool final ≤ 96 %).</Text>
        )}
      </View>
      <Text style={s.muted}>
        Calcul de dilution théorique, contraction de volume ignorée. Le ratio et la force d’extraction dépendent de la monographie de chaque plante.
      </Text>
    </ScrollView>
  );
}

export default function App() {
  const [tab, setTab] = useState<'lib' | 'lab'>('lib');
  const [open, setOpen] = useState<Plant | null>(null);
  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" />
      <Text style={s.brand}>Apothecaria</Text>
      <View style={{ flex: 1 }}>{tab === 'lib' ? <Library onOpen={setOpen} /> : <Lab />}</View>
      <View style={s.tabs}>
        {(['lib', 'lab'] as const).map(k => (
          <Pressable key={k} style={s.tab} onPress={() => setTab(k)} accessibilityRole="tab" accessibilityState={{ selected: tab === k }}>
            <Text style={[s.tabTxt, tab === k && s.tabOn]}>{k === 'lib' ? 'Plantes' : 'Laboratoire'}</Text>
          </Pressable>
        ))}
      </View>
      <Sheet plant={open} onClose={() => setOpen(null)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060B08' },
  pad: { padding: 16, gap: 12 },
  brand: { color: '#D4AF37', fontSize: 22, fontWeight: '600', padding: 16, paddingBottom: 4 },
  h1: { color: '#F2F5F3', fontSize: 24, fontWeight: '600' },
  h2: { color: '#F2F5F3', fontSize: 18, fontWeight: '600' },
  latin: { color: '#52B788', fontStyle: 'italic' },
  body: { color: '#E4E9E6', fontSize: 15, lineHeight: 21 },
  muted: { color: '#9AA5A0', fontSize: 13, lineHeight: 18 },
  link: { color: '#52B788', textDecorationLine: 'underline', fontSize: 13 },
  ok: { color: '#52B788', fontSize: 12 },
  warn: { color: '#F5A524', fontSize: 12 },
  disc: { color: '#9AA5A0', fontSize: 12 },
  card: { backgroundColor: '#0E1712', borderRadius: 14, padding: 16, gap: 4 },
  backdrop: { flex: 1, backgroundColor: '#000A', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#0E1712', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '88%' },
  close: { color: '#9AA5A0', alignSelf: 'flex-end', padding: 8 },
  claim: { borderLeftWidth: 3, paddingLeft: 12, marginTop: 16, gap: 4 },
  tag: { color: '#D4AF37', fontSize: 11, letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  input: { backgroundColor: '#0E1712', color: '#F2F5F3', borderRadius: 10, padding: 10, width: 100, textAlign: 'right' },
  tabs: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#1B2A21' },
  tab: { flex: 1, padding: 16, alignItems: 'center' },
  tabTxt: { color: '#9AA5A0' },
  tabOn: { color: '#52B788', fontWeight: '600' },
});
