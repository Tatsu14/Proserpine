/**
 * pseudo.ts — Règle des pseudos et conversion d'un nom quelconque en pseudo valide.
 *
 * Règle (identique à l'inscription) : 3 à 20 caractères, lettres sans accent, chiffres, « _ » ou « - ».
 * Un compte Google arrive avec son nom complet (« Jean-Pierre Dupont », accents, espaces…) : on le convertit
 * (« Jean-Pierre_Dupont »). Si le nom ne donne rien d'utilisable, on part du début de l'adresse e-mail,
 * puis, en dernier recours, de « utilisateur » suivi de chiffres. L'utilisateur peut ensuite le changer
 * dans « Mes informations ».
 */
export const REGEX_PSEUDO = /^[a-zA-Z0-9_-]{3,20}$/;

export const pseudoValide = (nom: string | null | undefined) => typeof nom === 'string' && REGEX_PSEUDO.test(nom);

function nettoyer(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // accents retirés : « é » devient « e »
    .replace(/[\s.]+/g, '_') // espaces et points : « _ »
    .replace(/[^a-zA-Z0-9_-]/g, '') // tout autre caractère est retiré
    .replace(/_{2,}/g, '_')
    .replace(/^[_-]+|[_-]+$/g, '')
    .slice(0, 20)
    .replace(/[_-]+$/g, '');
}

/** Pseudo valide tiré du nom Google (ou de l'e-mail) ; garantit toujours un résultat conforme à la règle. */
export function pseudoDepuisNom(nom: string | null | undefined, email?: string | null): string {
  const depuisNom = nettoyer(nom ?? '');
  if (pseudoValide(depuisNom)) return depuisNom;
  const depuisEmail = nettoyer((email ?? '').split('@')[0] ?? '');
  if (pseudoValide(depuisEmail)) return depuisEmail;
  return `utilisateur${Math.floor(1000 + Math.random() * 9000)}`;
}
