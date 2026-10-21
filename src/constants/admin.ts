/**
 * admin.ts — Identité de l'administrateur.
 *
 * L'UID n'est pas un secret : il sert seulement à AFFICHER ou masquer l'entrée
 * « Administration » du Profil. La vraie protection est dans les règles Firestore
 * (docs/firestore-retours.rules) : un autre compte qui forcerait l'écran ne pourrait rien lire.
 */
export const UID_ADMIN = 'L4xcWYA4NGTpt4QMCp134SGmQA82';
