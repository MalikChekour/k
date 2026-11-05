import React from 'react';
import { Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { plants } from '../bundle';
import { sourcesOf } from '../library';
import { C, EDU, s } from './shared';

const METHOD = [
  'Chaque affirmation clinique est copiée mot pour mot depuis une monographie officielle de l’EMA (Comité des médicaments à base de plantes) et contrôlée automatiquement.',
  'Le moteur de sécurité est déterministe : il n’utilise aucune intelligence artificielle et ne conclut jamais « sans danger ». Une absence d’alerte signifie seulement qu’aucune alerte n’existe dans notre base.',
  'Les médicaments reconnus sont ceux de notre liste. Un nom inconnu rend l’évaluation incomplète.',
  'Les associations entre plantes ne sont pas évaluées. L’application ne calcule aucune posologie personnalisée : elle affiche les doses citées par l’EMA et compare une quantité saisie à cette fourchette.',
  'Les affirmations ne sont pas encore relues par un professionnel de santé : chaque fiche l’indique.',
  'Vos données (armoire, profil) restent sur ce téléphone, sans chiffrement particulier, et ne sont jamais envoyées.',
];

export function About({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const sources = sourcesOf(plants);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer Sources et méthode"><Text style={s.close}>Fermer ✕</Text></Pressable>
          <ScrollView>
            <Text style={s.h1} accessibilityRole="header">Sources et méthode</Text>
            <Text style={s.notice}>{EDU}</Text>
            <Text style={s.h3}>Méthode</Text>
            {METHOD.map((m, i) => <Text key={i} style={s.muted}>• {m}</Text>)}
            <Text style={s.h3}>Documents officiels utilisés ({sources.length})</Text>
            {sources.map(src => (
              <View key={src.url} style={[s.claim, { borderLeftColor: C.gold }]}>
                <Text style={s.body}>{src.title}</Text>
                <Text style={s.muted}>Plante(s) : {src.plants.join(', ')}</Text>
                <Pressable onPress={() => Linking.openURL(src.url)} accessibilityRole="link" accessibilityLabel={`Ouvrir le document ${src.title}`}>
                  <Text style={s.link}>Ouvrir le document officiel</Text>
                </Pressable>
              </View>
            ))}
            <Text style={s.muted}>Hors périmètre pour l’instant : images, médecines traditionnelles chinoise et ayurvédique (aucune source vérifiée dans ce projet), et les plantes sans monographie EMA intégrée (une monographie = une plante, ajoutée par lots vérifiés).</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
