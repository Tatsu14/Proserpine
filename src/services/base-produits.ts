/**
 * base-produits.ts — LA base de produits de Proserpine (Supabase), lue via la fonction serveur.
 *
 * Principe : au scan, l'app interroge EN PARALLÈLE la base de Proserpine et Open Food Facts (OFF).
 *  - La base connaît le produit et a une consigne (des emballages avec un bac) : cette consigne REMPLACE
 *    le calcul fait à partir d'OFF, et la fiche l'affiche comme « Vérifié par Proserpine ».
 *  - La base connaît le produit mais sans consigne : on garde le calcul OFF (et le nom de la base).
 *  - Seule la base le connaît (produit ajouté par Proserpine) : la fiche s'affiche avec les données de la base.
 *  - La base ne répond pas à temps (réseau lent, hors connexion) : on ignore la base, OFF suffit.
 *
 * La consigne de la base est rangée dans l'objet produit (`consigneBase`) : le cache local la garde, la
 * fiche s'ouvre donc aussi hors connexion avec la bonne consigne.
 */
import { rechercherProduitParEAN } from './api';
import { appelerApi } from './api-proserpine';
import { genererInstructions } from './tri';

/** Les 7 bacs de la base (table prive.bacs) et la catégorie de l'app qui leur correspond. */
export const BACS_BASE = [
  { id: 'pmc', libelle: 'Sac bleu (PMC)', categorie: 'pmc' },
  { id: 'papier_carton', libelle: 'Papiers & cartons', categorie: 'paper' },
  { id: 'verre_transparent', libelle: 'Verre transparent', categorie: 'glass' },
  { id: 'verre_colore', libelle: 'Verre coloré', categorie: 'glass' },
  { id: 'organique', libelle: 'Déchets organiques', categorie: 'organic' },
  { id: 'residuel', libelle: 'Déchets résiduels', categorie: 'residual' },
  { id: 'recyparc', libelle: 'Recyparc', categorie: 'danger' },
] as const;

export type BacBase = (typeof BACS_BASE)[number]['id'];

/** Couches d'emballage (colonne « couche » de la base). */
export const COUCHES = [
  { id: 'contenant', libelle: 'Contenant' },
  { id: 'fermeture', libelle: 'Fermeture' },
  { id: 'sur_emballage', libelle: 'Suremballage' },
  { id: 'etiquette', libelle: 'Étiquette' },
  { id: 'calage', libelle: 'Calage' },
  { id: 'autre', libelle: 'Autre' },
] as const;

export type Couche = (typeof COUCHES)[number]['id'];

export type EmballageBase = { niveau: 'pack' | 'unite'; couche: Couche; nom: string; bac: BacBase | null };

export type ProduitBase = {
  ean: string;
  origine: string;
  nom: string | null;
  marque: string | null;
  quantite: string | null;
  emballages: EmballageBase[];
};

/** Première lettre en majuscule (« sachet plastique » → « Sachet plastique »), le reste inchangé. */
export const majuscule = (texte: string) => {
  const t = texte.trim();
  return t.charAt(0).toLocaleUpperCase('fr') + t.slice(1);
};

export const libelleBac = (id: string | null) => BACS_BASE.find((b) => b.id === id)?.libelle ?? 'Bac inconnu';
export const libelleCouche = (id: string) => COUCHES.find((c) => c.id === id)?.libelle ?? id;

/** Au-delà de ce délai, on n'attend plus la base : la fiche s'affiche avec Open Food Facts seul. */
const DELAI_BASE_MS = 4000;

const texteOuNul = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v : null);

/** On ne fait jamais confiance à une réponse mal formée : un emballage incomplet est écarté. */
function lireEmballage(e: any): EmballageBase | null {
  if (!e || typeof e.nom !== 'string' || e.nom.trim() === '') return null;
  const bac = BACS_BASE.some((b) => b.id === e.bac) ? (e.bac as BacBase) : null;
  const couche = COUCHES.some((c) => c.id === e.couche) ? (e.couche as Couche) : 'autre';
  return { niveau: e.niveau === 'pack' ? 'pack' : 'unite', couche, nom: e.nom, bac };
}

/** Lit un produit dans la base de Proserpine. null : absent, illisible, ou pas de réponse à temps. */
export async function lireProduitBase(ean: string): Promise<ProduitBase | null> {
  const r = await appelerApi<any>('lire_produit', { ean }, DELAI_BASE_MS);
  if (!r.ok || !r.donnees || r.donnees.trouve !== true) return null;
  const d = r.donnees;
  return {
    ean: typeof d.ean === 'string' ? d.ean : ean,
    origine: typeof d.origine === 'string' ? d.origine : 'proserpine',
    nom: texteOuNul(d.nom),
    marque: texteOuNul(d.marque),
    quantite: texteOuNul(d.quantite),
    emballages: (Array.isArray(d.emballages) ? d.emballages : []).map(lireEmballage).filter(Boolean) as EmballageBase[],
  };
}

/**
 * Consigne de la base au format de la fiche (le même que `analyserEmballage`).
 * Seuls les emballages dont le bac est connu comptent ; aucun → null (on garde alors le calcul OFF).
 */
export function triDepuisBase(base: ProduitBase | null | undefined) {
  if (!base) return null;
  const composants = base.emballages.flatMap((e) => {
    const bac = BACS_BASE.find((b) => b.id === e.bac);
    return bac ? [{ description: majuscule(e.nom), categorie: bac.categorie }] : [];
  });
  if (composants.length === 0) return null;
  return { composants, instructions: genererInstructions(composants), source: 'base' as const };
}

/** Produit présent seulement dans la base : même forme qu'un produit d'Open Food Facts (api.js). */
function produitDepuisBase(base: ProduitBase) {
  return {
    ean: base.ean,
    nom: base.nom || 'Produit inconnu',
    marque: base.marque || 'Marque inconnue',
    categorie: '',
    imageUrl: null,
    ingredients: null,
    emballage: null,
    pays_origine: null,
    source: 'proserpine',
    donnees_brutes: base.quantite ? { quantity: base.quantite } : {}, // pas de données OFF : indice « Non évalué »
    consigneBase: base,
  };
}

/**
 * Recherche complète d'un produit : base de Proserpine ET Open Food Facts, en parallèle.
 * Le nom et la marque de la base, quand ils existent, priment (ils ont pu être corrigés par l'administrateur).
 */
export async function chercherProduit(ean: string): Promise<any | null> {
  const [base, off]: [ProduitBase | null, any] = await Promise.all([lireProduitBase(ean), rechercherProduitParEAN(ean)]);
  if (!base) return off ?? null;
  if (!off) return produitDepuisBase(base);
  return {
    ...off,
    nom: base.nom ?? off.nom,
    marque: base.marque ?? off.marque,
    consigneBase: base,
  };
}
