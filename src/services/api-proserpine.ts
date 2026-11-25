/**
 * api-proserpine.ts — Appels à la fonction serveur « proserpine-api » (base de produits Supabase).
 *
 * Pourquoi passer par une fonction serveur : la base contient une partie fermée (emballages, propositions)
 * que l'app ne doit jamais lire directement. L'app envoie donc sa demande, avec le jeton Firebase de
 * l'utilisateur connecté ; la fonction serveur vérifie ce jeton, puis interroge la base à sa place.
 *
 * Contrat identique aux autres services : aucune fonction ne lève d'exception vers l'écran. On reçoit
 * toujours { ok: true, donnees } ou { ok: false, erreur } (un code court, traduit par messageErreur).
 */
import { URL_API_PROSERPINE } from '@/constants/liens';

import { auth } from './firebase';

export type ReponseApi<T> = { ok: true; donnees: T } | { ok: false; erreur: string; statut: number };

/** Messages lisibles, par code d'erreur renvoyé par le serveur (ou constaté ici). */
const MESSAGES_ERREUR: Record<string, string> = {
  non_connecte: 'Connectez-vous pour utiliser cette fonction.',
  non_authentifie: 'Votre session a expiré. Reconnectez-vous puis réessayez.',
  reserve_administrateur: 'Accès réservé à l’administrateur.',
  ean_invalide: 'Ce code-barres ne semble pas valide. Vérifiez les chiffres imprimés sous le code-barres.',
  nom_invalide: 'Le nom doit faire entre 2 et 150 caractères.',
  marque_invalide: 'La marque ou la quantité est trop longue.',
  emballages_invalides: 'Un des emballages est incomplet ou incorrect.',
  motif_requis: 'Indiquez un motif de refus.',
  deja_connu: 'Ce produit est déjà dans notre base.',
  deja_propose: 'Vous avez déjà proposé ce produit : il est en cours d’examen.',
  deja_traitee: 'Cette proposition a déjà été traitée.',
  non_trouve: 'Élément introuvable.',
  trop_de_propositions: 'Vous avez atteint la limite de 5 propositions par jour. Réessayez demain.',
  reseau: 'Connexion impossible. Vérifiez votre connexion internet puis réessayez.',
  delai: 'Le serveur met trop de temps à répondre. Réessayez dans un instant.',
  erreur_serveur: 'Une erreur est survenue de notre côté. Réessayez plus tard.',
};

export const messageErreur = (code: string) => MESSAGES_ERREUR[code] ?? MESSAGES_ERREUR.erreur_serveur;

async function envoyer<T>(jeton: string, action: string, params: Record<string, unknown>, delaiMs: number): Promise<ReponseApi<T>> {
  const controleur = new AbortController();
  const minuterie = setTimeout(() => controleur.abort(), delaiMs);
  try {
    const reponse = await fetch(URL_API_PROSERPINE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jeton}` },
      body: JSON.stringify({ ...params, action }),
      signal: controleur.signal,
    });
    const corps: any = await reponse.json().catch(() => null);
    if (reponse.ok && corps?.ok) return { ok: true, donnees: corps.donnees as T };
    return { ok: false, erreur: typeof corps?.erreur === 'string' ? corps.erreur : 'erreur_serveur', statut: reponse.status };
  } catch (e: any) {
    return { ok: false, erreur: e?.name === 'AbortError' ? 'delai' : 'reseau', statut: 0 };
  } finally {
    clearTimeout(minuterie);
  }
}

/**
 * Appelle une action de la fonction serveur. `delaiMs` : au-delà, on abandonne (« delai »).
 * Si le jeton a expiré entre-temps (réponse 401), on en redemande un neuf et on réessaie UNE fois.
 */
export async function appelerApi<T = unknown>(
  action: string,
  params: Record<string, unknown> = {},
  delaiMs = 10_000,
): Promise<ReponseApi<T>> {
  const user = auth.currentUser;
  if (!user) return { ok: false, erreur: 'non_connecte', statut: 0 };

  let jeton: string;
  try {
    jeton = await user.getIdToken();
  } catch {
    return { ok: false, erreur: 'reseau', statut: 0 };
  }
  const premier = await envoyer<T>(jeton, action, params, delaiMs);
  if (premier.ok || premier.statut !== 401) return premier;

  try {
    jeton = await user.getIdToken(true);
  } catch {
    return premier;
  }
  return envoyer<T>(jeton, action, params, delaiMs);
}
