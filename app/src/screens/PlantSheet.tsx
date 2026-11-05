import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import type { Claim, PlantData } from '../safety';
import { POSOLOGY_NOTE, RUBRICS, groupClaims } from '../library';
import { styleFor } from '../plantStyle';
import { Bloom } from './Bloom';
import { Badge, C, Chip, Source, s } from './shared';

const EMPTY_NOTE: Record<string, string> = {
  interactions: 'Aucune interaction renseignée dans notre base pour cette plante. Ce n’est pas une preuve d’absence d’interaction.',
  grossesse: 'Rien renseigné dans notre base. Demandez l’avis d’un professionnel.',
};

function ClaimView({ c }: { c: Claim }) {
  return (
    <View style={s.claim}>
      {c.severity ? <Badge severity={c.severity} /> : null}
      {c.population ? <Text style={s.tag}>{c.population}</Text> : null}
      <Text style={s.body}>{c.statement}</Text>
      <Source quote={c.quote} url={c.url} source={c.source} reviewed={!!c.reviewed_by} />
    </View>
  );
}

/** Fiche plante : en-tête coloré, puis affirmations regroupées par rubrique. Les rubriques vides le disent explicitement. */
export function PlantSheet({ plant, onClose, favorites, writable, onToggleFav }: {
  plant: PlantData | null; onClose: () => void; favorites: string[]; writable: boolean; onToggleFav: (id: string) => void;
}) {
  const groups = plant ? groupClaims(plant.claims) : null;
  const st = plant ? styleFor(plant) : null;
  return (
    <Modal visible={!!plant} animationType="slide" onRequestClose={onClose}>
      <View style={s.sheet}>
        {plant && groups && st && (
          <ScrollView contentContainerStyle={{ paddingBottom: 56 }}>
            <View style={{ backgroundColor: st.tint, paddingTop: 40, paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 34, borderBottomRightRadius: 34 }}>
              <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer la fiche" style={{ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' }}>
                <Text style={s.close}>← Retour</Text>
              </Pressable>
              <View style={{ alignItems: 'center', marginVertical: 6 }}><Bloom st={st} size={132} /></View>
              <Text style={s.tag}>{plant.part}</Text>
              <Text style={s.h1} accessibilityRole="header">{plant.fr}</Text>
              <Text style={s.latin}>{plant.latin}</Text>
              <View style={{ marginTop: 14, alignSelf: 'flex-start' }}>
                <Chip
                  label={favorites.includes(plant.id) ? 'Dans mon armoire ✓' : '+ Ajouter à mon armoire'}
                  on={favorites.includes(plant.id)}
                  onPress={() => writable && onToggleFav(plant.id)}
                />
              </View>
            </View>
            <View style={{ padding: 20, gap: 12 }}>
              {RUBRICS.map(r => (
                <View key={r.id} style={{ gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: st.color }} />
                    <Text style={[s.h2, { fontSize: 20 }]} accessibilityRole="header">{r.fr}</Text>
                  </View>
                  {r.id === 'posologie' && groups[r.id].length > 0 && (
                    <View style={{ backgroundColor: C.soft, borderRadius: 16, padding: 12 }}><Text style={s.warn}>{POSOLOGY_NOTE}</Text></View>
                  )}
                  {groups[r.id].length === 0
                    ? <Text style={s.muted}>{EMPTY_NOTE[r.id] ?? 'Rien de renseigné dans notre base pour cette rubrique.'}</Text>
                    : groups[r.id].map(c => <ClaimView key={c.id} c={c} />)}
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}
