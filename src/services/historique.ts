/**
 * historique.ts — Lecture/écriture de l'historique des scans dans Firestore.
 * Reproduit la logique de la version web (collection utilisateurs/{uid}/historique,
 * EAN comme identifiant de document, déduplication + compteur de scans atomique).
 */
import {
  collection,
  doc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export type HistoriqueItem = {
  ean: string;
  nom: string;
  marque: string;
  date?: Timestamp;
  ecoScore?: number;
  scanCount?: number;
};

/**
 * Enregistre (ou met à jour) un produit scanné dans l'historique de l'utilisateur.
 * IMPORTANT : on n'écrit le champ `ecoScore` QUE si le produit a été réellement
 * évalué — un produit « non évalué » ne doit pas être enregistré avec un faux 0.
 */
export async function enregistrerScan(
  uid: string,
  produit: { ean: string; nom: string; marque: string },
  ecoScore: number | null,
): Promise<void> {
  const ref = doc(db, 'utilisateurs', uid, 'historique', produit.ean);
  const data: Record<string, unknown> = {
    ean: produit.ean,
    nom: produit.nom,
    marque: produit.marque,
    date: Timestamp.now(),
    scanCount: increment(1),
  };
  if (ecoScore !== null && ecoScore !== undefined) {
    data.ecoScore = ecoScore;
  }
  await setDoc(ref, data, { merge: true });
}

/** Charge l'historique de l'utilisateur, le plus récent d'abord. */
export async function chargerHistorique(uid: string, max = 100): Promise<HistoriqueItem[]> {
  const ref = collection(db, 'utilisateurs', uid, 'historique');
  const q = query(ref, orderBy('date', 'desc'), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as HistoriqueItem);
}

export type DashboardStats = {
  plusScannes: HistoriqueItem[];
  meilleursScores: HistoriqueItem[];
};

/** Classements du tableau de bord (comme loadDashboard du web) : top 3 par nombre
 *  de scans, et top 3 par éco-score. */
export async function chargerStatsDashboard(uid: string): Promise<DashboardStats> {
  const ref = collection(db, 'utilisateurs', uid, 'historique');
  const snap = await getDocs(ref);
  const all = snap.docs.map((d) => d.data() as HistoriqueItem);
  const plusScannes = [...all]
    .sort((a, b) => (b.scanCount || 1) - (a.scanCount || 1))
    .slice(0, 3);
  const meilleursScores = all
    .filter((p) => typeof p.ecoScore === 'number')
    .sort((a, b) => (b.ecoScore as number) - (a.ecoScore as number))
    .slice(0, 3);
  return { plusScannes, meilleursScores };
}
