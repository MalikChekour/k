import React from 'react';
import { View } from 'react-native';
import type { PlantStyle } from '../plantStyle';
import { tintOf } from '../plantStyle';

/** Motif botanique dessiné avec de simples vues (pas d'image, pas de dépendance) : fleur, feuilles, baies ou racine. */
export function Bloom({ st, size }: { st: PlantStyle; size: number }) {
  const S = size;
  const dark = tintOf(st.color, 0.78);
  const leaf = '#3F8F5A';
  const spoke = (angle: number, key: string, node: React.ReactNode) => (
    <View key={key} style={{ position: 'absolute', width: S, height: S, alignItems: 'center', transform: [{ rotate: `${angle}deg` }] }}>{node}</View>
  );
  let body: React.ReactNode;
  if (st.motif === 'rosette') {
    const n = st.petals + 1;
    body = (
      <>
        {Array.from({ length: n }, (_, i) => spoke(st.turn + (360 / n) * i, 'p' + i,
          <View style={{ width: S * 0.3, height: S * 0.44, borderRadius: S * 0.16, backgroundColor: i % 2 ? st.color : dark }} />))}
        <View style={{ width: S * 0.26, height: S * 0.26, borderRadius: S, backgroundColor: '#FFF6D8', borderWidth: S * 0.035, borderColor: st.color }} />
      </>
    );
  } else if (st.motif === 'feuilles') {
    body = (
      <>
        {[-38, 0, 38].map((a, i) => spoke(a + (st.turn % 9) - 4, 'l' + i,
          <View style={{ marginTop: S * (i === 1 ? 0.02 : 0.1), width: S * 0.26, height: S * (i === 1 ? 0.62 : 0.5), backgroundColor: i === 1 ? st.color : leaf,
            borderTopLeftRadius: S, borderTopRightRadius: S, borderBottomLeftRadius: S * 0.04, borderBottomRightRadius: S * 0.04 }} />))}
        <View style={{ position: 'absolute', bottom: S * 0.04, width: S * 0.05, height: S * 0.26, backgroundColor: leaf, borderRadius: S }} />
      </>
    );
  } else if (st.motif === 'baies') {
    const r = S * 0.25;
    const pts: [number, number][] = [[0.25, 0.28], [0.52, 0.2], [0.34, 0.52], [0.6, 0.5], [0.46, 0.72]];
    body = (
      <>
        <View style={{ position: 'absolute', top: S * 0.02, left: S * 0.46, width: S * 0.06, height: S * 0.3, backgroundColor: leaf, borderRadius: S, transform: [{ rotate: '14deg' }] }} />
        {pts.map(([x, y], i) => (
          <View key={i} style={{ position: 'absolute', left: S * x - r / 2, top: S * y - r / 2, width: r, height: r, borderRadius: r, backgroundColor: i % 2 ? st.color : dark }}>
            <View style={{ position: 'absolute', top: r * 0.18, left: r * 0.2, width: r * 0.22, height: r * 0.22, borderRadius: r, backgroundColor: '#FFFFFF88' }} />
          </View>
        ))}
      </>
    );
  } else {
    body = (
      <>
        {spoke(-24, 'r0', <View style={{ marginTop: S * 0.04, width: S * 0.2, height: S * 0.34, borderRadius: S, backgroundColor: leaf }} />)}
        {spoke(22, 'r1', <View style={{ marginTop: S * 0.1, width: S * 0.16, height: S * 0.28, borderRadius: S, backgroundColor: leaf }} />)}
        <View style={{ position: 'absolute', top: S * 0.38, width: S * 0.34, height: S * 0.5, borderRadius: S, backgroundColor: st.color, transform: [{ rotate: '-12deg' }] }} />
        <View style={{ position: 'absolute', top: S * 0.52, left: S * 0.52, width: S * 0.22, height: S * 0.34, borderRadius: S, backgroundColor: dark, transform: [{ rotate: '24deg' }] }} />
      </>
    );
  }
  return <View style={{ width: S, height: S, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{body}</View>;
}
