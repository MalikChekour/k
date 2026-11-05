import React from 'react';
import { Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import type { Claim, PlantData } from '../safety';
import { POSOLOGY_NOTE, RUBRICS, groupClaims } from '../library';
import { Badge, C, Chip, s } from './shared';

const EMPTY_NOTE: Record<string, string> = {
  interactions: 'Aucune interaction renseignée dans notre base pour cette plante. Ce n’est pas une preuve d’absence d’interaction.',
  grossesse: 'Rien renseigné dans notre base. Demandez l’avis d’un professionnel.',
};

function ClaimView({ c }: { c: Claim }) {
  return (
    <View style={[s.claim, { borderLeftColor: C.green }]}>
      {c.severity ? <Badge severity={c.severity} /> : null}
      {c.population ? <Text style={s.muted}>Public : {c.population}</Text> : null}
      <Text style={s.body}>{c.statement}</Text>
      <Text style={s.muted}>« {c.quote} »</Text>
      <Pressable onPress={() => Linking.openURL(c.url)} accessibilityRole="link" accessibilityLabel={`Source : ${c.source}`}>
        <Text style={s.link}>{c.source}</Text>
      </Pressable>
      <Text style={c.reviewed_by ? s.ok : s.warn}>
        {c.reviewed_by ? `Relu par ${c.reviewed_by}` : 'Source vérifiée automatiquement : pas encore relue par un professionnel'}
      </Text>
    </View>
  );
}

/** Fiche plante : affirmations regroupées par rubrique. Les rubriques vides le disent explicitement. */
export function PlantSheet({ plant, onClose, favorites, writable, onToggleFav }: {
  plant: PlantData | null; onClose: () => void; favorites: string[]; writable: boolean; onToggleFav: (id: string) => void;
}) {
  const groups = plant ? groupClaims(plant.claims) : null;
  return (
    <Modal visible={!!plant} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer la fiche"><Text style={s.close}>Fermer ✕</Text></Pressable>
          {plant && groups && (
            <ScrollView>
              <Text style={s.h1} accessibilityRole="header">{plant.fr}</Text>
              <Text style={s.latin}>{plant.latin} · {plant.part}</Text>
              <View style={{ marginTop: 8 }}>
                <Chip
                  label={favorites.includes(plant.id) ? `Dans mon armoire : ${plant.fr}` : `Ajouter ${plant.fr} à mon armoire`}
                  on={favorites.includes(plant.id)}
                  onPress={() => writable && onToggleFav(plant.id)}
                />
              </View>
              {RUBRICS.map(r => (
                <View key={r.id} style={{ gap: 6, marginTop: 12 }}>
                  <Text style={s.h3} accessibilityRole="header">{r.fr}</Text>
                  {r.id === 'posologie' && groups[r.id].length > 0 && <Text style={s.warn}>{POSOLOGY_NOTE}</Text>}
                  {groups[r.id].length === 0
                    ? <Text style={s.muted}>{EMPTY_NOTE[r.id] ?? 'Rien de renseigné dans notre base pour cette rubrique.'}</Text>
                    : groups[r.id].map(c => <ClaimView key={c.id} c={c} />)}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
