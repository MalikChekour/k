import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import type { PlantData } from '../safety';
import { plants } from '../bundle';
import { RUBRICS, filterPlants } from '../library';
import type { Rubric } from '../library';
import { C, Chip, s } from './shared';

/** Liste des plantes : recherche (sans accents ni casse) et filtre par rubrique de fiche. */
export function Library({ onOpen, favorites, onToggleFav, writable }: {
  onOpen: (p: PlantData) => void; favorites: string[]; onToggleFav: (id: string) => void; writable: boolean;
}) {
  const [q, setQ] = useState('');
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const list = filterPlants(plants, q, rubric);
  return (
    <ScrollView contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <View style={{ gap: 4 }}>
        <Text style={s.tag}>Apothecaria · Herbier</Text>
        <Text style={s.h1} accessibilityRole="header">Plantes médicinales</Text>
        <Text style={s.muted}>{plants.length} plantes. Chaque affirmation cite un extrait exact d’un document officiel.</Text>
      </View>
      <TextInput
        style={[s.input, s.inputWide]}
        value={q}
        onChangeText={setQ}
        placeholder="Rechercher une plante…"
        placeholderTextColor={C.muted}
        accessibilityLabel="Rechercher une plante"
        autoCorrect={false}
      />
      <Text style={s.tag}>Filtrer par rubrique</Text>
      <View style={s.wrap}>
        <Chip label="Toutes" on={rubric === null} onPress={() => setRubric(null)} />
        {RUBRICS.map(r => (
          <Chip key={r.id} label={r.fr} on={rubric === r.id} onPress={() => setRubric(rubric === r.id ? null : r.id)} />
        ))}
      </View>
      {list.length === 0 && <Text style={s.muted}>Aucune plante ne correspond à ces critères.</Text>}
      <View style={{ borderTopWidth: 1, borderTopColor: C.ink }}>
        {list.map((p, i) => {
          const fav = favorites.includes(p.id);
          return (
            <Pressable key={p.id} onPress={() => onOpen(p)} style={s.index} accessibilityRole="button"
              accessibilityLabel={`Ouvrir la fiche ${p.fr}`}>
              <Text style={s.num}>{String(i + 1).padStart(2, '0')}</Text>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.h2}>{p.fr}</Text>
                <Text style={s.latin}>{p.latin}</Text>
                <Text style={s.muted}>{p.part} · {p.claims.length} affirmations sourcées</Text>
              </View>
              <Pressable onPress={() => writable && onToggleFav(p.id)} hitSlop={10} accessibilityRole="checkbox" accessibilityState={{ checked: fav }}
                accessibilityLabel={fav ? `Retirer ${p.fr} de mon armoire` : `Ajouter ${p.fr} à mon armoire`} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={[s.tag, { color: fav ? C.gold : C.muted }]}>{fav ? 'En armoire' : '+ Armoire'}</Text>
              </Pressable>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
