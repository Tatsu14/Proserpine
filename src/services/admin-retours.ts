/**
 * admin-retours.ts — Lecture des retours et changement de statut (écran Administration).
 *
 * Seul le compte administrateur y a accès : les règles Firestore refusent la lecture aux autres
 * (docs/firestore-retours.rules). Même contrat que les autres services : on ne « throw » jamais,
 * on renvoie { success, ... }.
 */
import { collection, doc, getDocs, limit, orderBy, query, updateDoc } from 'firebase/firestore';

import { db } from './firebase';
import {
  COLLECTION_AVIS,
  COLLECTION_CONSIGNES,
  COLLECTION_SIGNALEMENTS,
  type Bac,
  type Fonctionnalite,
  type Gravite,
  type OrigineConsigne,
  type TypeAvis,
} from './retours';

export const STATUTS = [
  { id: 'nouveau', libelle: 'Nouveau' },
  { id: 'en_cours', libelle: 'En cours' },
  { id: 'traite', libelle: 'Traité' },
] as const;

export type Statut = (typeof STATUTS)[number]['id'];

/** Nombre maximum de retours chargés par collection (les plus récents). */
export const LIMITE_CHARGEMENT = 200;

type Technique = {
  versionApp: string;
  plateforme: string;
  versionSysteme: string | null;
  modeleAppareil: string | null;
};

export type Avis = Technique & {
  id: string;
  fonctionnalite: Fonctionnalite;
  type: TypeAvis;
  note: number;
  commentaire: string;
  creeLe: Date | null;
  statut: Statut;
};

export type Signalement = Technique & {
  id: string;
  fonctionnalite: Fonctionnalite;
  gravite: Gravite;
  action: string;
  description: string;
  creeLe: Date | null;
  statut: Statut;
};

export type ConsigneSignalee = Technique & {
  id: string;
  ean: string;
  nom: string;
  triAffiche: Bac[];
  detailAffiche: string;
  origine: OrigineConsigne;
  triSuggere: Bac[];
  commentaire: string;
  creeLe: Date | null;
  statut: Statut;
};

export type ResultatChargement<T> = { success: true; donnees: T[] } | { success: false; error: string };

const MESSAGE_ECHEC = 'Chargement impossible. Vérifiez votre connexion et vos droits.';

/** Un retour sans statut (envoyé depuis l'app) compte comme « Nouveau ». */
function lireStatut(valeur: unknown): Statut {
  return STATUTS.some((s) => s.id === valeur) ? (valeur as Statut) : 'nouveau';
}

function lireDate(valeur: any): Date | null {
  return typeof valeur?.toDate === 'function' ? valeur.toDate() : null;
}

function technique(d: any): Technique {
  return {
    versionApp: d.versionApp ?? 'inconnue',
    plateforme: d.plateforme ?? 'inconnue',
    versionSysteme: d.versionSysteme ?? null,
    modeleAppareil: d.modeleAppareil ?? null,
  };
}

export async function chargerAvis(): Promise<ResultatChargement<Avis>> {
  try {
    const instantane = await getDocs(
      query(collection(db, COLLECTION_AVIS), orderBy('creeLe', 'desc'), limit(LIMITE_CHARGEMENT)),
    );
    const donnees = instantane.docs.map((s) => {
      const d = s.data() as any;
      return {
        id: s.id,
        fonctionnalite: d.fonctionnalite,
        type: d.type,
        note: d.note,
        commentaire: d.commentaire ?? '',
        creeLe: lireDate(d.creeLe),
        statut: lireStatut(d.statut),
        ...technique(d),
      } as Avis;
    });
    return { success: true, donnees };
  } catch {
    return { success: false, error: MESSAGE_ECHEC };
  }
}

export async function chargerSignalements(): Promise<ResultatChargement<Signalement>> {
  try {
    const instantane = await getDocs(
      query(collection(db, COLLECTION_SIGNALEMENTS), orderBy('creeLe', 'desc'), limit(LIMITE_CHARGEMENT)),
    );
    const donnees = instantane.docs.map((s) => {
      const d = s.data() as any;
      return {
        id: s.id,
        fonctionnalite: d.fonctionnalite,
        gravite: d.gravite,
        action: d.action ?? '',
        description: d.description ?? '',
        creeLe: lireDate(d.creeLe),
        statut: lireStatut(d.statut),
        ...technique(d),
      } as Signalement;
    });
    return { success: true, donnees };
  } catch {
    return { success: false, error: MESSAGE_ECHEC };
  }
}

export async function chargerConsignes(): Promise<ResultatChargement<ConsigneSignalee>> {
  try {
    const instantane = await getDocs(
      query(collection(db, COLLECTION_CONSIGNES), orderBy('creeLe', 'desc'), limit(LIMITE_CHARGEMENT)),
    );
    const donnees = instantane.docs.map((s) => {
      const d = s.data() as any;
      return {
        id: s.id,
        ean: d.ean ?? '',
        nom: d.nom ?? '',
        triAffiche: Array.isArray(d.triAffiche) ? d.triAffiche : [],
        detailAffiche: d.detailAffiche ?? '',
        origine: d.origine,
        triSuggere: Array.isArray(d.triSuggere) ? d.triSuggere : [],
        commentaire: d.commentaire ?? '',
        creeLe: lireDate(d.creeLe),
        statut: lireStatut(d.statut),
        ...technique(d),
      } as ConsigneSignalee;
    });
    return { success: true, donnees };
  } catch {
    return { success: false, error: MESSAGE_ECHEC };
  }
}

/** Change le statut d'un retour. Les règles n'autorisent à modifier que ce champ. */
export async function changerStatut(
  collectionRetours: typeof COLLECTION_AVIS | typeof COLLECTION_SIGNALEMENTS | typeof COLLECTION_CONSIGNES,
  id: string,
  statut: Statut,
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateDoc(doc(db, collectionRetours, id), { statut });
    return { success: true };
  } catch {
    return { success: false, error: 'Le statut n\'a pas pu être modifié.' };
  }
}

/** Statut suivant dans le cycle Nouveau → En cours → Traité → Nouveau. */
export function statutSuivant(statut: Statut): Statut {
  const i = STATUTS.findIndex((s) => s.id === statut);
  return STATUTS[(i + 1) % STATUTS.length].id;
}
