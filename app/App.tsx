import React, { useState } from 'react';
import { Pressable, SafeAreaView, StatusBar, Text, View } from 'react-native';
import type { PlantData, Profile } from './src/safety';
import { Notice, s } from './src/screens/shared';
import { Library } from './src/screens/Library';
import { PlantSheet } from './src/screens/PlantSheet';
import { Mix } from './src/screens/Mix';
import { Safety } from './src/screens/Safety';
import { Lab } from './src/screens/Lab';

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
        <Text style={s.brand} accessibilityRole="header">Apothecaria</Text>
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
      <PlantSheet plant={open} onClose={() => setOpen(null)} />
    </SafeAreaView>
  );
}
