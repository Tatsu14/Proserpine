/**
 * admin-base.ts — Actions d'administration sur la base de produits (via la fonction serveur).
 *
 * Toutes ces actions sont refusées par le serveur si le compte connecté n'est pas l'administrateur :
 * masquer l'écran ne suffirait pas, c'est le serveur qui protège.
 */
import { appelerApi, type ReponseApi } from './api-proserpine';
import type { BacBase, Couche } from './base-produits';

export type StatutProposition = 'en_attente' | 'accepte' | 'refuse';

export type EmballagePropose = { niveau: 'pack' | 'unite'; couche: Couche; nom: string; bac: BacBase | null };

export type Proposition = {
  id: number;
  ean: string;
  nom: string;
  marque: string | null;
  emballages_proposes: EmballagePropose[] | null;
  statut: StatutProposition;
  motif_refus: string | null;
  cree_le: string;
  traite_le: string | null;
  utilisateur_id: string | null;
  deja_connu: boolean;
  nb_meme_code: number;
};

export type ListePropositions = {
  compteurs: Record<StatutProposition, number>;
  propositions: Proposition[];
};

export type SourceEmballage = 'intradel' | 'moi' | 'off' | 'doute';

/** Un emballage tel que l'administrateur le saisit (avec sa source et un commentaire). */
export type EmballageAdmin = {
  niveau: 'pack' | 'unite';
  couche: Couche;
  nom: string;
  bac: BacBase | null;
  source: SourceEmballage;
  commentaire: string | null;
};

export type ProduitResume = {
  ean: string;
  origine: string;
  nom: string | null;
  marque: string | null;
  quantite: string | null;
  modifie_par_proserpine: boolean;
  nb_emballages: number;
};

export type FicheEmballages = {
  ean: string;
  nom: string | null;
  marque: string | null;
  emballages: (EmballageAdmin & { id: number })[];
  bacs: { code: BacBase; libelle: string }[];
};

export const SOURCES_EMBALLAGE: readonly { id: SourceEmballage; libelle: string }[] = [
  { id: 'moi', libelle: 'Moi' },
  { id: 'intradel', libelle: 'Intradel' },
  { id: 'off', libelle: 'Open Food Facts' },
  { id: 'doute', libelle: 'Doute' },
];

export const listerPropositions = (statut: StatutProposition): Promise<ReponseApi<ListePropositions>> =>
  appelerApi<ListePropositions>('admin_lister_propositions', { statut });

export const accepterProposition = (
  id: number,
  corrections: { nom: string; marque: string; emballages: EmballageAdmin[] | null },
) => appelerApi('admin_decider', { id, decision: 'accepter', ...corrections });

export const refuserProposition = (id: number, motif: string) =>
  appelerApi('admin_decider', { id, decision: 'refuser', motif });

export const chercherProduits = (terme: string) =>
  appelerApi<{ produits: ProduitResume[] }>('admin_chercher_produits', { terme });

export const creerProduit = (p: { ean: string; nom: string; marque: string; quantite: string }) =>
  appelerApi('admin_creer_produit', p);

export const modifierProduit = (p: { ean: string; nom: string; marque: string; quantite: string }) =>
  appelerApi('admin_modifier_produit', p);

export const lireEmballages = (ean: string) => appelerApi<FicheEmballages>('admin_lire_emballages', { ean });

export const remplacerEmballages = (ean: string, emballages: EmballageAdmin[]) =>
  appelerApi<{ nb_emballages: number }>('admin_remplacer_emballages', { ean, emballages });
