import React, { useMemo, useState } from 'react';

import { Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { assess } from '../safety';
import type { Profile } from '../safety';
import { bundle, plants } from '../bundle';
import { plantsForUsage } from '../usages';
import { Chip, C, SafetyReport, s } from './shared';
import { ProfileSummary } from './ProfileEditor';

/** Mélange par symptôme. Le contrôle de sécurité tourne à chaque modification, AVANT la composition. */
export function Mix({ profile }: { profile: Profile }) {
  const [cat, setCat] = useState<string>(bundle.usages[0]?.id ?? '');
  const [mix, setMix] = useState<Record<string, string>>({});
  const selected = Object.keys(mix);
  const hits = useMemo(() => plantsForUsage(bundle, bundle.usages, cat), [cat]);
  const report = assess(bundle, selected, profile);
  const toggle = (id: string) => setMix(m => {
    const n = { ...m };
    if (id in n) delete n[id]; else n[id] = '';
    return n;
  });
  const grams = (id: string) => parseFloat((mix[id] ?? '').replace(',', '.'));
  const total = selected.reduce((sum, id) => sum + (Number.isFinite(grams(id)) ? grams(id) : 0), 0);
  const dose = (plantId: string) => bundle.infusions.find(i => i.plant === plantId);

  return (
    <ScrollView contentContainerStyle={s.pad}>
      <Text style={s.h1}>Mélange par symptôme</Text>
      <Text style={s.tag}>VOTRE MÉLANGE : SÉCURITÉ VÉRIFIÉE AUTOMATIQUEMENT</Text>
      <ProfileSummary profile={profile} />
      {selected.length === 0 ? (
        <Text style={s.muted}>Ajoutez une plante ci-dessous : le contrôle de sécurité s’affiche aussitôt.</Text>
      ) : (
        <>
          <SafetyReport r={report} />
          {selected.map(id => {
            const pl = plants.find(p => p.id === id);
            const d = dose(id);
            return (
              <View key={id} style={s.card}>
                <View style={s.row}>
                  <Text style={s.h2}>{pl?.fr ?? id}</Text>
                  <Pressable onPress={() => toggle(id)} accessibilityRole="button" accessibilityLabel={`Retirer ${pl?.fr ?? id} du mélange`} style={{ minHeight: 44, justifyContent: 'center' }}>
                    <Text style={s.link}>Retirer</Text>
                  </Pressable>
                </View>
                <View style={s.row}>
                  <Text style={s.body}>Quantité (g)</Text>
                  <TextInput
                    style={s.input}
                    value={mix[id]}
                    onChangeText={t => setMix(m => ({ ...m, [id]: t }))}
                    keyboardType="decimal-pad"
                    accessibilityLabel={`Quantité de ${pl?.fr ?? id} en grammes`}
                  />
                </View>
                {d && (
                  <>
                    <Text style={s.muted}>{d.label} : {d.min_g}{d.max_g !== d.min_g ? `–${d.max_g}` : ''} g dans {d.water_ml} mL (dose unitaire citée par l’EMA)</Text>
                    <Pressable onPress={() => { const c = pl?.claims.find(x => x.id === d.claim); if (c) Linking.openURL(c.url); }} accessibilityRole="link" accessibilityLabel="Ouvrir la source de la dose">
                      <Text style={s.link}>Voir la source</Text>
                    </Pressable>
                  </>
                )}
              </View>
            );
          })}
          <Text style={s.muted}>Total saisi : {total} g (somme de vos quantités). Aucune proportion n’est recommandée par l’application.</Text>
        </>
      )}

      <Text style={s.tag}>CHOISIR PAR USAGE (issu des indications EMA)</Text>
      <View style={s.wrap}>
        {bundle.usages.map(u => <Chip key={u.id} label={u.fr} on={cat === u.id} onPress={() => setCat(u.id)} />)}
      </View>
      {hits.length === 0 && <Text style={s.muted}>Aucune plante de notre base pour cet usage.</Text>}
      {hits.map(h => (
        <View key={h.claimId} style={s.card}>
          <Text style={s.h2}>{h.plantFr}</Text>
          <Text style={s.latin}>{h.latin}</Text>
          <Text style={s.body}>{h.statement}</Text>
          <Text style={s.quote}>« {h.quote} »</Text>
          <Pressable onPress={() => Linking.openURL(h.url)} accessibilityRole="link" accessibilityLabel={`Source : ${h.source}`}>
            <Text style={s.link}>{h.source}</Text>
          </Pressable>
          <Chip label={mix[h.plantId] !== undefined ? `Dans le mélange : ${h.plantFr}` : `Ajouter ${h.plantFr}`} on={mix[h.plantId] !== undefined} onPress={() => toggle(h.plantId)} />
        </View>
      ))}
    </ScrollView>
  );
}
