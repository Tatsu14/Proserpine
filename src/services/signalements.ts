/**
 * signalements.ts — Signaler une erreur depuis la fiche produit (mise à jour 2, option A).
 *
 *  - « consigne » : pour chaque élément d'emballage affiché, l'utilisateur dit s'il est dans le bon bac ou
 *    propose le bon ; il peut aussi ajouter un élément manquant ;
 *  - « produit »  : nom, marque, quantité faux, ou le code-barres correspond à un autre produit.
 *
 * Envoi par la fonction serveur (base Proserpine, schéma fermé), comme les propositions. La base refait tous les
 * contrôles ; ceux d'ici servent seulement à afficher un message clair avant l'envoi (signalement vide, etc.).
 */
import { appelerApi } from './api-proserpine';

/** Bacs affichés par l'app (catégories des cartes de tri). */
export const BACS_SIGNALEMENT = [
  { id: 'pmc', libelle: 'PMC' },
  { id: 'paper', libelle: 'Papiers & cartons' },
  { id: 'glass', libelle: 'Verre' },
  { id: 'organic', libelle: 'Organiques' },
  { id: 'residual', libelle: 'Résiduels' },
  { id: 'danger', libelle: 'Recyparc' },
] as const;
export type BacSignalement = (typeof BACS_SIGNALEMENT)[number]['id'];

export const libelleBacSignalement = (id: string | null) => BACS_SIGNALEMENT.find((b) => b.id === id)?.libelle ?? '—';
export const estBacSignalement = (id: unknown): id is BacSignalement => BACS_SIGNALEMENT.some((b) => b.id === id);

export const CHAMPS_PRODUIT = [
  { id: 'nom', libelle: 'Le nom' },
  { id: 'marque', libelle: 'La marque' },
  { id: 'quantite', libelle: 'La quantité' },
  { id: 'autre_produit', libelle: 'Ce n’est pas ce produit (le code-barres correspond à un autre)' },
] as const;
export type ChampProduit = (typeof CHAMPS_PRODUIT)[number]['id'];

export const LONGUEUR_MAX_TEXTE = 300;
export const MAX_ELEMENTS = 20;

/** Un élément affiché sur la fiche, transmis à l'écran de signalement. */
export type ElementAffiche = { nom: string; bac: BacSignalement };

export type ElementSignale = { nom: string; bac_affiche: BacSignalement | null; bac_propose: BacSignalement | null; ajoute: boolean };

/** Origine de la consigne affichée (fiabilité de la fiche) ; « aucune » n'est pas transmise. */
export type OrigineSignalement = 'verifie' | 'lu' | 'deduit' | 'choisi';

/** Lit la liste des éléments passée en paramètre de route (texte JSON), sans jamais planter. */
export function lireElements(texte: string): ElementAffiche[] {
  try {
    const brut = JSON.parse(texte);
    if (!Array.isArray(brut)) return [];
    return brut
      .filter((e) => e && typeof e.nom === 'string' && e.nom.trim() !== '' && estBacSignalement(e.bac))
      .slice(0, MAX_ELEMENTS)
      .map((e) => ({ nom: e.nom.trim().slice(0, 100), bac: e.bac }));
  } catch {
    return [];
  }
}

export function envoyerSignalementConsigne(s: {
  ean: string;
  nomProduit: string;
  origine: OrigineSignalement | null;
  elements: ElementSignale[];
  commentaire: string;
}) {
  return appelerApi<{ id: number }>('signaler', {
    type: 'consigne',
    ean: s.ean,
    nom_produit: s.nomProduit || null,
    origine: s.origine,
    elements: s.elements,
    commentaire: s.commentaire.trim() || null,
  });
}

export function envoyerSignalementProduit(s: { ean: string; nomProduit: string; champs: ChampProduit[]; correction: string }) {
  return appelerApi<{ id: number }>('signaler', {
    type: 'produit',
    ean: s.ean,
    nom_produit: s.nomProduit || null,
    champs: s.champs,
    correction: s.correction.trim() || null,
  });
}
