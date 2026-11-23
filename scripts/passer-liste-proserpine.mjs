/**
 * passer-liste-proserpine.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Passe une liste d'EAN (l'export CSV de « Scan Échantillon ») dans la MÊME logique
 * qu'un scan dans Proserpine, et écrit ce que l'app afficherait pour chaque produit.
 *
 * FIDÉLITÉ : ce script ne contient AUCUNE copie de la logique de Proserpine. Il importe les
 * vrais fichiers de l'app, tels quels, et les enchaîne dans l'ordre de l'écran de scan
 * (src/app/(tabs)/scan.tsx) puis de la fiche produit (src/app/produit/[ean].tsx) :
 *
 *   1. rechercherProduitDetaille(ean)    api.js        cascade Open Food Facts → Beauty → Products
 *   2. calculerEcoScore(donnees_brutes)  ecoscore.js   indice d'impact (ou « Non évalué »)
 *   3. analyserEmballage(donnees_brutes) tri.js        consigne de tri (un bac par élément d'emballage)
 *
 * FIABILITÉ DU TRI : la fiche produit distingue trois cas (voir [ean].tsx, « fiabiliteConnue »), et le
 * script les reprend à l'identique plutôt que de tout présenter comme un fait :
 *   - « lu »     : le bac vient des données d'emballage d'Open Food Facts ;
 *   - « déduit » : le bac est DÉDUIT de la catégorie du produit (l'app l'affiche « à vérifier ») ;
 *   - « aucune » : pas de consigne (l'app propose alors à l'utilisateur de choisir la matière).
 *
 * CE QUI N'EST PAS REPRODUIT (et pourquoi) :
 *   - La base Firestore de Proserpine (`produits/{ean}`, consignes vérifiées à la main) : elle
 *     exige un utilisateur connecté. Un produit présent dans cette base peut donc avoir, dans
 *     l'app, une consigne de tri différente de celle calculée ici à partir d'Open Food Facts.
 *   - Aucune écriture : pour un EAN inconnu, l'app ajoute +1 au compteur `produits_introuvables`.
 *     Le script, lui, ne modifie rien (il ne fait que LIRE les API publiques Open*Facts).
 *   - Le cache local et l'historique de l'utilisateur.
 *
 * USAGE :
 *   node scripts/passer-liste-proserpine.mjs liste.csv [--sortie resultat.csv] [--pause 1500]
 *
 * Sans --sortie, le résultat est écrit à côté de la liste (« liste-proserpine.csv »).
 * --pause : attente en millisecondes entre deux produits (1500 par défaut, voir « Cadence » plus bas).
 *
 * PATIENCE : Open Food Facts répond « 429 Too Many Requests » si on va trop vite, et api.js range alors
 * le produit dans « pas de résultat » sans rien signaler. Le script observe ces 429, ralentit, attend et
 * réessaie les EAN concernés ; un EAN n'est donc « introuvable » que si les 3 API l'ont dit clairement.
 * Les résultats reflètent le code de `src/services` TEL QU'IL EST sur le disque au moment du
 * lancement (y compris les modifications pas encore commitées).
 *
 * Variable optionnelle PROSERPINE_SERVICES : autre dossier de services à utiliser
 * (par défaut `../src/services`, relatif à ce fichier).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// ──────────────────────────────────────────────────────────────────────────
// 1. Les vrais fichiers de Proserpine (importés, jamais recopiés)
// ──────────────────────────────────────────────────────────────────────────
// Les fichiers de l'app sont des .js en syntaxe ES module, dans un package.json sans « "type": "module" » :
// Node les relit alors en ES module et le signale par un avertissement sans conséquence. On masque
// uniquement celui-là (tout autre avertissement reste affiché).
process.removeAllListeners('warning');
process.on('warning', (w) => {
  if (w.code !== 'MODULE_TYPELESS_PACKAGE_JSON') console.error(w.stack ?? String(w));
});

// ──────────────────────────────────────────────────────────────────────────
// 1 bis. Les requêtes réseau : on les OBSERVE (la logique d'api.js reste intacte)
// ──────────────────────────────────────────────────────────────────────────
// Ce petit relais compte les codes HTTP reçus, pour que le script sache quand il va trop vite, et
// s'identifie auprès d'Open*Facts par un User-Agent explicite (ils le demandent). Il ne change ni la
// réponse que voit api.js, ni sa logique : seul l'en-tête User-Agent est ajouté à la requête.
const fetchOrigine = globalThis.fetch;
const reponsesHttp = {}; // code HTTP → nombre de réponses reçues
let reponses429 = 0; // « 429 Too Many Requests » : on a été trop vite
globalThis.fetch = async (url, options = {}) => {
  const entetes = new Headers(options.headers);
  if (!entetes.has('user-agent')) entetes.set('user-agent', 'ProserpineListeTest/1.0 (script local de test)');
  const reponse = await fetchOrigine(url, { ...options, headers: entetes });
  reponsesHttp[reponse.status] = (reponsesHttp[reponse.status] ?? 0) + 1;
  if (reponse.status === 429) reponses429++;
  return reponse;
};

// Par défaut : le dossier `src/services` du projet, trouvé à partir de l'emplacement de CE fichier
// (il vit dans `scripts/`, à côté de `src/`) — donc rien n'est figé sur un chemin de ta machine.
const DOSSIER_SERVICES =
  process.env.PROSERPINE_SERVICES ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/services');
const charger = (fichier) => import(pathToFileURL(path.join(DOSSIER_SERVICES, fichier)).href);

const { rechercherProduitDetaille } = await charger('api.js');
const { calculerEcoScore } = await charger('ecoscore.js');
const { analyserEmballage } = await charger('tri.js');

// ──────────────────────────────────────────────────────────────────────────
// 2. Arguments : la liste en entrée, et (options) le fichier de sortie et la pause
// ──────────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const valeurOption = (nom) => {
  const i = args.indexOf(nom);
  return i >= 0 ? args[i + 1] : null;
};
const cheminSortie = valeurOption('--sortie');
const pauseDemandee = valeurOption('--pause');
// La liste = le premier argument qui n'est ni une option ni la valeur d'une option.
const cheminListe = args.find((a) => !a.startsWith('--') && a !== cheminSortie && a !== pauseDemandee);

if (!cheminListe) {
  console.error('Usage : node passer-liste-proserpine.mjs liste.csv [--sortie resultat.csv] [--pause 1500]');
  process.exit(1);
}

// ──────────────────────────────────────────────────────────────────────────
// 3. Lecture de la liste (format de l'export de Scan Échantillon : « ean,date_heure »)
// ──────────────────────────────────────────────────────────────────────────
function lireEans(chemin) {
  const texte = readFileSync(chemin, 'utf8').replace(/^\uFEFF/, ''); // retire un éventuel BOM
  const eans = new Set(); // un Set : un EAN en double n'est passé qu'une fois
  const ignorees = [];
  texte.split(/\r?\n/).forEach((ligne, i) => {
    if (!ligne.trim()) return;
    const code = ligne.split(',')[0].trim();
    if (i === 0 && code.toLowerCase() === 'ean') return; // ligne d'en-tête
    if (/^(\d{8}|\d{13})$/.test(code)) eans.add(code); // EAN-8 ou EAN-13, comme le scanner de l'app
    else ignorees.push(`ligne ${i + 1} : ${ligne}`);
  });
  return { eans: [...eans], ignorees };
}

// ──────────────────────────────────────────────────────────────────────────
// 4. Un « scan » : ce que l'app fait quand un code-barres est lu
// ──────────────────────────────────────────────────────────────────────────
async function scanner(ean) {
  const { produit, introuvableCertain } = await rechercherProduitDetaille(ean);

  if (!produit) {
    // L'app affiche « Produit non trouvé » dans les deux cas. On les distingue ici, comme le fait
    // l'app pour sa liste de produits à compléter : « introuvable » n'est CERTAIN que si les trois
    // API ont répondu clairement « inconnu » ; sinon on ne sait pas (réseau, erreur serveur).
    return { ean, statut: introuvableCertain ? 'introuvable' : 'indéterminé (réseau)' };
  }

  const score = calculerEcoScore(produit.donnees_brutes);
  const tri = analyserEmballage(produit.donnees_brutes);

  // « Non évalué » n'est pas une note : on laisse le score vide plutôt que d'afficher un nombre.
  const evalue = score.evalue !== false && score.score !== null && score.score !== undefined;
  const bacs = [...new Set(tri.composants.map((c) => c.categorie))];

  // Même règle que la fiche produit ([ean].tsx) : déduit > lu (au moins un bac) > aucune.
  // `indetermine` = plusieurs emballages possibles pour ce type de produit : l'app ne tranche pas.
  const fiabilite_tri = tri.deduit ? 'déduit' : bacs.length > 0 ? 'lu' : tri.indetermine ? 'aucune (indéterminé)' : 'aucune';

  return {
    ean,
    statut: 'trouvé',
    nom: produit.nom,
    marque: produit.marque,
    source: produit.source,
    eco_label: score.label,
    eco_score: evalue ? score.score : '',
    bacs: bacs.join(' + '),
    fiabilite_tri,
    composants: tri.composants.map((c) => `${c.description} → ${c.categorie}`).join(' | '),
    instructions: tri.instructions ?? '',
  };
}

// ──────────────────────────────────────────────────────────────────────────
// 5. Programme principal
// ──────────────────────────────────────────────────────────────────────────
const COLONNES = ['ean', 'statut', 'nom', 'marque', 'source', 'eco_label', 'eco_score', 'bacs', 'fiabilite_tri', 'composants', 'instructions'];

// ── Cadence ──────────────────────────────────────────────────────────────
// Open Food Facts limite le nombre de requêtes, et sa limite est plus basse que je ne l'avais supposé :
// à 700 ms entre deux produits, il a répondu « 429 Too Many Requests » dès le 15e EAN d'une liste de
// 273 (constaté le 12/11/2026). Les EAN touchés sortaient « indéterminés », dont des produits en
// réalité TROUVÉS. D'où : pause de 1,5 s par défaut ; elle double (jusqu'à 10 s) à chaque 429 reçu, et
// l'EAN touché est réessayé après une attente (30 s × numéro de l'essai).
let pause = Number(pauseDemandee ?? 1500);
const PAUSE_MAX_MS = 10_000;
const ESSAIS_MAX = 4;
let reessais = 0;
const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms));

/** Un scan, réessayé tant que le résultat est « indéterminé » (on ne SAIT pas) et qu'il reste des essais. */
async function scannerAvecPatience(ean) {
  for (let essai = 1; ; essai++) {
    const avant = reponses429;
    const r = await scanner(ean);
    if (r.statut !== 'indéterminé (réseau)' || essai === ESSAIS_MAX) return r;
    const limite = reponses429 > avant;
    if (limite) pause = Math.min(pause * 2, PAUSE_MAX_MS); // trop vite : on ralentit pour la suite
    const attente = limite ? 30_000 * essai : 5_000 * essai;
    console.log(`  ↻ ${ean} : ${limite ? '« trop de requêtes » (429)' : 'pas de réponse nette'} — attente ${attente / 1000} s, essai ${essai + 1}/${ESSAIS_MAX}`);
    reessais++;
    await attendre(attente);
  }
}

const { eans, ignorees } = lireEans(cheminListe);
console.log(`${eans.length} EAN à passer dans la logique de scan Proserpine (${cheminListe})`);
ignorees.forEach((l) => console.warn(`  ignorée — ${l}`));

const resultats = [];
for (const [i, ean] of eans.entries()) {
  const r = await scannerAvecPatience(ean);
  resultats.push(r);
  const detail = r.statut === 'trouvé' ? `${r.nom} (${r.marque}) · ${r.eco_label}${r.eco_score !== '' ? ' ' + r.eco_score : ''} · bac : ${r.bacs || '—'} [${r.fiabilite_tri}]` : '';
  console.log(`[${i + 1}/${eans.length}] ${ean}  ${r.statut}  ${detail}`);
  if (i < eans.length - 1) await attendre(pause);
}

// Fichier de sortie : un CSV lisible dans Excel (BOM UTF-8 pour les accents, guillemets si besoin).
const echapper = (v) => {
  const s = String(v ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = [COLONNES.join(','), ...resultats.map((r) => COLONNES.map((c) => echapper(r[c])).join(','))].join('\r\n') + '\r\n';
const sortie = cheminSortie ?? cheminListe.replace(/\.csv$/i, '') + '-proserpine.csv';
writeFileSync(sortie, '\uFEFF' + csv, 'utf8');

// Bilan : chaque catégorie séparément, sans rien mélanger (un « non évalué » n'est pas une mauvaise note).
const compte = (f) => resultats.filter(f).length;
const trouves = resultats.filter((r) => r.statut === 'trouvé');
console.log('\n──── Bilan ────');
console.log(`Trouvés                 : ${trouves.length} / ${resultats.length}`);
console.log(`Introuvables (certain)  : ${compte((r) => r.statut === 'introuvable')}`);
console.log(`Indéterminés (réseau)   : ${compte((r) => r.statut.startsWith('indéterminé'))}`);
console.log(`Éco-score « Non évalué »: ${trouves.filter((r) => r.eco_score === '').length} (sur les trouvés)`);
console.log(`Tri « lu » (fiable)     : ${trouves.filter((r) => r.fiabilite_tri === 'lu').length} (sur les trouvés)`);
console.log(`Tri « déduit »          : ${trouves.filter((r) => r.fiabilite_tri === 'déduit').length} (à vérifier sur l'emballage)`);
console.log(`Tri « aucune » consigne : ${trouves.filter((r) => r.fiabilite_tri.startsWith('aucune')).length} (l'app demande la matière)`);
console.log(`Réponses HTTP reçues     : ${Object.entries(reponsesHttp).map(([code, n]) => `${code}×${n}`).join('  ')}`);
console.log(`Réponses 429 / réessais : ${reponses429} / ${reessais}   (pause finale : ${pause} ms)`);
console.log(`\nRésultat écrit dans : ${sortie}`);
