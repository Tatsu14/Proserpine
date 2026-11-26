/**
 * user.ts — Lecture du profil utilisateur Firestore.
 * Reproduit la logique web : pseudo Firestore (username) en priorité, sinon le
 * displayName Firebase Auth, jamais l'e-mail.
 *
 * Correction (26/11/2026) : un compte Google créé avant la mise à jour 2 a pu garder son nom Google complet
 * comme pseudo (« Jean-Pierre Dupont »), contraire à la règle. Pour le compte connecté, ce pseudo est remplacé
 * une fois pour toutes par sa version convertie (services/pseudo.ts) ; l'utilisateur peut ensuite le changer.
 */
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { auth, db } from './firebase';
import { pseudoDepuisNom, pseudoValide } from './pseudo';

async function corrigerSiBesoin(uid: string, nom: string): Promise<string> {
  const user = auth.currentUser;
  if (pseudoValide(nom) || !user || user.uid !== uid) return nom;
  const pseudo = pseudoDepuisNom(nom, user.email);
  try {
    await setDoc(doc(db, 'utilisateurs', uid), { username: pseudo }, { merge: true });
    await updateProfile(user, { displayName: pseudo }).catch(() => {});
    return pseudo;
  } catch {
    return nom; // hors connexion : on réessaiera au prochain affichage
  }
}

export async function getUsername(uid: string, fallback?: string | null): Promise<string> {
  try {
    const snap = await getDoc(doc(db, 'utilisateurs', uid));
    if (snap.exists()) {
      const data = snap.data() as any;
      const name = data.username || data.displayName;
      if (name) return corrigerSiBesoin(uid, name);
    }
    if (fallback) return corrigerSiBesoin(uid, fallback);
    return 'Pseudo introuvable';
  } catch {
    return fallback || 'Pseudo introuvable';
  }
}
