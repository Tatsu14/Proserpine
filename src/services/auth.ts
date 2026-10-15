/**
 * auth.ts — Authentification, reprise de `js/auth.js` de la version en ligne.
 *
 * Même contrat : chaque fonction renvoie { success, error } au lieu de lever une
 * exception, avec les MÊMES messages d'erreur qu'en ligne. Aucun affichage ici :
 * les écrans gèrent le chargement et les redirections.
 *
 * Connexion Google : par fenêtre surgissante, donc web uniquement pour l'instant.
 * La version native demandera le SDK Google natif (voir le backlog).
 */
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';

import { auth, db, googleProvider } from './firebase';

export type AuthResult = { success: boolean; error?: string | null; nouveau?: boolean };

// Messages d'erreur traduits (mêmes que getAuthErrorMessage en ligne).
function messageErreur(code?: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Cette adresse e-mail est déjà utilisée.';
    case 'auth/invalid-email':
      return "L'adresse e-mail n'est pas valide.";
    case 'auth/weak-password':
      return 'Le mot de passe est trop faible.';
    case 'auth/user-not-found':
      return 'Aucun utilisateur trouvé avec cette adresse e-mail.';
    case 'auth/wrong-password':
      return 'Adresse e-mail ou mot de passe incorrect.';
    default:
      return 'Une erreur est survenue. Veuillez réessayer.';
  }
}

/** La connexion Google est-elle disponible sur cette plateforme ? */
export const googleDisponible = Platform.OS === 'web';

export async function registerUser(email: string, password: string, username: string): Promise<AuthResult> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const user = cred.user;

    // E-mail de confirmation (non bloquant si l'envoi échoue).
    try {
      await sendEmailVerification(user);
    } catch {
      // ignoré volontairement
    }

    await updateProfile(user, { displayName: username });

    // Document utilisateur dans Firestore (même structure qu'en ligne).
    await setDoc(doc(db, 'utilisateurs', user.uid), {
      username,
      email,
      createdAt: serverTimestamp(),
    });

    return { success: true };
  } catch (e: any) {
    return { success: false, error: messageErreur(e?.code) };
  }
}

export async function loginUser(email: string, password: string): Promise<AuthResult> {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    return { success: true };
  } catch {
    // En ligne, toute erreur de connexion donne le même message (on ne dit pas ce qui est faux).
    return { success: false, error: 'Adresse e-mail ou mot de passe incorrect.' };
  }
}

/** Connexion Google (web). `nouveau` vaut vrai à la première connexion : l'écran enchaîne alors sur l'onboarding. */
export async function loginWithGoogle(): Promise<AuthResult> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const ref = doc(db, 'utilisateurs', user.uid);
    const existant = await getDoc(ref);
    if (!existant.exists()) {
      await setDoc(ref, { username: user.displayName || '', email: user.email, createdAt: serverTimestamp() });
      return { success: true, nouveau: true };
    }
    return { success: true, nouveau: false };
  } catch (e: any) {
    // L'utilisateur a fermé la fenêtre : ce n'est pas une erreur à afficher.
    if (e?.code === 'auth/popup-closed-by-user' || e?.code === 'auth/cancelled-popup-request') {
      return { success: false, error: null };
    }
    if (e?.code === 'auth/popup-blocked') {
      return { success: false, error: 'La popup a été bloquée par le navigateur. Autorisez les popups pour ce site.' };
    }
    if (e?.code === 'auth/unauthorized-domain') {
      return { success: false, error: "Ce domaine n'est pas autorisé. Contactez l'administrateur." };
    }
    return { success: false, error: 'La connexion avec Google a échoué. Veuillez réessayer.' };
  }
}

export async function logoutUser(): Promise<AuthResult> {
  try {
    await signOut(auth);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Erreur de déconnexion' };
  }
}

export async function resetPassword(email: string): Promise<AuthResult> {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: messageErreur(e?.code) };
  }
}

/** L'utilisateur a-t-il déjà vu l'onboarding ? (champ `onboardingVu` du document utilisateur) */
export async function onboardingDejaVu(uid: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'utilisateurs', uid));
    return snap.exists() && (snap.data() as any).onboardingVu === true;
  } catch {
    return false;
  }
}

/** Marque l'onboarding comme vu (non bloquant : en cas d'échec on continue quand même). */
export async function marquerOnboardingVu(uid: string): Promise<void> {
  try {
    await setDoc(doc(db, 'utilisateurs', uid), { onboardingVu: true }, { merge: true });
  } catch {
    // non bloquant
  }
}
