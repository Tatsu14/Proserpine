/**
 * firebase.ts — Configuration Firebase (web + natif, un seul fichier).
 *
 * Même projet Firebase que ProserpineV2 (`proserpine-5eadf`) : mêmes comptes, même
 * historique.
 *
 *  - Sur le WEB : `getAuth` (la session est gardée par le navigateur).
 *  - Sur NATIF : `initializeAuth` + `getReactNativePersistence(AsyncStorage)`, sinon
 *    l'utilisateur serait déconnecté à chaque redémarrage de l'app.
 *  - Garde anti-double-initialisation (le Fast Refresh peut ré-exécuter ce fichier).
 *
 * NB : les clés ci-dessous sont des clés CLIENT publiques (comme en ligne) — la
 * sécurité repose sur les règles Firestore, pas sur le secret de cette clé.
 */
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  initializeAuth,
  // @ts-ignore — getReactNativePersistence n'est exposé que dans le build React Native de Firebase
  getReactNativePersistence,
  type Auth,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

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
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  try {
    auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    // Déjà initialisée (Fast Refresh) → on récupère l'instance existante.
    auth = getAuth(app);
  }
}

export { auth };
export const db = getFirestore(app);
// Fournisseur Google (connexion par fenêtre surgissante, web uniquement pour l'instant).
export const googleProvider = new GoogleAuthProvider();
export default app;
