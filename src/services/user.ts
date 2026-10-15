/**
 * user.ts — Lecture du profil utilisateur Firestore.
 * Reproduit la logique web : pseudo Firestore (username) en priorité, sinon le
 * displayName Firebase Auth, jamais l'e-mail.
 */
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function getUsername(uid: string, fallback?: string | null): Promise<string> {
  try {
    const snap = await getDoc(doc(db, 'utilisateurs', uid));
    if (snap.exists()) {
      const data = snap.data() as any;
      const name = data.username || data.displayName;
      if (name) return name;
    }
    if (fallback) return fallback;
    return 'Pseudo introuvable';
  } catch {
    return fallback || 'Pseudo introuvable';
  }
}
