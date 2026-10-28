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

// Limites de longueur (reprises à l'identique dans les règles Firestore).
export const LONGUEUR_MAX_AVIS = 500;
export const LONGUEUR_MAX_ACTION = 200;
export const LONGUEUR_MAX_DESCRIPTION = 1000;
export const LONGUEUR_MIN_DESCRIPTION = 10;

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
