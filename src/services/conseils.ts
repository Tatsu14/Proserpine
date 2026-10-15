/**
 * conseils.ts — Quel « Conseil de tri » afficher sur une fiche ?
 *
 * TEXTES PROVISOIRES : Monsieur sait qu'ils changeront. À relire un par un et à
 * recouper avec une source officielle (trionsmieux.be, Intradel) avant la diffusion.
 *
 * Règles (celles des maquettes validées) :
 *  - plusieurs bacs  → conseil général (inutile de rincer un emballage vide) ;
 *  - un seul bac     → conseil propre à ce bac (une brique de boisson a le sien) ;
 *  - Recyparc seul   → aucun conseil (le message de sécurité suffit).
 *
 * Module pur : aucun affichage, aucun réseau. Sert au web et au natif.
 */

export type BacConseil = { categorie: string; elements: string[] };

// Conseil général validé par Monsieur : inutile de rincer un emballage vide.
export const CONSEIL_GENERAL =
  'Inutile de rincer un emballage vide : il doit seulement ne pas être trop souillé. S’il reste beaucoup de produit, videz-le d’abord.';

// Une brique de boisson a un texte à elle (texte de la maquette).
const CONSEIL_BRIQUE = 'Les briques de lait et de jus vont dans le sac PMC.';

// Conseils propres à chaque bac (provisoires). Le texte du carton vient de la maquette.
const CONSEILS_PAR_BAC: Record<string, string> = {
  pmc: 'Plastique, métal et briques de boisson vont ensemble dans le sac PMC. Inutile de les rincer : il suffit de les vider.',
  paper: 'Le carton ondulé doit être aplati avant d’aller dans la collecte papier/carton.',
  glass: 'Triez le verre par couleur : transparent dans la bulle blanche, coloré dans la bulle colorée. Retirez bouchons et couvercles.',
  organic: 'Les restes de cuisine et de jardin vont dans les déchets organiques, sans sac en plastique.',
  residual: 'Ce qui ne se recycle pas va aux déchets résiduels. Rien ne sert de le rincer.',
};

/**
 * Renvoie le conseil à afficher, ou null s'il n'y en a pas.
 * @param bacs les bacs affichés sur la fiche
 */
export function conseilPour(bacs: BacConseil[]): string | null {
  if (bacs.length === 0) return null;
  if (bacs.length > 1) return CONSEIL_GENERAL;

  const [bac] = bacs;
  // Recyparc seul : le message de sécurité suffit, un conseil de rinçage serait hors sujet.
  if (bac.categorie === 'danger') return null;
  if (bac.categorie === 'pmc' && bac.elements.some((e) => /brique/i.test(e))) return CONSEIL_BRIQUE;
  return CONSEILS_PAR_BAC[bac.categorie] ?? CONSEIL_GENERAL;
}
