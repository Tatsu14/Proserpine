/**
 * liens.ts — Liens externes de l'application.
 *
 * Les retours des utilisateurs passent par deux Google Forms reliés à la boîte mail de
 * l'administrateur. Tant qu'un lien est vide, le bouton correspondant affiche un message.
 */
export const LIEN_FORMULAIRE_AVIS = 'https://forms.gle/ygzHd95yiLhTvMGCA';
export const LIEN_FORMULAIRE_SIGNALEMENT = 'https://forms.gle/GtWi3iFBkz5BqKZq8';

/** Politique de confidentialité (page statique du site, dossier `public/`). Même URL que dans la console Google Play. */
export const LIEN_POLITIQUE_CONFIDENTIALITE = 'https://proserpine.vercel.app/politique-confidentialite';

/**
 * Fonction serveur « proserpine-api » (Supabase) : SEULE porte d'entrée vers la base de produits de
 * Proserpine. Adresse publique, mais chaque demande doit porter le jeton Firebase de l'utilisateur
 * connecté (voir src/services/api-proserpine.ts et supabase/functions/proserpine-api).
 */
export const URL_API_PROSERPINE = 'https://xocrwnuwzhkdehrqwfgo.supabase.co/functions/v1/proserpine-api';

/** Page d'Open Food Facts, citée sur chaque fiche qui montre leurs données (licence ODbL). */
export const LIEN_OPEN_FOOD_FACTS = 'https://world.openfoodfacts.org';
