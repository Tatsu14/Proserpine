/**
 * firebase.ts — Vérifie le jeton d'identité Firebase (« ID token ») envoyé par l'application.
 *
 * Pourquoi : l'app ne parle jamais directement à la base. Elle envoie son jeton Firebase à cette fonction
 * serveur, qui doit s'assurer qu'il est authentique avant de faire quoi que ce soit. On n'utilise pas le SDK
 * d'administration de Firebase (il demanderait une clé très puissante) mais la méthode officielle « avec une
 * bibliothèque JWT tierce » (documentation Firebase « Verify ID Tokens », mise à jour le 18/11/2026) :
 *
 *   En-tête : alg = RS256 ; kid = l'une des clés publiques de Google, publiées sous forme de certificats X.509
 *             à l'adresse URL_CERTIFICATS.
 *   Charge  : exp dans le futur ; iat dans le passé ; aud = identifiant du projet Firebase ;
 *             iss = https://securetoken.google.com/<projet> ; sub = uid non vide ; auth_time dans le passé.
 *   Signature vérifiée avec la clé correspondant au kid. Les certificats sont gardés en mémoire selon le
 *   « max-age » de l'en-tête Cache-Control de la réponse de Google.
 *
 * Le module ne dépend que de « jose » : il se teste avec Node, sans Deno.
 */
import { decodeProtectedHeader, importX509, jwtVerify } from 'npm:jose@5.10.0';

export const URL_CERTIFICATS =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

/** Toute raison de refuser un jeton. Le message n'est jamais renvoyé tel quel à l'application. */
export class ErreurJeton extends Error {}

type Recuperateur = (url: string) => Promise<Response>;
type Cle = Awaited<ReturnType<typeof importX509>>;

/**
 * Fournit la clé publique correspondant à un « kid », en gardant les certificats de Google en mémoire.
 * Un kid inconnu provoque un rechargement, mais au plus une fois par minute (pour qu'un jeton fabriqué
 * ne puisse pas faire interroger Google en boucle).
 */
export function creerCles(recuperer: Recuperateur = fetch, maintenant: () => number = Date.now) {
  let certificats: Record<string, string> = {};
  let expireLe = 0;
  let dernierChargement = -Infinity;
  const importees = new Map<string, Cle>();

  async function charger() {
    dernierChargement = maintenant();
    const reponse = await recuperer(URL_CERTIFICATS);
    if (!reponse.ok) throw new ErreurJeton('certificats_indisponibles');
    const json = await reponse.json();
    if (!json || typeof json !== 'object') throw new ErreurJeton('certificats_illisibles');
    const maxAge = /max-age=(\d+)/.exec(reponse.headers.get('cache-control') ?? '');
    certificats = json as Record<string, string>;
    importees.clear();
    expireLe = maintenant() + (maxAge ? Number(maxAge[1]) * 1000 : 3_600_000);
  }

  return async function cle(kid: string): Promise<Cle> {
    const perime = maintenant() >= expireLe;
    const inconnu = !(kid in certificats);
    if (perime || (inconnu && maintenant() - dernierChargement > 60_000)) await charger();
    const pem = certificats[kid];
    if (typeof pem !== 'string') throw new ErreurJeton('kid_inconnu');
    let k = importees.get(kid);
    if (!k) {
      k = await importX509(pem, 'RS256');
      importees.set(kid, k);
    }
    return k;
  };
}

/** Crée la fonction qui vérifie un jeton et renvoie l'uid Firebase de l'utilisateur. */
export function creerVerificateur(
  projetId: string,
  cle: (kid: string) => Promise<Cle>,
  maintenant: () => number = Date.now,
) {
  return async function verifier(jeton: string): Promise<{ uid: string }> {
    if (typeof jeton !== 'string' || jeton.length < 20 || jeton.length > 4096) {
      throw new ErreurJeton('jeton_absent');
    }

    let entete: { alg?: string; kid?: string };
    try {
      entete = decodeProtectedHeader(jeton);
    } catch {
      throw new ErreurJeton('jeton_illisible');
    }
    if (entete.alg !== 'RS256' || typeof entete.kid !== 'string') {
      throw new ErreurJeton('entete_invalide');
    }

    const k = await cle(entete.kid);

    let charge: Record<string, unknown>;
    try {
      ({ payload: charge } = await jwtVerify(jeton, k, {
        algorithms: ['RS256'],
        issuer: `https://securetoken.google.com/${projetId}`,
        audience: projetId,
        requiredClaims: ['exp', 'iat', 'sub', 'auth_time'],
        clockTolerance: 30,
        currentDate: new Date(maintenant()),
      }));
    } catch {
      throw new ErreurJeton('jeton_invalide');
    }

    const maintenantS = Math.floor(maintenant() / 1000);
    const { sub, iat, auth_time: authTime } = charge;
    if (typeof sub !== 'string' || sub.length === 0 || sub.length > 128) throw new ErreurJeton('sub_invalide');
    if (typeof iat !== 'number' || iat > maintenantS + 30) throw new ErreurJeton('iat_invalide');
    if (typeof authTime !== 'number' || authTime > maintenantS + 30) throw new ErreurJeton('auth_time_invalide');

    return { uid: sub };
  };
}
