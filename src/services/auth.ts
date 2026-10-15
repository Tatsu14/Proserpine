/**
 * auth.ts — Authentification (email / mot de passe) adaptée à React Native.
 *
 * Différences avec la version web :
 *  - Aucune manipulation du DOM, aucun loader, aucune redirection ici. Les écrans
 *    gèrent l'UI ; la redirection se fait automatiquement via le contexte d'auth
 *    (onAuthStateChanged) une fois la session établie.
 *  - On garde le même contrat : chaque fonction retourne { success, error } plutôt
 *    que de lever une exception.
 *  - Google Sign-In n'est PAS porté en v1 (il nécessite une configuration native
 *    dédiée) — uniquement email / mot de passe.
 */
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export type AuthResult = { success: boolean; error?: string };

// Traduit les codes d'erreur Firebase en messages clairs en français.
function messageErreur(code?: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Cette adresse e-mail est déjà utilisée.';
    case 'auth/invalid-email':
      return "L'adresse e-mail n'est pas valide.";
    case 'auth/weak-password':
      return 'Le mot de passe est trop faible (6 caractères minimum).';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Adresse e-mail ou mot de passe incorrect.';
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Veuillez réessayer plus tard.';
    case 'auth/network-request-failed':
      return 'Problème de connexion réseau. Vérifiez votre connexion.';
    default:
      return 'Une erreur est survenue. Veuillez réessayer.';
  }
}

export async function registerUser(
  email: string,
  password: string,
  username: string,
): Promise<AuthResult> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const user = cred.user;

    // E-mail de vérification (non bloquant si l'envoi échoue).
    try {
      await sendEmailVerification(user);
    } catch {
      // ignoré volontairement
    }

    await updateProfile(user, { displayName: username });

    // Document utilisateur dans Firestore (même structure que la version web).
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
  } catch (e: any) {
    return { success: false, error: messageErreur(e?.code) };
  }
}

export async function logoutUser(): Promise<AuthResult> {
  try {
    await signOut(auth);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: messageErreur(e?.code) };
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
