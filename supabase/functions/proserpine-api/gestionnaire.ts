/**
 * gestionnaire.ts — Le cœur de la fonction serveur « proserpine-api », sans rien de propre à Deno.
 *
 * Une seule adresse, une requête POST en JSON : { "action": "...", ...paramètres }.
 * Chaque action correspond à UNE fonction SQL (voir supabase/migrations/20261125120000_api_proserpine.sql) ;
 * la base refait tous les contrôles (longueurs, clé du code-barres, limites) : ce fichier ne fait que
 *   1. vérifier l'identité (jeton Firebase) et, pour l'administration, que c'est l'administrateur ;
 *   2. passer les paramètres attendus, et rien d'autre ;
 *   3. traduire les erreurs de la base en réponses claires, sans jamais révéler de détail interne.
 *
 * Les dépendances (vérification du jeton, appel à la base) sont injectées : ce module se teste avec Node.
 */
export type ResultatAppel = { data: unknown; error: { message?: string } | null };
export type Appeler = (fonction: string, params: Record<string, unknown>) => Promise<ResultatAppel>;
export type Verifier = (jeton: string) => Promise<{ uid: string }>;

const CORS: Record<string, string> = {
  // L'accès est protégé par le jeton (pas de cookie) : autoriser toutes les origines est sans risque ici,
  // et permet l'écran d'administration sur le site web (y compris ses adresses de prévisualisation).
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const TAILLE_MAX = 20_000; // octets : largement assez pour une proposition avec 8 emballages

/** Erreurs de la base que l'application peut recevoir telles quelles, avec leur code HTTP. */
const ERREURS_CONNUES: Record<string, number> = {
  ean_invalide: 400,
  nom_invalide: 400,
  marque_invalide: 400,
  emballages_invalides: 400,
  utilisateur_invalide: 400,
  statut_invalide: 400,
  decision_invalide: 400,
  motif_requis: 400,
  terme_invalide: 400,
  non_trouve: 404,
  deja_connu: 409,
  deja_propose: 409,
  deja_traitee: 409,
  trop_de_propositions: 429,
  signalement_invalide: 400,
  signalement_vide: 400,
  trop_de_signalements: 429,
  code_postal_invalide: 400,
};

// Conversion prudente des paramètres reçus : un mauvais type devient une valeur que la base refusera proprement.
const texte = (v: unknown) => (typeof v === 'string' ? v : '');
const texteOuNul = (v: unknown) => (typeof v === 'string' ? v : null);
const entier = (v: unknown) => (typeof v === 'number' && Number.isSafeInteger(v) ? v : -1);
const nombreOuNul = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : null);
const listeOuNul = (v: unknown) => (v === undefined || v === null ? null : v);

type Corps = Record<string, unknown>;
type Action = { admin: boolean; fonction: string; params: (c: Corps, uid: string) => Record<string, unknown> };

const ACTIONS: Record<string, Action> = {
  // --- Application ---
  lire_produit: { admin: false, fonction: 'api_lire_produit', params: (c) => ({ p_ean: texte(c.ean) }) },
  proposer: {
    admin: false,
    fonction: 'api_proposer_produit',
    params: (c, uid) => ({
      p_utilisateur: uid,
      p_ean: texte(c.ean),
      p_nom: texte(c.nom),
      p_marque: texteOuNul(c.marque),
      p_emballages: listeOuNul(c.emballages),
    }),
  },
  effacer_identifiant: { admin: false, fonction: 'api_effacer_identifiant', params: (_c, uid) => ({ p_utilisateur: uid }) },
  signaler: {
    admin: false,
    fonction: 'api_signaler',
    params: (c, uid) => ({
      p_utilisateur: uid,
      p_type: texte(c.type),
      p_ean: texte(c.ean),
      p_nom_produit: texteOuNul(c.nom_produit),
      p_origine: texteOuNul(c.origine),
      p_elements: listeOuNul(c.elements),
      p_champs: listeOuNul(c.champs),
      p_correction: texteOuNul(c.correction),
      p_commentaire: texteOuNul(c.commentaire),
      p_code_postal: texteOuNul(c.code_postal),
    }),
  },

  // --- Administration ---
  admin_lister_propositions: {
    admin: true,
    fonction: 'api_admin_lister_propositions',
    params: (c) => ({ p_statut: texte(c.statut) || 'en_attente', p_limite: nombreOuNul(c.limite) }),
  },
  admin_decider: {
    admin: true,
    fonction: 'api_admin_decider',
    params: (c) => ({
      p_id: entier(c.id),
      p_decision: texte(c.decision),
      p_nom: texteOuNul(c.nom),
      p_marque: texteOuNul(c.marque),
      p_motif: texteOuNul(c.motif),
      p_emballages: listeOuNul(c.emballages),
    }),
  },
  admin_chercher_produits: {
    admin: true,
    fonction: 'api_admin_chercher_produits',
    params: (c) => ({ p_terme: texte(c.terme), p_limite: nombreOuNul(c.limite) }),
  },
  admin_creer_produit: {
    admin: true,
    fonction: 'api_admin_creer_produit',
    params: (c) => ({ p_ean: texte(c.ean), p_nom: texte(c.nom), p_marque: texteOuNul(c.marque), p_quantite: texteOuNul(c.quantite) }),
  },
  admin_modifier_produit: {
    admin: true,
    fonction: 'api_admin_modifier_produit',
    params: (c) => ({ p_ean: texte(c.ean), p_nom: texte(c.nom), p_marque: texteOuNul(c.marque), p_quantite: texteOuNul(c.quantite) }),
  },
  admin_lire_emballages: { admin: true, fonction: 'api_admin_lire_emballages', params: (c) => ({ p_ean: texte(c.ean) }) },
  admin_lister_signalements: {
    admin: true,
    fonction: 'api_admin_lister_signalements',
    params: (c) => ({ p_statut: texteOuNul(c.statut), p_limite: nombreOuNul(c.limite) }),
  },
  admin_statut_signalement: {
    admin: true,
    fonction: 'api_admin_statut_signalement',
    params: (c) => ({ p_id: entier(c.id), p_statut: texte(c.statut) }),
  },
  admin_remplacer_emballages: {
    admin: true,
    fonction: 'api_admin_remplacer_emballages',
    params: (c) => ({ p_ean: texte(c.ean), p_emballages: listeOuNul(c.emballages) }),
  },
};

function repondre(statut: number, corps: unknown): Response {
  return new Response(corps === null ? null : JSON.stringify(corps), {
    status: statut,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export function creerGestionnaire(deps: {
  verifier: Verifier;
  appeler: Appeler;
  uidsAdmin: string[];
  journal?: (message: string) => void;
}) {
  const journal = deps.journal ?? (() => {});

  return async function gerer(req: Request): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (req.method !== 'POST') return repondre(405, { erreur: 'methode_refusee' });

    // 1. Corps de la requête : taille raisonnable, JSON, action connue.
    const longueur = Number(req.headers.get('content-length') ?? '0');
    if (longueur > TAILLE_MAX) return repondre(413, { erreur: 'trop_volumineux' });
    const brut = await req.text();
    if (brut.length > TAILLE_MAX) return repondre(413, { erreur: 'trop_volumineux' });
    let corps: Corps;
    try {
      const lu = JSON.parse(brut);
      if (!lu || typeof lu !== 'object' || Array.isArray(lu)) throw new Error();
      corps = lu as Corps;
    } catch {
      return repondre(400, { erreur: 'corps_invalide' });
    }
    const action = typeof corps.action === 'string' ? ACTIONS[corps.action] : undefined;
    if (!action || !Object.prototype.hasOwnProperty.call(ACTIONS, corps.action as string)) {
      return repondre(400, { erreur: 'action_inconnue' });
    }

    // 2. Identité : jeton Firebase valide ; administrateur pour les actions d'administration.
    const entete = req.headers.get('authorization') ?? '';
    const jeton = entete.startsWith('Bearer ') ? entete.slice(7).trim() : '';
    let uid: string;
    try {
      ({ uid } = await deps.verifier(jeton));
    } catch {
      return repondre(401, { erreur: 'non_authentifie' });
    }
    if (action.admin && !deps.uidsAdmin.includes(uid)) return repondre(403, { erreur: 'reserve_administrateur' });

    // 3. Appel à la base, et traduction des erreurs.
    let resultat: ResultatAppel;
    try {
      resultat = await deps.appeler(action.fonction, action.params(corps, uid));
    } catch (e) {
      journal(`appel ${action.fonction} : ${e instanceof Error ? e.message : String(e)}`);
      return repondre(500, { erreur: 'erreur_serveur' });
    }
    if (resultat.error) {
      const message = resultat.error.message ?? '';
      const statut = ERREURS_CONNUES[message];
      if (statut) return repondre(statut, { erreur: message });
      journal(`base ${action.fonction} : ${message}`);
      return repondre(500, { erreur: 'erreur_serveur' });
    }
    return repondre(200, { ok: true, donnees: resultat.data });
  };
}
