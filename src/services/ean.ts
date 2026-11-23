/**
 * ean.ts — Contrôle des codes-barres lus par la caméra (EAN-8 et EAN-13).
 *
 * Pourquoi ce fichier : la caméra se trompe parfois de quelques chiffres. Sans contrôle, l'app
 * affichait la fiche d'un autre produit (ou « Produit non trouvé ») dès la PREMIÈRE lecture.
 * Deux protections, indépendantes et cumulées :
 *
 *  (a) La CLÉ DE CONTRÔLE. Le dernier chiffre d'un code-barres est calculé à partir des autres.
 *      Si une lecture ne respecte pas ce calcul, le code est impossible : on l'ignore.
 *      Limite : une erreur de lecture passe ce contrôle environ 1 fois sur 10 par pur hasard.
 *
 *  (b) La CONFIRMATION. Un code n'est accepté que s'il est lu deux fois de suite, à moins de
 *      `fenetreMs` d'écart. Une lecture isolée et fausse est donc écartée. Dès qu'un autre code
 *      valide apparaît, le compte repart à zéro.
 *
 * Ce fichier ne dépend ni de React ni de la caméra : il se teste seul, avec Node.
 */

/** Vrai si `code` est un EAN-8 ou un EAN-13 dont le dernier chiffre (la clé) est correct. */
export function cleEanValide(code: string): boolean {
  if (!/^(\d{8}|\d{13})$/.test(code)) return false;

  const chiffres = code.split('').map(Number);
  const cle = chiffres.pop() as number; // le dernier chiffre est la clé : on le met de côté

  // On parcourt les chiffres restants de droite à gauche : poids 3, puis 1, puis 3, puis 1…
  let somme = 0;
  for (let i = chiffres.length - 1, poids = 3; i >= 0; i--, poids = poids === 3 ? 1 : 3) {
    somme += chiffres[i] * poids;
  }
  // La clé complète la somme jusqu'à la dizaine supérieure.
  return (10 - (somme % 10)) % 10 === cle;
}

/** Résultat d'une lecture : ignorée (code impossible), à confirmer par une seconde lecture, ou acceptée. */
export type VerdictLecture = 'rejete' | 'en_attente' | 'confirme';

export type OptionsConfirmateur = {
  /** Nombre de lectures identiques d'affilée pour accepter un code. */
  lecturesRequises?: number;
  /** Écart maximal entre deux lectures successives du même code, en millisecondes. */
  fenetreMs?: number;
};

/**
 * Crée un « confirmateur » : on lui donne chaque lecture de la caméra, il répond si le code est accepté.
 * Il garde en mémoire le dernier code valide et le nombre de fois où il a été lu d'affilée.
 *
 * Un code à clé fausse est ignoré SANS remettre le compte à zéro : c'est du bruit, pas un autre produit.
 */
export function creerConfirmateur({ lecturesRequises = 2, fenetreMs = 1500 }: OptionsConfirmateur = {}) {
  let codeCourant: string | null = null;
  let nombre = 0;
  let derniereLecture = 0;

  return {
    /** `maintenant` = l'heure de la lecture en millisecondes (Date.now()). */
    lire(code: string, maintenant: number): VerdictLecture {
      if (!cleEanValide(code)) return 'rejete';

      if (code === codeCourant && maintenant - derniereLecture <= fenetreMs) {
        nombre += 1;
      } else {
        codeCourant = code; // nouveau code, ou même code mais trop espacé : on recompte depuis un
        nombre = 1;
      }
      derniereLecture = maintenant;

      return nombre >= lecturesRequises ? 'confirme' : 'en_attente';
    },

    /** À appeler quand un nouveau scan démarre (retour sur l'écran, « Scanner à nouveau »). */
    reinitialiser() {
      codeCourant = null;
      nombre = 0;
      derniereLecture = 0;
    },
  };
}
