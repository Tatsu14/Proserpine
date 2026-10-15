/**
 * deduction-emballage.js - Reconnaissance d'emballage quand le texte est absent
 *
 * Cascade SANS IA, du plus fiable au moins fiable :
 *   Couche 0 — lire le champ structuré `packagings` d'Open Food Facts (rien n'est déduit,
 *              on lit une donnée que l'application ignorait jusqu'ici).
 *   Couche 1 — déduire l'emballage TYPIQUE d'après la catégorie du produit.
 *
 * Règle d'honnêteté : chaque composant porte son `origine` et sa `confiance`. Une
 * déduction n'est jamais présentée comme un fait. Si plusieurs emballages sont plausibles,
 * on ne choisit pas au hasard : on renvoie `indetermine` avec les options.
 */

// ─────────────────────────────────────────────────────────────────────────────
// COUCHE 0 — champ structuré `packagings`
// ─────────────────────────────────────────────────────────────────────────────

// Retire le préfixe de langue des tags OFF (« en:pet-1-… » → « pet-1-… »).
function normaliserTag(tag) {
    return String(tag || '').toLowerCase().replace(/^[a-z]{2}:/, '').trim();
}

// Matériau OFF → catégorie de tri. Retourne null si on ne sait pas (on n'invente rien).
// L'ordre compte : les cas composites/spécifiques passent avant les génériques.
function categorieDepuisMateriau(materiau) {
    const m = normaliserTag(materiau);
    if (!m) return null;
    if (m.includes('paper-and-plastic')) return null;              // composite : non triable seul
    if (m.includes('glass')) return 'glass';
    if (/tetra|brick|beverage-carton/.test(m)) return 'pmc';       // briques → PMC (règle Intradel)
    if (/cardboard|paper|c-pap|carton/.test(m)) return 'paper';
    if (/alumin|metal|steel|tin|\bfe\b/.test(m)) return 'pmc';
    if (/plastic|polyethylene|polypropylene|polystyrene|\bpvc\b|\bpet\b|rpet|pehd|hdpe|ldpe/.test(m)) return 'pmc';
    return null;
}

// Forme OFF → catégorie quand le matériau est absent. Uniquement les formes qui
// impliquent à coup sûr un matériau (une canette est en métal, une brique est PMC).
const CATEGORIE_PAR_FORME = {
    'can': 'pmc',
    'drink-can': 'pmc',
    'food-can': 'pmc',
    'brick': 'pmc',
};

const NOMS_FORMES = {
    'pot': 'Pot', 'individual-pot': 'Pot', 'jar': 'Bocal', 'bottle': 'Bouteille',
    'bottle-cap': 'Bouchon', 'lid': 'Couvercle', 'seal': 'Opercule', 'tray': 'Barquette',
    'brick': 'Brique', 'box': 'Boîte', 'bag': 'Sachet', 'individual-bag': 'Sachet',
    'pouch-flask': 'Gourde souple', 'can': 'Boîte de conserve', 'drink-can': 'Canette',
    'food-can': 'Boîte de conserve', 'film': 'Film', 'sleeve': 'Bandeau', 'sheet': 'Feuille',
    'wrapper': 'Emballage', 'packet': 'Paquet', 'container': 'Récipient', 'vial': 'Flacon',
};

// Étiquettes et attaches : non triées séparément (collées au contenant) → ignorées.
const FORMES_IGNOREES = new Set(['label', 'fastener']);

const NOMS_MATERIAUX = { pmc_plastique: 'plastique', glass: 'verre', paper: 'carton', pmc_metal: 'métal' };

function nomMateriau(materiau, categorie) {
    const m = normaliserTag(materiau);
    if (/alumin/.test(m)) return 'aluminium';
    if (/steel|tin/.test(m)) return 'acier';
    if (/tetra|brick|beverage-carton/.test(m)) return 'carton multicouche';
    if (categorie === 'glass') return NOMS_MATERIAUX.glass;
    if (categorie === 'paper') return /paper/.test(m) && !/cardboard|carton/.test(m) ? 'papier' : 'carton';
    if (categorie === 'pmc') return /metal/.test(m) ? NOMS_MATERIAUX.pmc_metal : NOMS_MATERIAUX.pmc_plastique;
    return '';
}

/**
 * Couche 0 : lit `packagings` (forme + matériau de chaque élément).
 * @returns {Array} composants [{ description, categorie, origine:'structure', confiance:'haute' }]
 */
export function deduireDepuisPackagings(donneesBrutes) {
    const liste = donneesBrutes && donneesBrutes.packagings;
    if (!Array.isArray(liste)) return [];

    const composants = [];
    for (const element of liste) {
        const forme = normaliserTag(element.shape);
        if (FORMES_IGNOREES.has(forme)) continue;

        const categorie = categorieDepuisMateriau(element.material) || CATEGORIE_PAR_FORME[forme] || null;
        if (!categorie) continue; // ni matériau ni forme exploitable : on ne devine pas

        const nomForme = NOMS_FORMES[forme] || 'Emballage';
        const matiere = nomMateriau(element.material, categorie);
        const description = matiere && !['Brique'].includes(nomForme)
            ? `${nomForme} en ${matiere}`
            : (matiere ? `${nomForme} (${matiere})` : nomForme);

        composants.push({ description, categorie, origine: 'structure', confiance: 'haute' });
    }
    return composants;
}

// ─────────────────────────────────────────────────────────────────────────────
// COUCHE 1 — emballage typique d'après la catégorie du produit
// ─────────────────────────────────────────────────────────────────────────────

// Chaque règle vise un tag de catégorie OFF. `composants` = emballage typique (confiance
// moyenne/faible, jamais « haute »). `options` = emballages également plausibles : le
// produit est alors « indéterminé » et on laisse l'utilisateur vérifier.
// Volontairement courte et prudente : mieux vaut ne rien affirmer qu'affirmer à tort.
const REGLES_CATEGORIE = [
    { tags: ['en:uht-milks'],
      nom: 'lait', confiance: 'moyenne',
      composants: [{ description: 'Brique de lait', categorie: 'pmc' }] },
    { tags: ['en:yogurts', 'en:skyrs'],
      nom: 'yaourt', confiance: 'moyenne',
      composants: [{ description: 'Pot en plastique', categorie: 'pmc' }] },
    { tags: ['en:margarines'],
      nom: 'margarine', confiance: 'moyenne',
      composants: [{ description: 'Barquette en plastique', categorie: 'pmc' }] },
    { tags: ['en:canned-foods', 'en:canned-vegetables', 'en:canned-fishes', 'en:canned-fruits'],
      nom: 'conserve', confiance: 'moyenne',
      composants: [{ description: 'Boîte de conserve en acier', categorie: 'pmc' }] },
    { tags: ['en:waters', 'en:spring-waters', 'en:mineral-waters'],
      nom: 'eau', confiance: 'moyenne',
      composants: [{ description: 'Bouteille en plastique', categorie: 'pmc' }] },
    { tags: ['en:wines'],
      nom: 'vin', confiance: 'moyenne',
      composants: [{ description: 'Bouteille en verre', categorie: 'glass' }] },
    { tags: ['en:eggs'],
      nom: 'œufs', confiance: 'moyenne',
      composants: [{ description: 'Boîte en carton', categorie: 'paper' }] },
    // Plusieurs emballages courants → on ne tranche pas.
    { tags: ['en:hazelnut-spreads', 'en:chocolate-spreads', 'en:sweet-spreads', 'en:jams'],
      nom: 'pâte à tartiner / confiture',
      options: [{ description: 'Pot en verre', categorie: 'glass' }, { description: 'Pot en plastique', categorie: 'pmc' }] },
    { tags: ['en:sodas', 'en:carbonated-drinks', 'en:fruit-juices', 'en:beers'],
      nom: 'boisson',
      options: [{ description: 'Bouteille en plastique ou canette', categorie: 'pmc' }, { description: 'Bouteille en verre', categorie: 'glass' }] },
];

/**
 * Couche 1 : cherche la catégorie la PLUS PRÉCISE connue (OFF classe les tags du général
 * au spécifique, on les parcourt donc à l'envers).
 * @returns {{ composants:Array, options:Array|null, nom:string }|null}
 */
export function deduireDepuisCategorie(donneesBrutes) {
    const tags = donneesBrutes && Array.isArray(donneesBrutes.categories_tags) ? donneesBrutes.categories_tags : [];

    for (let i = tags.length - 1; i >= 0; i--) {
        const tag = String(tags[i]).toLowerCase();
        const regle = REGLES_CATEGORIE.find(r => r.tags.includes(tag));
        if (!regle) continue;

        if (regle.options) {
            return { composants: [], options: regle.options, nom: regle.nom };
        }
        return {
            composants: regle.composants.map(c => ({
                ...c, origine: 'deduit_categorie', confiance: regle.confiance,
            })),
            options: null,
            nom: regle.nom,
        };
    }
    return null;
}
