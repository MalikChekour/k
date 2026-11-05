import React, { useState } from 'react';
import { Linking, Modal, Pressable, SafeAreaView, ScrollView, StatusBar, Text, TextInput, View } from 'react-native';
import { tincture } from './src/tincture';
import type { Profile } from './src/safety';
import type { PlantData } from './src/safety';
import { plants } from './src/bundle';
import { Badge, C, Notice, s } from './src/screens/shared';
import { Mix } from './src/screens/Mix';
import { Safety } from './src/screens/Safety';

function Library({ onOpen }: { onOpen: (p: PlantData) => void }) {
  return (
    <ScrollView contentContainerStyle={s.pad}>
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

function Sheet({ plant, onClose }: { plant: PlantData | null; onClose: () => void }) {
  return (
    <Modal visible={!!plant} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer la fiche"><Text style={s.close}>Fermer ✕</Text></Pressable>
          {plant && (
            <ScrollView>
              <Text style={s.h1}>{plant.fr}</Text>
              <Text style={s.latin}>{plant.latin}</Text>
              {plant.claims.map(c => (
                <View key={c.id} style={[s.claim, { borderLeftColor: C.green }]}>
                  <Text style={s.tag}>{c.type.toUpperCase()}</Text>
                  {c.severity ? <Badge severity={c.severity} /> : null}
                  <Text style={s.body}>{c.statement}</Text>
                  <Text style={s.muted}>« {c.quote} »</Text>
                  <Pressable onPress={() => Linking.openURL(c.url)} accessibilityRole="link" accessibilityLabel={`Source : ${c.source}`}>
                    <Text style={s.link}>{c.source}</Text>
                  </Pressable>
                  <Text style={c.reviewed_by ? s.ok : s.warn}>
                    {c.reviewed_by ? `Relu par ${c.reviewed_by}` : 'Source vérifiée automatiquement : pas encore relue par un professionnel'}
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

type Tab = 'lib' | 'mix' | 'secu' | 'lab';
const TABS: { id: Tab; label: string }[] = [
  { id: 'lib', label: 'Plantes' }, { id: 'mix', label: 'Mélange' }, { id: 'secu', label: 'Sécurité' }, { id: 'lab', label: 'Laboratoire' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('lib');
  const [open, setOpen] = useState<PlantData | null>(null);
  const [profile, setProfile] = useState<Profile>({ pregnant: false, lactating: false, ageYears: null, flags: [], meds: [] });
  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" />
      <View style={s.header}>
        <Text style={s.brand}>Apothecaria</Text>
        <Notice />
      </View>
      <View style={{ flex: 1 }}>
        {tab === 'lib' && <Library onOpen={setOpen} />}
        {tab === 'mix' && <Mix profile={profile} />}
        {tab === 'secu' && <Safety profile={profile} onProfile={setProfile} />}
        {tab === 'lab' && <Lab />}
      </View>
      <View style={s.tabs} accessibilityRole="tablist">
        {TABS.map(k => (
          <Pressable key={k.id} style={s.tab} onPress={() => setTab(k.id)} accessibilityRole="tab" accessibilityState={{ selected: tab === k.id }} accessibilityLabel={k.label}>
            <Text style={[s.tabTxt, tab === k.id && s.tabOn]}>{k.label}</Text>
          </Pressable>
        ))}
      </View>
      <Sheet plant={open} onClose={() => setOpen(null)} />
    </SafeAreaView>
  );
}
