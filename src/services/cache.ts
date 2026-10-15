/**
 * cache.ts — Cache local des produits (clé = EAN), via AsyncStorage.
 *
 * But : amortir l'instabilité d'Open Food Facts. Un produit déjà chargé une fois
 * s'ouvre instantanément et HORS-LIGNE (le score et le tri se recalculent à partir
 * des `donnees_brutes` mises en cache). On stocke le produit normalisé complet.
 *
 * AsyncStorage suffit ici : l'accès est purement clé→valeur par EAN. (expo-sqlite
 * serait utile seulement pour interroger/filtrer un grand catalogue — pas notre cas.)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'produit:';

export async function lireProduitCache(ean: string): Promise<any | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + ean);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.produit ?? null;
  } catch {
    return null;
  }
}

export async function ecrireProduitCache(ean: string, produit: any): Promise<void> {
  if (!ean || !produit) return;
  try {
    await AsyncStorage.setItem(PREFIX + ean, JSON.stringify({ produit, cachedAt: Date.now() }));
  } catch {
    // cache best-effort : un échec d'écriture ne doit jamais casser l'app
  }
}
