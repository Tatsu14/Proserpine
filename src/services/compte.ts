/**
 * compte.ts — Gestion du compte (écran « Modifier mes informations »).
 *
 * Repris de `js/auth.js` de ProserpineV2 (version locale) : changer le nom d'utilisateur,
 * changer le mot de passe, supprimer le compte. Toutes les fonctions renvoient
 * { success, error } et ne lèvent jamais d'exception vers l'écran.
 */
import {
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  updatePassword,
  updateProfile,
} from 'firebase/auth';
import { collection, deleteDoc, doc, getDocs, updateDoc, writeBatch } from 'firebase/firestore';
import { Platform } from 'react-native';

import { auth, db, googleProvider } from './firebase';

export type ResultatCompte = { success: boolean; error?: string; nom?: string };

// Mêmes règles de validation que l'inscription.
const REGEX_NOM_UTILISATEUR = /^[a-zA-Z0-9_-]{3,20}$/;
const REGEX_MOT_DE_PASSE = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

// Firestore accepte au maximum 500 opérations par lot : on reste en dessous.
const TAILLE_LOT_SUPPRESSION = 450;

export const validerNomUtilisateur = (nom: string) => REGEX_NOM_UTILISATEUR.test(nom);
export const validerMotDePasse = (motDePasse: string) => REGEX_MOT_DE_PASSE.test(motDePasse);

/** 'mot-de-passe' (compte e-mail), 'google', ou null si personne n'est connecté. */
export function typeDeCompte(): 'mot-de-passe' | 'google' | null {
  const user = auth.currentUser;
  if (!user) return null;
  return user.providerData.some((p) => p.providerId === 'password') ? 'mot-de-passe' : 'google';
}

/** Messages d'erreur propres aux opérations sur le compte. */
function messageErreurCompte(code?: string): string {
  switch (code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Mot de passe actuel incorrect.';
    case 'auth/weak-password':
      return 'Le nouveau mot de passe est trop faible.';
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Réessayez dans quelques minutes.';
    case 'auth/requires-recent-login':
      return 'Pour votre sécurité, reconnectez-vous puis réessayez.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Confirmation annulée.';
    case 'auth/popup-blocked':
      return 'La fenêtre de confirmation a été bloquée par le navigateur.';
    case 'auth/network-request-failed':
      return 'Connexion impossible. Vérifiez votre réseau.';
    default:
      return 'Une erreur est survenue. Veuillez réessayer.';
  }
}

/** Change le nom d'utilisateur (Firestore + profil Firebase Auth). Le nom n'est pas unique. */
export async function changerNomUtilisateur(nouveauNom: string): Promise<ResultatCompte> {
  const user = auth.currentUser;
  if (!user) return { success: false, error: "Vous n'êtes pas connecté." };

  const nom = String(nouveauNom).trim();
  if (!validerNomUtilisateur(nom)) {
    return { success: false, error: '3 à 20 caractères (lettres, chiffres, _ ou -).' };
  }
  try {
    // Firestore d'abord : c'est lui que l'app lit en priorité pour afficher le nom.
    await updateDoc(doc(db, 'utilisateurs', user.uid), { username: nom });
    await updateProfile(user, { displayName: nom });
    return { success: true, nom };
  } catch (e: any) {
    return { success: false, error: messageErreurCompte(e?.code) };
  }
}

/** Change le mot de passe d'un compte e-mail. Firebase exige de prouver qu'on connaît l'ancien. */
export async function changerMotDePasse(ancien: string, nouveau: string): Promise<ResultatCompte> {
  const user = auth.currentUser;
  if (!user) return { success: false, error: "Vous n'êtes pas connecté." };
  if (typeDeCompte() !== 'mot-de-passe') {
    return { success: false, error: "Ce compte n'utilise pas de mot de passe." };
  }
  if (!validerMotDePasse(nouveau)) {
    return { success: false, error: '8 caractères minimum, avec 1 majuscule, 1 chiffre et 1 caractère spécial.' };
  }
  if (ancien === nouveau) {
    return { success: false, error: "Le nouveau mot de passe doit être différent de l'ancien." };
  }
  try {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email as string, ancien));
    await updatePassword(user, nouveau);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: messageErreurCompte(e?.code) };
  }
}

/**
 * Supprime définitivement le compte et toutes ses données.
 * Ordre voulu : 1) reconnexion (si elle échoue, rien n'est effacé), 2) historique puis
 * profil (les règles Firestore exigent d'être encore connecté), 3) compte Firebase Auth.
 */
export async function supprimerCompte(motDePasse: string | null = null): Promise<ResultatCompte> {
  const user = auth.currentUser;
  if (!user) return { success: false, error: "Vous n'êtes pas connecté." };

  // --- 1. Reconnexion ---
  try {
    if (typeDeCompte() === 'google') {
      // La reconnexion Google passe par une fenêtre surgissante : web seulement pour l'instant.
      if (Platform.OS !== 'web') {
        return { success: false, error: 'La suppression d’un compte Google n’est pas encore disponible dans l’application.' };
      }
      await reauthenticateWithPopup(user, googleProvider);
    } else {
      if (!motDePasse) return { success: false, error: 'Saisissez votre mot de passe.' };
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email as string, motDePasse));
    }
  } catch (e: any) {
    return { success: false, error: messageErreurCompte(e?.code) };
  }

  // --- 2 et 3. Effacement des données puis du compte ---
  try {
    const instantane = await getDocs(collection(db, 'utilisateurs', user.uid, 'historique'));
    let lot = writeBatch(db);
    let operations = 0;
    for (const d of instantane.docs) {
      lot.delete(d.ref);
      operations++;
      if (operations === TAILLE_LOT_SUPPRESSION) {
        await lot.commit();
        lot = writeBatch(db);
        operations = 0;
      }
    }
    if (operations > 0) await lot.commit();

    await deleteDoc(doc(db, 'utilisateurs', user.uid));
    await deleteUser(user);
    return { success: true };
  } catch {
    return {
      success: false,
      error: "La suppression n'a pas pu aller jusqu'au bout. Vérifiez votre connexion puis recommencez.",
    };
  }
}
