import { useFonts } from 'expo-font';
import { Fraunces_400Regular_Italic, Fraunces_600SemiBold, Fraunces_800ExtraBold } from '@expo-google-fonts/fraunces';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';

/**
 * Deux voix : Fraunces (serif « souple », dessinée avec du caractère : titres, noms de plantes, citations en italique)
 * et DM Sans (géométrique, très lisible : tout ce qu'on utilise). Sur Android, la famille porte le graisse :
 * jamais de fontWeight avec ces noms.
 */
export const F = {
  title: 'Fraunces_800ExtraBold',
  heading: 'Fraunces_600SemiBold',
  italic: 'Fraunces_400Regular_Italic',
  body: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  bold: 'DMSans_700Bold',
} as const;

export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    Fraunces_400Regular_Italic, Fraunces_600SemiBold, Fraunces_800ExtraBold,
    DMSans_400Regular, DMSans_500Medium, DMSans_700Bold,
  });
  // En cas d'échec de chargement, on affiche quand même l'app avec les polices système plutôt qu'un écran vide.
  return loaded || !!error;
}
