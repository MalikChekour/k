import React from 'react';
import { Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Claim, PlantData } from '../safety';
import { POSOLOGY_NOTE, RUBRICS, groupClaims } from '../library';
import { bundle } from '../bundle';
import { overviewOf } from '../overview';
import credits from '../data/credits.json';
import { styleFor } from '../plantStyle';
import { PLANT_PHOTOS } from '../plantPhotos';
import { Bloom } from './Bloom';
import { Badge, C, Chip, Source, s } from './shared';

/** Pictogrammes sobres, uniquement dans la fiche plante. */
const RUBRIC_ICON: Record<string, string> = { indication: '🎯', posologie: '⚖️', precautions: '⚠️', interactions: '💊', grossesse: '🤰' };

function Line({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <Text style={{ fontSize: 18, width: 26, textAlign: 'center' }} accessibilityElementsHidden importantForAccessibility="no">{icon}</Text>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.tag}>{label}</Text>
        <Text style={s.body}>{children}</Text>
      </View>
    </View>
  );
}

/** « À retenir » : synthèse calculée à partir des seules affirmations vérifiées de la fiche. */
function Overview({ plant }: { plant: PlantData }) {
  const o = overviewOf(plant, bundle);
  const cr = (credits as Record<string, { author?: string; license?: string }>)[plant.id];
  return (
    <View style={{ marginHorizontal: 20, marginTop: 16, backgroundColor: C.soft, borderRadius: 20, padding: 16, gap: 12 }}>
      <Text style={s.h2} accessibilityRole="header">À retenir</Text>
      <Line icon="🌿" label="Partie utilisée">{o.part}</Line>
      {o.usages.length > 0 && <Line icon="🎯" label="Proposée pour">{o.usages.join(' · ')}</Line>}
      {o.infusion && <Line icon="🍵" label="Préparation décrite par l’EMA">{o.infusion.label}</Line>}
      {o.avoid.length > 0 && <Line icon="⛔" label="À ne pas utiliser si">{o.avoid.join(' · ')}</Line>}
      {o.caution.length > 0 && <Line icon="⚠️" label="Prudence si">{o.caution.join(' · ')}</Line>}
      {o.medClasses.length > 0 && <Line icon="💊" label="Médicaments à signaler à votre pharmacien">{o.medClasses.join(' · ')}</Line>}
      {o.aliases.length > 0 && <Line icon="🏷️" label="Autres noms">{o.aliases.join(', ')}</Line>}
      <Line icon="📚" label="Base documentaire">{o.claimCount} affirmations vérifiées, {o.sourceCount} document{o.sourceCount > 1 ? 's' : ''} officiel{o.sourceCount > 1 ? 's' : ''}</Line>
      {cr && <Line icon="📷" label="Photo">{[cr.author, cr.license].filter(Boolean).join(' · ')}</Line>}
    </View>
  );
}

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

/** Fiche plante : grande photo (ou motif dessiné), puis affirmations regroupées par rubrique. Les rubriques vides le disent explicitement. */
export function PlantSheet({ plant, onClose, favorites, writable, onToggleFav }: {
  plant: PlantData | null; onClose: () => void; favorites: string[]; writable: boolean; onToggleFav: (id: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const groups = plant ? groupClaims(plant.claims) : null;
  const st = plant ? styleFor(plant) : null;
  const photo = plant ? PLANT_PHOTOS[plant.id] : undefined;
  return (
    <Modal visible={!!plant} animationType="slide" onRequestClose={onClose}>
      <View style={s.sheet}>
        {plant && groups && st && (
          <ScrollView contentContainerStyle={{ paddingBottom: 56 + insets.bottom }}>
            <View style={{ height: photo ? 340 : 260, backgroundColor: st.tint, overflow: 'hidden' }}>
              {photo
                ? <Image source={photo} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel={`Photo : ${plant.fr}`} />
                : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 30 }}><Bloom st={st} size={140} /></View>}
              <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer la fiche"
                style={{ position: 'absolute', top: insets.top + 8, left: 16, minHeight: 44, justifyContent: 'center', backgroundColor: '#FFFFFFE6', borderRadius: 22, paddingHorizontal: 16 }}>
                <Text style={[s.close, { padding: 0 }]}>← Retour</Text>
              </Pressable>
            </View>
            <View style={{ marginTop: -30, backgroundColor: C.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 20, paddingTop: 24, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: st.color }} />
                <Text style={s.tag}>{plant.part}</Text>
              </View>
              <Text style={s.h1} accessibilityRole="header">{plant.fr}</Text>
              <Text style={s.latin}>{plant.latin}</Text>
              {(bundle.groups ?? []).filter(g => g.plants.includes(plant.id)).map(g => (
                <View key={g.id} style={{ marginTop: 10, backgroundColor: C.soft, borderRadius: 16, padding: 12, gap: 4 }}>
                  <Text style={s.tag}>Famille : {g.fr}</Text>
                  <Text style={s.warn}>{g.note}</Text>
                </View>
              ))}
              <View style={{ marginTop: 12, alignSelf: 'flex-start' }}>
                <Chip
                  label={favorites.includes(plant.id) ? 'Dans mon armoire ✓' : '+ Ajouter à mon armoire'}
                  on={favorites.includes(plant.id)}
                  onPress={() => writable && onToggleFav(plant.id)}
                />
              </View>
            </View>
            <Overview plant={plant} />
            <View style={{ padding: 20, gap: 12 }}>
              {RUBRICS.map(r => (
                <View key={r.id} style={{ gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: st.color }} />
                    <Text style={s.h2} accessibilityRole="header">{RUBRIC_ICON[r.id] ? RUBRIC_ICON[r.id] + ' ' : ''}{r.fr}</Text>
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
