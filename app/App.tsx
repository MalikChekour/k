import React, { useEffect, useState } from 'react';
import { Pressable, StatusBar, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PlantData } from './src/safety';
import { EMPTY_ARMOIRE, toggleFavorite } from './src/armoire';
import type { Armoire as ArmoireData } from './src/armoire';
import { clearArmoire, loadArmoire, saveArmoire } from './src/storage';
import { C, Notice, s } from './src/screens/shared';
import { useAppFonts } from './src/fonts';
import { Library } from './src/screens/Library';
import { PlantSheet } from './src/screens/PlantSheet';
import { Mix } from './src/screens/Mix';
import { Safety } from './src/screens/Safety';
import { Lab } from './src/screens/Lab';
import { Armoire } from './src/screens/Armoire';
import { About } from './src/screens/About';

type Tab = 'lib' | 'mix' | 'secu' | 'armoire' | 'lab';
const TABS: { id: Tab; label: string }[] = [
  { id: 'lib', label: 'Plantes' }, { id: 'mix', label: 'Mélange' }, { id: 'secu', label: 'Sécurité' },
  { id: 'armoire', label: 'Armoire' }, { id: 'lab', label: 'Labo' },
];

function Shell() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('lib');
  const [open, setOpen] = useState<PlantData | null>(null);
  const [armoire, setArmoire] = useState<ArmoireData>(EMPTY_ARMOIRE);
  const [ready, setReady] = useState(false);
  const [writable, setWritable] = useState(false);
  const [about, setAbout] = useState(false);
  const fontsReady = useAppFonts();

  useEffect(() => {
    let alive = true;
    loadArmoire().then(({ data, ok }) => {
      if (!alive) return;
      setArmoire(data);
      setWritable(ok);
      setReady(true);
    });
    return () => { alive = false; };
  }, []);

  // Une écriture n'a lieu que si la lecture a réussi : on ne réécrit jamais ce qu'on n'a pas pu lire.
  const update = (next: ArmoireData) => {
    setArmoire(next);
    if (writable) void saveArmoire(next);
  };
  const wipe = async () => {
    if (await clearArmoire()) setArmoire(EMPTY_ARMOIRE);
  };

  if (!fontsReady) return <View style={s.root} />;
  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={s.header}>
        <View style={s.row}>
          <Text style={s.brand} accessibilityRole="header">Apothecaria<Text style={{ color: C.gold }}>.</Text></Text>
          <Pressable onPress={() => setAbout(true)} accessibilityRole="button" accessibilityLabel="Ouvrir Sources et méthode" style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={s.link}>Sources</Text>
          </Pressable>
        </View>
        <Notice />
      </View>
      <View style={{ flex: 1 }}>
        {tab === 'lib' && <Library onOpen={setOpen} favorites={armoire.favorites} writable={writable && ready} onToggleFav={id => update(toggleFavorite(armoire, id))} />}
        {tab === 'mix' && <Mix profile={armoire.profile} />}
        {tab === 'secu' && <Safety profile={armoire.profile} />}
        {tab === 'armoire' && ready && (
          <Armoire armoire={armoire} writable={writable} onChange={update} onOpen={setOpen} onWipe={wipe} />
        )}
        {tab === 'lab' && <Lab />}
      </View>
      <View style={[s.tabs, { paddingBottom: 10 + insets.bottom }]} accessibilityRole="tablist">
        {TABS.map(k => (
          <Pressable key={k.id} style={[s.tab, tab === k.id && s.tabActive]} onPress={() => setTab(k.id)} accessibilityRole="tab" accessibilityState={{ selected: tab === k.id }} accessibilityLabel={k.label}>
            <Text style={[s.tabTxt, tab === k.id && s.tabOn]}>{k.label}</Text>
          </Pressable>
        ))}
      </View>
      <PlantSheet plant={open} onClose={() => setOpen(null)} favorites={armoire.favorites} writable={writable && ready} onToggleFav={id => update(toggleFavorite(armoire, id))} />
      <About visible={about} onClose={() => setAbout(false)} />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Shell />
    </SafeAreaProvider>
  );
}
