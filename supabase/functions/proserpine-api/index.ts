/**
 * proserpine-api — fonction serveur (Supabase Edge Function) entre l'application et la base.
 *
 * À déployer avec « verify_jwt = false » : le jeton envoyé par l'app est un jeton FIREBASE, que
 * Supabase ne sait pas lire ; c'est ce code qui le vérifie (firebase.ts) avant tout accès à la base.
 *
 * La clé secrète de la base n'apparaît nulle part dans le code : Supabase la fournit à la fonction
 * (variable SUPABASE_SECRET_KEYS, ou l'ancienne SUPABASE_SERVICE_ROLE_KEY).
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

import { creerCles, creerVerificateur } from './firebase.ts';
import { creerGestionnaire } from './gestionnaire.ts';

/** Projet Firebase de Proserpine (mêmes comptes que l'app). Ce n'est pas un secret. */
const PROJET_FIREBASE = 'proserpine-5eadf';

/**
 * Administrateurs : UID Firebase (pas des secrets).
 *  - L4xc… : compte administrateur de l'app (src/constants/admin.ts) ;
 *  - KINp… : compte du site d'administration (créé le 25/11/2026).
 * Pour en ajouter un sans redéployer : variable UIDS_ADMIN (liste séparée par des virgules), qui s'AJOUTE à ceux-ci.
 */
const UIDS_ADMIN = [
  ...new Set(
    ['L4xcWYA4NGTpt4QMCp134SGmQA82', 'KINp4lC0lMRlQdJOpjC1VpTct8j1', ...(Deno.env.get('UIDS_ADMIN') ?? '').split(',')]
      .map((s) => s.trim())
      .filter(Boolean),
  ),
];

function cleServeur(): string {
  const nouvelles = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (nouvelles) {
    try {
      const cle = JSON.parse(nouvelles)?.default;
      if (typeof cle === 'string' && cle) return cle;
    } catch {
      // on essaie l'ancienne variable ci-dessous
    }
  }
  const ancienne = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (ancienne) return ancienne;
  throw new Error('cle_serveur_absente');
}

const base = createClient(Deno.env.get('SUPABASE_URL')!, cleServeur(), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const gerer = creerGestionnaire({
  verifier: creerVerificateur(PROJET_FIREBASE, creerCles()),
  appeler: async (fonction, params) => {
    const { data, error } = await base.rpc(fonction, params);
    return { data, error };
  },
  uidsAdmin: UIDS_ADMIN,
  journal: (message) => console.error(message),
});

Deno.serve(gerer);
