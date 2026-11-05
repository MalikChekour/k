import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import type { PlantData } from '../safety';
import { plants } from '../bundle';
import { RUBRICS, filterPlants } from '../library';
import type { Rubric } from '../library';
import { styleFor } from '../plantStyle';
import { Bloom } from './Bloom';
import { C, Chip, Reveal, Tap, s } from './shared';

/** Liste des plantes : une tuile colorée par plante, recherche (sans accents ni casse) et filtre par rubrique. */
export function Library({ onOpen, favorites, onToggleFav, writable }: {
  onOpen: (p: PlantData) => void; favorites: string[]; onToggleFav: (id: string) => void; writable: boolean;
}) {
  const [q, setQ] = useState('');
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const list = filterPlants(plants, q, rubric);
  return (
    <ScrollView contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <View style={{ gap: 4, marginTop: 4 }}>
        <Text style={s.h1} accessibilityRole="header">Que cherchez-vous{'\n'}aujourd’hui ?</Text>
        <Text style={s.muted}>{plants.length} plantes, chacune appuyée sur un extrait exact d’un document officiel.</Text>
      </View>
      <TextInput
        style={[s.input, s.inputWide]}
        value={q}
        onChangeText={setQ}
        placeholder="Camomille, sommeil, digestion…"
        placeholderTextColor={C.muted}
        accessibilityLabel="Rechercher une plante"
        autoCorrect={false}
      />
      <View style={s.wrap}>
        <Chip label="Toutes" on={rubric === null} onPress={() => setRubric(null)} />
        {RUBRICS.map(r => (
          <Chip key={r.id} label={r.fr} on={rubric === r.id} onPress={() => setRubric(rubric === r.id ? null : r.id)} />
        ))}
      </View>
      {list.length === 0 && <Text style={s.muted}>Aucune plante ne correspond à ces critères.</Text>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {list.map((p, i) => {
          const st = styleFor(p);
          const fav = favorites.includes(p.id);
          return (
            <View key={p.id} style={{ width: '47.5%', flexGrow: 1 }}>
              <Reveal i={i}>
                <Tap onPress={() => onOpen(p)} accessibilityRole="button" accessibilityLabel={`Ouvrir la fiche ${p.fr}`}
                  style={{ backgroundColor: st.tint, borderRadius: 24, padding: 14, minHeight: 190, justifyContent: 'space-between' }}>
                  <View style={{ alignItems: 'center', paddingTop: 6 }}><Bloom st={st} size={84} /></View>
                  <View style={{ gap: 2 }}>
                    <Text style={s.h2} numberOfLines={2}>{p.fr}</Text>
                    <Text style={[s.latin, { fontSize: 13.5 }]} numberOfLines={1}>{p.latin}</Text>
                  </View>
                </Tap>
                <Pressable onPress={() => writable && onToggleFav(p.id)} hitSlop={8} accessibilityRole="checkbox" accessibilityState={{ checked: fav }}
                  accessibilityLabel={fav ? `Retirer ${p.fr} de mon armoire` : `Ajouter ${p.fr} à mon armoire`}
                  style={{ position: 'absolute', top: 8, right: 8, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: fav ? C.gold : '#FFFFFFCC', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 17, fontWeight: '800', color: fav ? '#FFFFFF' : C.ink }}>{fav ? '✓' : '+'}</Text>
                  </View>
                </Pressable>
              </Reveal>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
