import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { tincture } from '../tincture';
import { compareToRange, RANGE_TEXT } from '../infusion';
import { bundle, plants } from '../bundle';
import { C, Chip, s } from './shared';

/** Infusion : compare une dose saisie à la dose unitaire citée par l'EMA. Ne compose rien et ne calcule aucun pourcentage. */
function InfusionCalc() {
  const infusions = bundle.infusions;
  const [idx, setIdx] = useState(0);
  const [g, setG] = useState('');
  if (infusions.length === 0) return <Text style={s.muted}>Aucune dose d’infusion dans notre base.</Text>;
  const inf = infusions[idx];
  const plant = plants.find(p => p.id === inf.plant);
  const claim = plant?.claims.find(c => c.id === inf.claim);
  const status = compareToRange(parseFloat(g.replace(',', '.')), inf.min_g, inf.max_g);
  const range = inf.min_g === inf.max_g ? `${inf.min_g} g` : `${inf.min_g} à ${inf.max_g} g`;
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.tag}>INFUSION (TISANE) : DOSE UNITAIRE CITÉE PAR L’EMA</Text>
      <View style={s.wrap}>
        {infusions.map((x, i) => <Chip key={x.claim} label={x.label} on={i === idx} onPress={() => setIdx(i)} />)}
      </View>
      <View style={s.row}>
        <Text style={s.body}>Plante sèche (g)</Text>
        <TextInput style={s.input} value={g} onChangeText={setG} keyboardType="decimal-pad" placeholder="ex. 2" placeholderTextColor={C.muted} accessibilityLabel="Quantité de plante sèche en grammes" />
      </View>
      <View style={s.card}>
        <Text style={s.h2}>Fourchette EMA : {range} dans {inf.water_ml} mL d’eau bouillante</Text>
        <Text style={status === 'au_dessus' ? s.warn : s.body} accessibilityLiveRegion="polite">{RANGE_TEXT[status]}</Text>
      </View>
      {claim && (
        <>
          <Text style={s.muted}>« {claim.quote} »</Text>
          <Pressable onPress={() => Linking.openURL(claim.url)} accessibilityRole="link" accessibilityLabel={`Source : ${claim.source}`}>
            <Text style={s.link}>{claim.source}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

function TinctureCalc() {
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
    <View style={{ gap: 12 }}>
      <Text style={s.tag}>TEINTURE MÈRE : DILUTION THÉORIQUE</Text>
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
    </View>
  );
}

/** Laboratoire : infusion (doses EMA citées) et teinture-mère (dilution théorique). */
export function Lab() {
  return (
    <ScrollView contentContainerStyle={s.pad}>
      <Text style={s.h1}>Laboratoire</Text>
      <InfusionCalc />
      <TinctureCalc />
    </ScrollView>
  );
}
