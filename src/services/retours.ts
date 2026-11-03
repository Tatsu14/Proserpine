/**
 * retours.ts — Retours des utilisateurs : avis (feedback ciblé) et signalements de problème.
 *
 * Même contrat que `compte.ts` : on ne lève jamais d'exception vers l'écran, on renvoie
 * toujours { success, error }.
 *
 * Confidentialité : un retour ne contient AUCUNE donnée personnelle (ni identifiant, ni pseudo,
 * ni e-mail). Seules s'ajoutent des informations techniques : version de l'app, plateforme,
 * version du système et modèle de l'appareil. Il faut tout de même être connecté pour écrire
 * (règle Firestore dans docs/firestore-retours.rules).
 */
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Platform } from 'react-native';

import { db } from './firebase';

export type ResultatRetour = { success: boolean; error?: string };

export const COLLECTION_AVIS = 'retours_avis';
export const COLLECTION_SIGNALEMENTS = 'retours_signalements';
export const COLLECTION_CONSIGNES = 'retours_consignes';

/** Bacs de tri (mêmes identifiants que `CATEGORIES` dans tri.js). */
export const BACS = [
  { id: 'pmc', libelle: 'PMC' },
  { id: 'paper', libelle: 'Papiers & cartons' },
  { id: 'glass', libelle: 'Verre' },
  { id: 'organic', libelle: 'Déchets organiques' },
  { id: 'residual', libelle: 'Déchets résiduels' },
  { id: 'danger', libelle: 'Recyparc' },
] as const;

/** Origine de la consigne signalée : lue sur l'emballage, déduite ou choisie par l'utilisateur. */
export const ORIGINES_CONSIGNE = ['lu', 'deduit', 'choisi'] as const;

export const FONCTIONNALITES = [
  { id: 'scan', libelle: 'Scan' },
  { id: 'recherche', libelle: 'Recherche' },
  { id: 'guide', libelle: 'Guide de tri' },
  { id: 'indice', libelle: "Indice d'impact" },
  { id: 'profil', libelle: 'Profil' },
  { id: 'autre', libelle: 'Autre' },
] as const;

export const TYPES_AVIS = [
  { id: 'idee', libelle: 'Idée' },
  { id: 'difficulte', libelle: 'Difficulté' },
  { id: 'design', libelle: 'Design' },
  { id: 'eloge', libelle: 'Éloge' },
] as const;

export const GRAVITES = [
  { id: 'genant', libelle: 'Gênant', description: "Je peux continuer à utiliser l'app" },
  { id: 'bloquant', libelle: 'Bloquant', description: 'Je ne peux plus avancer' },
] as const;

export type Fonctionnalite = (typeof FONCTIONNALITES)[number]['id'];
export type TypeAvis = (typeof TYPES_AVIS)[number]['id'];
export type Gravite = (typeof GRAVITES)[number]['id'];
export type Bac = (typeof BACS)[number]['id'];
export type OrigineConsigne = (typeof ORIGINES_CONSIGNE)[number];

// Limites de longueur (reprises à l'identique dans les règles Firestore).
export const LONGUEUR_MAX_AVIS = 500;
export const LONGUEUR_MAX_ACTION = 200;
export const LONGUEUR_MAX_DESCRIPTION = 1000;
export const LONGUEUR_MIN_DESCRIPTION = 10;
export const LONGUEUR_MAX_COMMENTAIRE_CONSIGNE = 300;
export const LONGUEUR_MAX_DETAIL_CONSIGNE = 300;
export const LONGUEUR_MAX_NOM_PRODUIT = 120;

export type SaisieAvis = {
  fonctionnalite: Fonctionnalite | null;
  type: TypeAvis | null;
  note: number;
  commentaire: string;
};

export type SaisieSignalement = {
  fonctionnalite: Fonctionnalite | null;
  gravite: Gravite | null;
  action: string;
  description: string;
};

/** Signalement d'une consigne de tri fausse, depuis la fiche d'un produit. */
export type SaisieConsigne = {
  /** Code-barres du produit. */
  ean: string;
  /** Nom du produit (pour s'y retrouver dans l'écran admin). */
  nom: string;
  /** Bacs affichés sur la fiche au moment du signalement. */
  triAffiche: Bac[];
  /** Matières affichées dans ces bacs (texte libre, pour comprendre la consigne contestée). */
  detailAffiche: string;
  origine: OrigineConsigne;
  /** Bacs proposés par l'utilisateur ; vide = il n'a rien proposé. */
  triSuggere: Bac[];
  commentaire: string;
};

const ids = (liste: readonly { id: string }[]) => liste.map((e) => e.id);

/** Informations techniques jointes à chaque retour (aucune donnée personnelle). */
function infosTechniques() {
  return {
    versionApp: Constants.expoConfig?.version ?? 'inconnue',
    plateforme: Platform.OS,
    versionSysteme: Device.osVersion ?? null,
    modeleAppareil: Device.modelName ?? null,
  };
}

/** Renvoie un message d'erreur si la saisie est invalide, sinon null. */
export function verifierAvis(saisie: SaisieAvis): string | null {
  if (!saisie.fonctionnalite || !ids(FONCTIONNALITES).includes(saisie.fonctionnalite)) {
    return 'Choisissez ce sur quoi porte votre avis.';
  }
  if (!saisie.type || !ids(TYPES_AVIS).includes(saisie.type)) return 'Choisissez un type de retour.';
  if (!Number.isInteger(saisie.note) || saisie.note < 1 || saisie.note > 5) return 'Donnez une note de 1 à 5.';
  if (saisie.commentaire.trim().length > LONGUEUR_MAX_AVIS) {
    return `Le commentaire ne doit pas dépasser ${LONGUEUR_MAX_AVIS} caractères.`;
  }
  return null;
}

/** Renvoie un message d'erreur si la saisie est invalide, sinon null. */
export function verifierSignalement(saisie: SaisieSignalement): string | null {
  if (!saisie.fonctionnalite || !ids(FONCTIONNALITES).includes(saisie.fonctionnalite)) {
    return 'Indiquez où le problème est apparu.';
  }
  if (!saisie.gravite || !ids(GRAVITES).includes(saisie.gravite)) return 'Indiquez la gravité du problème.';
  if (saisie.action.trim().length > LONGUEUR_MAX_ACTION) {
    return `« Que faisiez-vous ? » ne doit pas dépasser ${LONGUEUR_MAX_ACTION} caractères.`;
  }
  const description = saisie.description.trim();
  if (description.length < LONGUEUR_MIN_DESCRIPTION) {
    return `Décrivez le problème en au moins ${LONGUEUR_MIN_DESCRIPTION} caractères.`;
  }
  if (description.length > LONGUEUR_MAX_DESCRIPTION) {
    return `La description ne doit pas dépasser ${LONGUEUR_MAX_DESCRIPTION} caractères.`;
  }
  return null;
}

/** Renvoie un message d'erreur si la saisie est invalide, sinon null. */
export function verifierConsigne(saisie: SaisieConsigne): string | null {
  if (!/^\d{4,20}$/.test(saisie.ean)) return 'Code du produit invalide.';
  const bacsValides = (liste: Bac[]) => liste.every((b) => ids(BACS).includes(b)) && new Set(liste).size === liste.length;
  if (saisie.triAffiche.length === 0 || !bacsValides(saisie.triAffiche)) return 'Consigne affichée invalide.';
  if (!bacsValides(saisie.triSuggere)) return 'Tri proposé invalide.';
  if (!ORIGINES_CONSIGNE.includes(saisie.origine)) return 'Origine de la consigne invalide.';
  if (saisie.commentaire.trim().length > LONGUEUR_MAX_COMMENTAIRE_CONSIGNE) {
    return `Le commentaire ne doit pas dépasser ${LONGUEUR_MAX_COMMENTAIRE_CONSIGNE} caractères.`;
  }
  return null;
}

const MESSAGE_ECHEC = "L'envoi a échoué. Vérifiez votre connexion puis réessayez.";

export async function envoyerAvis(saisie: SaisieAvis): Promise<ResultatRetour> {
  const erreur = verifierAvis(saisie);
  if (erreur) return { success: false, error: erreur };
  try {
    await addDoc(collection(db, COLLECTION_AVIS), {
      fonctionnalite: saisie.fonctionnalite,
      type: saisie.type,
      note: saisie.note,
      commentaire: saisie.commentaire.trim(),
      ...infosTechniques(),
      creeLe: serverTimestamp(),
    });
    return { success: true };
  } catch {
    return { success: false, error: MESSAGE_ECHEC };
  }
}

export async function envoyerSignalement(saisie: SaisieSignalement): Promise<ResultatRetour> {
  const erreur = verifierSignalement(saisie);
  if (erreur) return { success: false, error: erreur };
  try {
    await addDoc(collection(db, COLLECTION_SIGNALEMENTS), {
      fonctionnalite: saisie.fonctionnalite,
      gravite: saisie.gravite,
      action: saisie.action.trim(),
      description: saisie.description.trim(),
      ...infosTechniques(),
      creeLe: serverTimestamp(),
    });
    return { success: true };
  } catch {
    return { success: false, error: MESSAGE_ECHEC };
  }
}

export async function envoyerSignalementConsigne(saisie: SaisieConsigne): Promise<ResultatRetour> {
  const erreur = verifierConsigne(saisie);
  if (erreur) return { success: false, error: erreur };
  try {
    await addDoc(collection(db, COLLECTION_CONSIGNES), {
      ean: saisie.ean,
      nom: saisie.nom.trim().slice(0, LONGUEUR_MAX_NOM_PRODUIT),
      triAffiche: saisie.triAffiche,
      detailAffiche: saisie.detailAffiche.trim().slice(0, LONGUEUR_MAX_DETAIL_CONSIGNE),
      origine: saisie.origine,
      triSuggere: saisie.triSuggere,
      commentaire: saisie.commentaire.trim(),
      ...infosTechniques(),
      creeLe: serverTimestamp(),
    });
    return { success: true };
  } catch {
    return { success: false, error: MESSAGE_ECHEC };
  }
}
