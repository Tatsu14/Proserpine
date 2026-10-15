/**
 * affichage-produit.ts — Mise en forme des noms de produits et de marques pour l'AFFICHAGE.
 *
 * Open Food Facts renvoie des textes saisis par des contributeurs : listes de marques
 * (« Nestlé, San Pellegrino, Nestlé Waters, S. pellegrino »), raisons sociales entières
 * (« Melitta Europa GmbH & Co.KG Geschäftsbereich Kaffeezubereitung »), noms en capitales
 * (« PET 1.25L FUZETEA PECHE HIB »), quantité collée au nom (« … Boîte 350g »).
 * Ils débordent des cartes et alourdissent la fiche.
 *
 * Ce module ne change JAMAIS les données enregistrées : il propose seulement un texte
 * plus court et mieux écrit à afficher. Module pur (aucun affichage), testable.
 */

// Formes juridiques à partir desquelles on coupe une raison sociale (« Melitta Europa | GmbH … »).
const FORMES_JURIDIQUES = /\s+(?:GmbH|AG|SAS|SARL|SA|S\.A\.|NV|BV|B\.V\.|Ltd\.?|Limited|Inc\.?|Co\.?\s?KG|&\s*Co\b|SpA|S\.p\.A\.)(?:\b|\.|\s).*$/i;

/** Un texte entièrement en capitales (au moins 3 lettres) est du « cri » à adoucir. */
function estToutEnCapitales(texte: string): boolean {
  const lettres = texte.replace(/[^A-Za-zÀ-ÿ]/g, '');
  return lettres.length >= 3 && texte === texte.toUpperCase();
}

/** « PET 1.25L FUZETEA » → « Pet 1.25L Fuzetea » (un mot qui contient un chiffre garde ses capitales). */
function enTitre(texte: string): string {
  return texte
    .split(' ')
    .map((mot) => (/\d/.test(mot) ? mot : mot.charAt(0).toUpperCase() + mot.slice(1).toLowerCase()))
    .join(' ');
}

function nettoyer(texte: string | null | undefined): string {
  return String(texte ?? '').replace(/\s+/g, ' ').trim();
}

/** Coupe proprement à `max` caractères, sur une limite de mot, avec « … ». */
function raccourcir(texte: string, max: number): string {
  if (texte.length <= max) return texte;
  const coupe = texte.slice(0, max);
  const dernierEspace = coupe.lastIndexOf(' ');
  return (dernierEspace > max * 0.5 ? coupe.slice(0, dernierEspace) : coupe).replace(/[ ,;:-]+$/, '') + '…';
}

/** Marque à afficher : la PREMIÈRE de la liste, sans raison sociale, en casse normale, de longueur raisonnable. */
export function formaterMarque(marque: string | null | undefined, max = 24): string {
  const premiere = nettoyer(marque).split(/[;,]/)[0]?.trim() ?? '';
  if (!premiere) return '';
  const sansForme = premiere.replace(FORMES_JURIDIQUES, '').trim() || premiere;
  const propre = estToutEnCapitales(sansForme) ? enTitre(sansForme) : sansForme;
  return raccourcir(propre, max);
}

// Quantité collée à la fin d'un nom : « 350g », « 1.25L », « 50 cl »…
const QUANTITE_FIN = /\s+(\d+(?:[.,]\d+)?)\s?(kg|g|mg|ml|cl|dl|l|L)\.?$/;

/** « 200 gram » → « 200 g », « 350g » → « 350 g », « 75cL » → « 75 cl », « 1.25 l » → « 1,25 L ». */
export function formaterQuantite(quantite: string | null | undefined): string {
  const brut = nettoyer(quantite);
  if (!brut) return '';
  // On garde l'expression complète si elle est composée (« 130 g (3 x 43,3 g) », « 80stuks, 173 g. »).
  const simple = brut.match(/^(\d+(?:[.,]\d+)?)\s?(kg|g|gram|grammes?|mg|ml|cl|dl|l|litres?)\.?$/i);
  if (!simple) return raccourcir(brut, 22);
  const nombre = simple[1].replace('.', ',');
  const unite = simple[2].toLowerCase();
  if (unite.startsWith('gram')) return `${nombre} g`;
  if (unite.startsWith('litre') || unite === 'l') return `${nombre} L`;
  return `${nombre} ${unite}`;
}

// Mots qui annoncent des DÉTAILS commerciaux, pas le type de produit (« Mouchoirs | Confort 4 épaisseurs… »).
const MOTS_DETAIL = new Set([
  'confort', 'comfort', 'ultra', 'maxi', 'format', 'pack', 'lot',
  'familial', 'familiale', 'gourmand', 'gourmande',
]);
const LONGUEUR_MAX_TITRE = 32;

/**
 * Abrège un nom trop détaillé : on garde le début (le TYPE de produit) et on coupe dès le premier
 * chiffre ou mot de détail. « Mouchoirs Confort 4 Epaisseurs Ultra Doux FSC » → « Mouchoirs ».
 * Filet de sécurité : au-delà de 32 caractères, on coupe sur une limite de mot avec « … ».
 */
export function abregerTitre(titre: string): string {
  const mots = titre.split(' ');
  // Premier mot qui annonce un détail, mais jamais en tout premier (il faut garder un type de produit).
  const coupe = mots.findIndex((mot, i) => i > 0 && (/[0-9]/.test(mot) || MOTS_DETAIL.has(mot.toLowerCase())));
  let court = coupe > 0 ? mots.slice(0, coupe).join(' ') : titre;
  // On ne garde pas une coupe trop pauvre (moins de 5 lettres) : mieux vaut le nom entier.
  if (court.length < 5) court = titre;
  return raccourcir(court, LONGUEUR_MAX_TITRE);
}

export type ProduitAffiche = {
  /** Nom court, en casse normale, sans la quantité ni la marque en tête. */
  titre: string;
  /** Ligne secondaire : « Marque · quantité ». */
  sousTitre: string;
  /** Nom d'origine, complet (pour un éventuel affichage détaillé). */
  titreComplet: string;
};

/**
 * Titre et sous-titre de la fiche produit.
 * La quantité (« 265g ») sort du titre et passe dans le sous-titre ; le nom de la marque
 * n'est retiré du début du titre que s'il reste ensuite un vrai nom.
 */
export function formaterProduit(nom: string | null | undefined, marque: string | null | undefined, quantite?: string | null): ProduitAffiche {
  let titre = nettoyer(nom);
  let quantiteAffichee = formaterQuantite(quantite);

  // 1. La quantité collée en fin de nom devient la quantité du sous-titre.
  const fin = titre.match(QUANTITE_FIN);
  if (fin) {
    titre = titre.slice(0, fin.index).trim();
    if (!quantiteAffichee) quantiteAffichee = formaterQuantite(`${fin[1]}${fin[2]}`);
  }

  // 2. Casse : un nom en capitales passe en « Titre ».
  if (estToutEnCapitales(titre)) titre = enTitre(titre);

  // 3. Marque en tête du nom (« HERTA Pâte à pizza… » avec marque « Herta ») : retirée, c'est redondant.
  const marqueAffichee = formaterMarque(marque);
  if (marqueAffichee) {
    const tete = new RegExp(`^${marqueAffichee.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+(.{6,})$`, 'i');
    const m = titre.match(tete);
    if (m && m[1].trim().split(' ').length >= 2) titre = m[1];
  }

  const sousTitre = [marqueAffichee, quantiteAffichee].filter(Boolean).join(' · ');
  const final = abregerTitre(titre || nettoyer(nom));
  return { titre: final.charAt(0).toUpperCase() + final.slice(1), sousTitre, titreComplet: nettoyer(nom) };
}

/** Nom pour les listes et les cartes : on adoucit les capitales, on garde le reste (le texte est déjà tronqué par l'écran). */
export function formaterNomListe(nom: string | null | undefined, marque?: string | null): string {
  return formaterProduit(nom, marque).titre;
}
