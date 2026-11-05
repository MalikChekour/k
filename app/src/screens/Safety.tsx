import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { assess } from '../safety';
import type { Profile } from '../safety';
import { bundle, plants } from '../bundle';
import { Chip, SafetyReport, s } from './shared';
import { ProfileEditor } from './ProfileEditor';

export function Safety({ profile, onProfile }: { profile: Profile; onProfile: (p: Profile) => void }) {
  const [sel, setSel] = useState<string[]>([]);
  const r = assess(bundle, sel, profile);
  const toggle = (id: string) => setSel(sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]);
  return (
    <ScrollView contentContainerStyle={s.pad}>
      <Text style={s.h1}>Vérificateur de sécurité</Text>
      <Text style={s.tag}>PLANTES</Text>
      <View style={s.wrap}>
        {plants.map(p => <Chip key={p.id} label={p.fr} on={sel.includes(p.id)} onPress={() => toggle(p.id)} />)}
      </View>
      <ProfileEditor profile={profile} onChange={onProfile} />
      <SafetyReport r={r} />
    </ScrollView>
  );
}
