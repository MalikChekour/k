import React, { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { tincture } from '../tincture';
import { s } from './shared';

/** Laboratoire : teinture-mère (dilution théorique). */
export function Lab() {
  const [g, setG] = useState('50');
  const [r, setR] = useState('5');
  const [t, setT] = useState('45');
  const out = tincture(parseFloat(g.replace(',', '.')), parseFloat(r.replace(',', '.')), parseFloat(t.replace(',', '.')));
  const field = (label: string, v: string, set: (x: string) => void) => (
    <View style={s.row}>
      <Text style={s.body}>{label}</Text>
      <TextInput style={s.input} value={v} onChangeText={set} keyboardType="decimal-pad" accessibilityLabel={label} />
    </View>
  );
  return (
    <ScrollView contentContainerStyle={s.pad}>
      <Text style={s.h1}>Teinture mère</Text>
      {field('Plante sèche (g)', g, setG)}
      {field('Ratio 1 : N', r, setR)}
      {field('Alcool final (% vol)', t, setT)}
      <View style={s.card}>
        {out ? (
          <>
            <Text style={s.h2}>Solvant total : {out.solventMl} mL</Text>
            <Text style={s.body}>Alcool 96 % : {out.alcoholMl} mL</Text>
            <Text style={s.body}>Eau : {out.waterMl} mL</Text>
          </>
        ) : (
          <Text style={s.warn}>Valeurs invalides (alcool final ≤ 96 %).</Text>
        )}
      </View>
      <Text style={s.muted}>
        Calcul de dilution théorique, contraction de volume ignorée. Le ratio et la force d’extraction dépendent de la monographie de chaque plante.
      </Text>
    </ScrollView>
  );
}
