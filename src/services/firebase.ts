/**
 * firebase.ts — Configuration Firebase pour React Native (Expo)
 *
 * Différences clés avec la version web (PWA) :
 *  - On importe le SDK depuis le package npm `firebase` (plus de CDN).
 *  - L'authentification doit persister la session sur l'appareil : on utilise
 *    `initializeAuth` + `getReactNativePersistence(AsyncStorage)` au lieu de `getAuth`.
 *    Sans ça, l'utilisateur serait déconnecté à chaque redémarrage de l'app.
 *  - Garde anti-double-initialisation (le Fast Refresh d'Expo peut ré-exécuter ce
 *    fichier) : on réutilise l'app existante et on retombe sur `getAuth` si l'auth
 *    a déjà été initialisée.
 *
 * NB : les clés ci-dessous sont des clés CLIENT publiques (comme sur le web) — la
 * sécurité repose sur les règles Firestore, pas sur le secret de cette clé.
 */
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  // @ts-ignore — getReactNativePersistence n'est exposé que dans le build React Native de Firebase
  getReactNativePersistence,
  type Auth,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBr3xbq87GeqjhKP866KjsmyDdvgPv_X30',
  authDomain: 'proserpine-5eadf.firebaseapp.com',
  projectId: 'proserpine-5eadf',
  storageBucket: 'proserpine-5eadf.firebasestorage.app',
  messagingSenderId: '725919778618',
  appId: '1:725919778618:web:c31e2626ea083c37973203',
  measurementId: 'G-SB4FYQV4G6',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  // Déjà initialisée (Fast Refresh) → on récupère l'instance existante.
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);
export default app;
