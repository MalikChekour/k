import React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import type { PlantData, Profile } from '../safety';
import { plants } from '../bundle';
import type { Armoire as ArmoireData } from '../armoire';
import { F } from '../fonts';
import { C, Notice, s } from './shared';
import { ProfileEditor } from './ProfileEditor';

type Props = {
  armoire: ArmoireData;
  writable: boolean;
  onChange: (next: ArmoireData) => void;
  onOpen: (p: PlantData) => void;
  onWipe: () => void;
  onCheck: (ids: string[]) => void;
};

/** Mon armoire : plantes favorites et profil de santé, tous deux sur ce téléphone uniquement. */
export function Armoire({ armoire, writable, onChange, onOpen, onWipe, onCheck }: Props) {
  const favs = plants.filter(p => armoire.favorites.includes(p.id));
  const setProfile = (profile: Profile) => onChange({ ...armoire, profile });
  const removeFav = (id: string) => onChange({ ...armoire, favorites: armoire.favorites.filter(x => x !== id) });
  const wipe = () => Alert.alert(
    'Effacer mes données ?',
    'Les plantes favorites et le profil seront supprimés de ce téléphone.',
    [{ text: 'Annuler', style: 'cancel' }, { text: 'Effacer', style: 'destructive', onPress: onWipe }],
  );
  return (
    <ScrollView contentContainerStyle={s.pad}>
      <Text style={s.h1} accessibilityRole="header">Mon armoire</Text>
      <Text style={s.muted}>
        Vos données restent sur ce téléphone. Le stockage local n’est PAS chiffré : évitez de l’utiliser sur un appareil partagé.
      </Text>
      {!writable && <Text style={s.warn}>Lecture impossible : rien ne sera enregistré tant que l’app n’a pas pu lire votre armoire.</Text>}

      <Text style={s.tag}>PLANTES FAVORITES</Text>
      {favs.length === 0 && <Text style={s.muted}>Aucune favorite. Ajoutez-en depuis une fiche plante.</Text>}
      {favs.length > 0 && (
        <Pressable onPress={() => onCheck(favs.map(p => p.id))} accessibilityRole="button" accessibilityLabel="Vérifier la sécurité de mes plantes favorites"
          style={{ backgroundColor: C.ink, borderRadius: 24, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontFamily: F.bold }}>Vérifier la sécurité de mes {favs.length} favorite{favs.length > 1 ? 's' : ''}</Text>
        </Pressable>
      )}
      {favs.map(p => (
        <View key={p.id} style={s.card}>
          <Pressable onPress={() => onOpen(p)} accessibilityRole="button" accessibilityLabel={`Ouvrir la fiche ${p.fr}`}>
            <Text style={s.h2}>{p.fr}</Text>
            <Text style={s.latin}>{p.latin}</Text>
          </Pressable>
          <Pressable onPress={() => removeFav(p.id)} disabled={!writable} accessibilityRole="button" accessibilityLabel={`Retirer ${p.fr} des favoris`} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={s.link}>Retirer des favoris</Text>
          </Pressable>
        </View>
      ))}

      <Text style={s.tag}>PROFIL DE SANTÉ (utilisé par Sécurité et Mélange)</Text>
      <View pointerEvents={writable ? 'auto' : 'none'} style={{ opacity: writable ? 1 : 0.5 }}>
        <ProfileEditor profile={armoire.profile} onChange={setProfile} />
      </View>

      <Pressable onPress={wipe} disabled={!writable} accessibilityRole="button" accessibilityLabel="Effacer toutes mes données de ce téléphone" style={{ minHeight: 44, justifyContent: 'center', marginTop: 16 }}>
        <Text style={{ color: C.red, fontSize: 15 }}>Effacer mes données de ce téléphone</Text>
      </Pressable>
      <Notice />
    </ScrollView>
  );
}
