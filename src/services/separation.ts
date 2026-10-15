/**
 * separation.ts — Quand faut-il dire à l'utilisateur de DÉTACHER une pièce ?
 *
 * Règle validée par Monsieur : le message « Retirez… » n'apparaît QUE si une pièce
 * collée à l'emballage va dans un bac DIFFÉRENT de celui du reste, et il dit
 * PRÉCISÉMENT quoi détacher (jamais un « Séparez les éléments » vague, qui s'affichait
 * même quand les éléments étaient déjà séparés).
 *
 * Exemple : pot en plastique + opercule en aluminium + bandeau en carton.
 *   - l'opercule va dans le même bac que le pot (PMC) → rien à dire ;
 *   - le bandeau va dans un autre bac (papiers et cartons) → « Retirez le bandeau
 *     en carton : il va dans les papiers et cartons. »
 *
 * Ce module est pur (aucun affichage, aucun réseau) : il sert au web et au natif.
 * À REVOIR plus tard avec le système de déduction (liste des pièces collées).
 */

/** Un bac et la liste de ses éléments (même forme que dans la fiche). */
export type BacSeparation = { categorie: string; elements: string[] };

// Pièces typiquement COLLÉES à un emballage principal, avec leur article.
// On ne retient un élément que s'il COMMENCE par l'un de ces noms : on évite ainsi
// de deviner le genre ou le sens d'une description plus compliquée.
const PIECES_DETACHABLES: Record<string, string> = {
  bandeau: 'le',
  manchon: 'le',
  opercule: 'l’',
  couvercle: 'le',
  collerette: 'la',
};

// « il va dans … », au bon article, pour chaque bac.
const DESTINATIONS: Record<string, string> = {
  pmc: 'le sac PMC',
  paper: 'les papiers et cartons',
  glass: 'le verre',
  organic: 'les déchets organiques',
  residual: 'les déchets résiduels',
  danger: 'le Recyparc',
};

/** Renvoie l'article de la pièce détachable si l'élément en est une, sinon null. */
function articleDe(element: string): string | null {
  const premierMot = element.trim().toLowerCase().split(/[\s’']/)[0];
  return PIECES_DETACHABLES[premierMot] ?? null;
}

/**
 * Renvoie le message précis à afficher, ou null s'il n'y a rien à détacher.
 * @param bacs les bacs de la fiche, avec leurs éléments
 */
export function messageSeparation(bacs: BacSeparation[]): string | null {
  // 1. Bacs du « reste » : ceux qui contiennent au moins un élément qui n'est PAS une pièce collée.
  const bacsPrincipaux = new Set<string>();
  for (const bac of bacs) {
    if (bac.elements.some((e) => articleDe(e) === null)) bacsPrincipaux.add(bac.categorie);
  }
  // Sans emballage principal, on ne sait pas « de quoi » détacher : on ne dit rien.
  if (bacsPrincipaux.size === 0) return null;

  // 2. Pièces collées dont le bac est différent de tous les bacs du reste.
  const consignes: string[] = [];
  for (const bac of bacs) {
    if (bacsPrincipaux.has(bac.categorie)) continue;
    const destination = DESTINATIONS[bac.categorie];
    if (!destination) continue;
    for (const element of bac.elements) {
      const article = articleDe(element);
      if (article === null) continue;
      const nom = element.trim();
      const minuscule = nom.charAt(0).toLowerCase() + nom.slice(1);
      // « l’opercule » s'écrit sans espace après l'apostrophe, « le bandeau » avec.
      const espace = article.endsWith('’') ? '' : ' ';
      consignes.push(`Retirez ${article}${espace}${minuscule} : il va dans ${destination}.`);
    }
  }

  return consignes.length > 0 ? consignes.join(' ') : null;
}
