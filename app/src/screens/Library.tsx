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
      <TextInput
        style={[s.input, s.inputWide]}
        value={q}
        onChangeText={setQ}
        placeholder="Rechercher (nom français, nom latin)"
        placeholderTextColor={C.muted}
        accessibilityLabel="Rechercher une plante"
        autoCorrect={false}
      />
      <Text style={s.tag}>RUBRIQUE</Text>
      <View style={s.wrap}>
        <Chip label="Toutes" on={rubric === null} onPress={() => setRubric(null)} />
        {RUBRICS.map(r => (
          <Chip key={r.id} label={r.fr} on={rubric === r.id} onPress={() => setRubric(rubric === r.id ? null : r.id)} />
        ))}
      </View>
      {list.length === 0 && <Text style={s.muted}>Aucune plante ne correspond à ces critères.</Text>}
      {list.map(p => (
        <View key={p.id} style={s.card}>
          <Pressable onPress={() => onOpen(p)} accessibilityRole="button" accessibilityLabel={`Ouvrir la fiche ${p.fr}`}>
            <Text style={s.h2}>{p.fr}</Text>
            <Text style={s.latin}>{p.latin} · {p.part}</Text>
            <Text style={s.muted}>{p.claims.length} affirmation(s) sourcée(s)</Text>
          </Pressable>
          <Chip
            label={favorites.includes(p.id) ? `Dans mon armoire : ${p.fr}` : `Ajouter ${p.fr} à mon armoire`}
            on={favorites.includes(p.id)}
            onPress={() => writable && onToggleFav(p.id)}
          />
        </View>
      ))}
    </ScrollView>
  );
}
