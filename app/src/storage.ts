import AsyncStorage from '@react-native-async-storage/async-storage';
import { EMPTY_ARMOIRE, parseArmoire } from './armoire';
import type { Armoire } from './armoire';

/**
 * Stockage LOCAL sur le téléphone, NON chiffré. Aucune donnée n'est envoyée à un serveur.
 * Si la lecture échoue, `ok` vaut false : l'app n'écrit alors plus rien, pour ne jamais écraser des données non lues.
 */
const KEY = 'apothecaria.armoire.v1';

export async function loadArmoire(): Promise<{ data: Armoire; ok: boolean }> {
  try {
    return { data: parseArmoire(await AsyncStorage.getItem(KEY)), ok: true };
  } catch {
    return { data: EMPTY_ARMOIRE, ok: false };
  }
}

export async function saveArmoire(a: Armoire): Promise<boolean> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(a));
    return true;
  } catch {
    return false;
  }
}

export async function clearArmoire(): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(KEY);
    return true;
  } catch {
    return false;
  }
}
