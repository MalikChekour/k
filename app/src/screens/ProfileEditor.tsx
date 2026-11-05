import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import type { Profile } from '../safety';
import { Chip, C, s } from './shared';

export const FLAGS: [string, string][] = [
  ['asteraceae_allergy', 'Allergie aux Astéracées'], ['salicylate_allergy', 'Allergie aux salicylés'], ['bleeding_disorder', 'Trouble de la coagulation'],
  ['biliary_disease', 'Maladie des voies biliaires'], ['fluid_restriction', 'Restriction hydrique'], ['drives', 'Je conduis'],
];

/** Profil de santé : saisi et conservé sur le téléphone uniquement. Aucune donnée n'est envoyée. */
export function ProfileEditor({ profile, onChange }: { profile: Profile; onChange: (p: Profile) => void }) {
  const [medsText, setMedsText] = useState((profile.meds ?? []).join(', '));
  const set = (patch: Partial<Profile>) => onChange({ ...profile, ...patch });
  const flags = profile.flags ?? [];
  const toggleFlag = (id: string) => set({ flags: flags.includes(id) ? flags.filter(x => x !== id) : [...flags, id] });
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.tag}>PROFIL (reste sur ce téléphone)</Text>
      <View style={s.wrap}>
        <Chip label="Enceinte" on={!!profile.pregnant} onPress={() => set({ pregnant: !profile.pregnant })} />
        <Chip label="Allaitement" on={!!profile.lactating} onPress={() => set({ lactating: !profile.lactating })} />
        {FLAGS.map(([id, label]) => <Chip key={id} label={label} on={flags.includes(id)} onPress={() => toggleFlag(id)} />)}
      </View>
      <View style={s.row}>
        <Text style={s.body}>Âge (ans)</Text>
        <TextInput
          style={s.input}
          value={profile.ageYears == null ? '' : String(profile.ageYears)}
          onChangeText={t => { const n = parseInt(t, 10); set({ ageYears: Number.isFinite(n) ? n : null }); }}
          keyboardType="number-pad"
          accessibilityLabel="Âge en années"
        />
      </View>
      <Text style={s.tag}>MÉDICAMENTS (séparés par une virgule)</Text>
      <TextInput
        style={[s.input, s.inputWide]}
        value={medsText}
        onChangeText={t => {
          setMedsText(t);
          set({ meds: t.split(/[,;\n]/).map(x => x.trim()).filter(Boolean) });
        }}
        placeholder="ex. warfarine, pilule contraceptive"
        placeholderTextColor={C.muted}
        accessibilityLabel="Médicaments pris, séparés par une virgule"
      />
    </View>
  );
}
