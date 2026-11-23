/**
 * base-produits.ts — LA base de données de Proserpine (Firestore), posée par-dessus Open*Facts.
 *
 * Principe : on ne recopie pas Open Food Facts. Ta base ne contient que ce qu'OFF ne sait pas (ou
 * sait mal) : surtout les CONSIGNES DE TRI. Le reste (nom, marque, photo) continue de venir d'OFF.
 *
 * Deux collections :
 *  - `produits/{ean}` : un document par produit connu de ta base. Lecture : tout utilisateur
 *    connecté. Écriture : toi seul (console Firebase pour l'instant).
 *  - `produits_introuvables/{ean}` : les EAN scannés mais inconnus d'OFF ET de ta base, avec un
 *    compteur. C'est la liste des produits à compléter, classée par fréquence de scan. Aucun
 *    identifiant d'utilisateur n'y est stocké. Lecture : toi seul.
 *
 * Contrat identique à `retours.ts` : aucune fonction ne lève d'exception vers l'écran.
 * Règles Firestore correspondantes : docs/firestore-retours.rules.
 */
import { doc, getDoc, increment, serverTimestamp, setDoc } from 'firebase/firestore';

import { rechercherProduitDetaille } from './api';
import { db } from './firebase';
import { genererInstructions } from './tri';

export const COLLECTION_PRODUITS = 'produits';
export const COLLECTION_INTROUVABLES = 'produits_introuvables';

/** D'où vient la consigne enregistrée : validée par toi, ou par la communauté (futur). */
export type FiabiliteBase = 'verifie' | 'communaute';

export type ComposantBase = { description: string; categorie: string };

/** Un document `produits/{ean}`. Seuls `composants` est obligatoire ; le reste complète OFF. */
export type ProduitBase = {
  nom?: string;
  marque?: string;
  /** Consigne de tri : un composant = un élément d'emballage et le bac où il va. */
  composants: ComposantBase[];
  /** Phrase de consigne ; si absente, elle est générée à partir des composants. */
  instructions?: string;
  fiabilite?: FiabiliteBase;
};

/** Au-delà de ce délai (réseau lent, hors-ligne), on ignore la base et on affiche ce qu'OFF donne. */
const DELAI_BASE_MS = 4000;

const BACS_VALIDES = ['pmc', 'paper', 'glass', 'organic', 'residual', 'danger'];

/** Garde le document seulement s'il est exploitable : on ne fait jamais confiance à un document mal formé. */
function lireDocument(donnees: any): ProduitBase | null {
  if (!donnees || !Array.isArray(donnees.composants)) return null;
  const composants = donnees.composants.filter(
    (c: any) => c && typeof c.description === 'string' && BACS_VALIDES.includes(c.categorie),
  );
  if (composants.length === 0) return null;
  return {
    nom: typeof donnees.nom === 'string' ? donnees.nom : undefined,
    marque: typeof donnees.marque === 'string' ? donnees.marque : undefined,
    composants,
    instructions: typeof donnees.instructions === 'string' ? donnees.instructions : undefined,
    fiabilite: donnees.fiabilite === 'communaute' ? 'communaute' : 'verifie',
  };
}

/** Lit `produits/{ean}`. Renvoie null s'il n'existe pas, s'il est illisible ou si la base ne répond pas à temps. */
export async function lireProduitBase(ean: string): Promise<ProduitBase | null> {
  try {
    const lecture = getDoc(doc(db, COLLECTION_PRODUITS, ean)).then((s) => (s.exists() ? lireDocument(s.data()) : null));
    const delai = new Promise<null>((resolve) => setTimeout(() => resolve(null), DELAI_BASE_MS));
    return await Promise.race([lecture, delai]);
  } catch {
    return null; // règles refusées, pas de réseau… : on se rabat sur OFF
  }
}

// EAN déjà notés pendant cette session : un même produit qu'on rescanne cinq fois de suite
// ne compte qu'une fois (sinon la fiche et le scan compteraient le même passage deux fois).
const dejaNotes = new Set<string>();

/**
 * Note un EAN introuvable (+1 au compteur). Silencieux : un échec n'a aucune conséquence pour l'utilisateur.
 * `setDoc(..., { merge: true })` + `increment(1)` crée le document au premier passage, l'incrémente ensuite,
 * sans qu'on ait besoin de LIRE (les utilisateurs n'ont pas le droit de lire cette collection).
 */
export async function noterIntrouvable(ean: string): Promise<void> {
  if (!/^[0-9]{8,14}$/.test(ean) || dejaNotes.has(ean)) return;
  dejaNotes.add(ean);
  try {
    await setDoc(
      doc(db, COLLECTION_INTROUVABLES, ean),
      { ean, compteur: increment(1), dernierScan: serverTimestamp() },
      { merge: true },
    );
  } catch {
    dejaNotes.delete(ean); // on pourra réessayer au prochain passage
  }
}

/**
 * Consigne de tri au format attendu par la fiche produit (le même que `analyserEmballage`).
 * Jamais `deduit` : une consigne de ta base n'est pas une supposition.
 */
export function triDepuisBase(base: ProduitBase) {
  return {
    composants: base.composants,
    instructions: base.instructions ?? genererInstructions(base.composants),
    source: 'base' as const,
    fiabiliteBase: base.fiabilite ?? 'verifie',
  };
}

/** Produit minimal pour un EAN absent d'OFF mais présent dans ta base (il faut au moins un nom). */
function produitDepuisBase(ean: string, base: ProduitBase) {
  return {
    ean,
    nom: base.nom || 'Produit inconnu',
    marque: base.marque || 'Marque inconnue',
    categorie: '',
    imageUrl: null,
    ingredients: null,
    emballage: null,
    pays_origine: null,
    source: 'proserpine',
    donnees_brutes: {}, // pas de données OFF : l'éco-score s'affichera « Non évalué »
  };
}

/**
 * Recherche complète d'un produit : ta base ET Open*Facts, interrogées EN PARALLÈLE.
 *
 *  - OFF connaît le produit : on l'affiche ; si ta base a une consigne, elle la remplace (`consigneBase`).
 *  - OFF ne le connaît pas mais ta base oui (avec un nom) : on affiche le produit de ta base.
 *  - Aucun des deux ET OFF a répondu « inconnu » partout : on note l'EAN dans les introuvables.
 *
 * `consigneBase` est rangée dans l'objet produit : le cache local la conserve, donc la fiche
 * s'ouvre aussi hors-ligne avec la bonne consigne.
 */
export async function chercherProduit(ean: string): Promise<any | null> {
  const [base, off] = await Promise.all([lireProduitBase(ean), rechercherProduitDetaille(ean)]);

  let produit: any = off.produit;
  if (!produit && base?.nom) produit = produitDepuisBase(ean, base);
  if (produit && base) produit = { ...produit, consigneBase: base };

  if (!produit && !base && off.introuvableCertain) {
    noterIntrouvable(ean); // sans attendre : n'allonge pas l'écran « introuvable »
  }
  return produit;
}
