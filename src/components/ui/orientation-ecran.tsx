/**
 * ORIENTATION SELON LA TAILLE DE L'ÉCRAN.
 *
 * Android 16 ignore les verrous d'orientation sur les grands écrans (tablettes, pliables dépliés) :
 * l'app ne doit donc plus être verrouillée dans le manifeste (`orientation: "default"` dans app.json).
 * Pour garder le comportement actuel sur téléphone, on verrouille le portrait ICI, au démarrage,
 * uniquement quand l'écran est étroit ; sur grand écran on laisse pivoter librement.
 *
 * Seuil : 600 dp de plus petit côté, le même que la définition Android d'un « grand écran ».
 * Ne s'applique qu'au natif (sur le web, le navigateur gère l'orientation).
 */
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

const SEUIL_GRAND_ECRAN_DP = 600;

export function OrientationEcran() {
  const { width, height } = useWindowDimensions();
  // Plus petit côté : identique en portrait et en paysage, donc pas de va-et-vient du verrou.
  const grandEcran = Math.min(width, height) >= SEUIL_GRAND_ECRAN_DP;

  useEffect(() => {
    if (Platform.OS === 'web') return;
    // PORTRAIT_UP (et non PORTRAIT) : « PORTRAIT » est invalide sur les appareils sans PORTRAIT_DOWN.
    const action = grandEcran
      ? ScreenOrientation.unlockAsync()
      : ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    // Un échec de verrouillage ne doit jamais empêcher l'app de démarrer.
    action.catch(() => {});
  }, [grandEcran]);

  return null;
}
