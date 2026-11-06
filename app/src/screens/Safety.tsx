import React, { useRef, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { assess, normalize } from '../safety';
import type { Profile } from '../safety';
import { bundle, plants } from '../bundle';
import { C, Chip, SafetyReport, VerdictBar, s } from './shared';
import { ProfileSummary } from './ProfileEditor';

/**
 * Vérificateur : le constat reste COLLÉ en haut de l'écran (toucher = revenir au détail).
 * Ordre de lecture : constat, ma sélection, détail des alertes, puis la liste pour ajouter des plantes.
 */
export function Safety({ profile, seed }: { profile: Profile; seed?: string[] }) {
  const [sel, setSel] = useState<string[]>(seed ?? []);
  const [q, setQ] = useState('');
  const ref = useRef<ScrollView>(null);
  const r = assess(bundle, sel, profile);
  const toggle = (id: string) => setSel(sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]);
  const nq = normalize(q);
  const pool = plants.filter(p => !sel.includes(p.id) && (nq === '' || normalize(p.fr + ' ' + p.latin).includes(nq)));
  const chosen = sel.map(id => plants.find(p => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p);
  return (
    <ScrollView ref={ref} contentContainerStyle={s.pad} stickyHeaderIndices={[1]} keyboardShouldPersistTaps="handled">
      <Text style={s.h1} accessibilityRole="header">Vérificateur de sécurité</Text>
      <View style={{ backgroundColor: C.bg, paddingBottom: 4 }}>
        {sel.length > 0 && <VerdictBar r={r} count={sel.length} onPress={() => ref.current?.scrollTo({ y: 0, animated: true })} />}
      </View>
      <ProfileSummary profile={profile} />
      {sel.length === 0 ? (
        <Text style={s.muted}>Choisissez une ou plusieurs plantes ci-dessous : le constat s’affiche en haut de l’écran et reste visible pendant que vous faites défiler.</Text>
      ) : (
        <>
          <Text style={s.tag}>Ma sélection (toucher pour retirer)</Text>
          <View style={s.wrap}>
            {chosen.map(p => <Chip key={p.id} label={p.fr} on onPress={() => toggle(p.id)} />)}
          </View>
          <SafetyReport r={r} />
        </>
      )}
      <Text style={s.tag}>Ajouter une plante</Text>
      <TextInput style={[s.input, s.inputWide]} value={q} onChangeText={setQ} placeholder="Rechercher une plante…" placeholderTextColor={C.muted}
        accessibilityLabel="Rechercher une plante à vérifier" autoCorrect={false} />
      <View style={s.wrap}>
        {pool.map(p => <Chip key={p.id} label={p.fr} on={false} onPress={() => toggle(p.id)} />)}
      </View>
      {pool.length === 0 && <Text style={s.muted}>Aucune plante ne correspond.</Text>}
    </ScrollView>
  );
}
