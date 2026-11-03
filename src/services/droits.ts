/**
 * droits.ts — Qui a le droit de faire quoi (point de contrôle UNIQUE).
 *
 * Règle prévue :
 *   - signaler une consigne fausse : ouvert à TOUS (aucun contrôle ici, voir signaler-consigne.tsx) ;
 *   - ajouter ou modifier un produit soi-même : réservé aux abonnés premium.
 *
 * Le système premium n'existe pas encore (prévu dans plusieurs mois). En attendant, tout le monde
 * est autorisé : `PREMIUM_ACTIF` est à `false`. Chaque écran d'ajout/modification de produit
 * devra appeler `peutModifierProduits(user)` avant de s'ouvrir, et rediriger si la réponse est `false`.
 * Ainsi, le jour où le premium arrive, on ne change QUE ce fichier (et les règles Firestore).
 *
 * Pour activer le premium plus tard :
 *   1. écrire `estAbonne` (lire le statut d'abonnement du compte : champ Firestore, custom claim
 *      Firebase ou SDK d'achat intégré, selon la solution retenue) ;
 *   2. passer `PREMIUM_ACTIF` à `true` ;
 *   3. publier la règle Firestore correspondante (voir la section « Produits » de
 *      docs/firestore-retours.rules) : masquer un bouton ne protège RIEN, seul le serveur protège.
 */
import type { User } from 'firebase/auth';

/** Interrupteur général : `false` tant que le système premium n'est pas lancé (tout le monde autorisé). */
export const PREMIUM_ACTIF = false;

/**
 * L'utilisateur a-t-il un abonnement premium en cours ?
 * À ÉCRIRE quand le système d'abonnement existera. Tant que `PREMIUM_ACTIF` est `false`, cette
 * fonction n'est jamais consultée ; une fois l'interrupteur activé sans l'avoir écrite, personne
 * n'est abonné (refus par défaut, jamais d'accès ouvert par erreur).
 */
export function estAbonne(_user: User | null): boolean {
  return false;
}

/** Peut-il ajouter ou modifier un produit lui-même ? (Le signalement de consigne, lui, reste ouvert à tous.) */
export function peutModifierProduits(user: User | null): boolean {
  if (!PREMIUM_ACTIF) return true;
  return estAbonne(user);
}
