export const CATEGORIES = {
    pmc:      { title: 'Sac bleu (PMC)',     icon: 'recycling',   cssClass: 'bg-guide-pmc',      iconColor: '#FFF',                          guideType: 'pmc' },
    paper:    { title: 'Papiers & cartons',  icon: 'description', cssClass: 'bg-guide-paper',    iconColor: 'var(--color-guide-paper-text)', guideType: 'paper' },
    glass:    { title: 'Verre',              icon: 'liquor',      cssClass: 'bg-guide-glass',    iconColor: '#FFF',                          guideType: 'glass' },
    organic:  { title: 'Déchets organiques', icon: 'compost',     cssClass: 'bg-guide-organic',  iconColor: '#FFF',                          guideType: 'organic' },
    residual: { title: 'Déchets résiduels',  icon: 'delete',      cssClass: 'bg-guide-residual', iconColor: '#FFF',                          guideType: 'residual' },
    danger:   { title: 'Recyparc',           icon: 'warning',     cssClass: 'bg-guide-danger',   iconColor: '#FFF',                          guideType: 'danger' },
};

// ─────────────────────────────────────────────────────────────────────────────
// SÉCURITÉ D'ABORD — Déchets Spéciaux des Ménages (DSM)
//
// Ces règles raisonnent sur la NATURE du produit (son nom + sa catégorie), et non
// sur son emballage. Un produit dangereux doit aller au Recyparc QUEL QUE SOIT son
// emballage : la consigne de sécurité outrepasse toute classification PMC/résiduel.
// C'est le cas du « tube de colle » : même sans aucune info d'emballage, on sait
// qu'il contient des solvants → Recyparc.
//
// Volontairement conservatrices (nature explicite uniquement) pour éviter les faux
// positifs sur l'alimentaire et la cosmétique (ex. « laque cheveux », « crème
// chantilly » et « déodorant spray » NE doivent PAS basculer en danger : leurs
// aérosols restent acceptés au PMC). À enrichir plus tard avec les pictogrammes CLP
// et le bouchon de sécurité-enfant, quand des signaux de données fiables existeront.
const REGLES_DANGER = [
    { regex: /\bcolle[s]?\b|\bglue[s]?\b|super[\s-]?glue|cyanoacrylate|adh[ée]sif\s+(?:n[ée]opr[èe]ne|fort)/i, motif: 'colle' },
    { regex: /peinture|\bpaint[s]?\b|vernis|\bvarnish\b|white[\s-]?spirit|\bsolvant[s]?\b|\bsolvent[s]?\b|ac[ée]tone|diluant|d[ée]capant|t[ée]r[ée]benthine|laque\s+(?:bois|m[ée]tal|cellulosique)/i, motif: 'peinture ou solvant' },
    { regex: /d[ée]boucheur|d[ée]bouche[\s-]?[ée]vier|soude\s+caustique|acide\s+(?:chlorhydrique|sulfurique|nitrique)|drain[\s-]?cleaner/i, motif: 'produit corrosif' },
    { regex: /insecticide|pesticide|herbicide|raticide|fongicide|anti[\s-]?(?:moustique|mouche|fourmi|nuisible|rongeur)|weed[\s-]?killer/i, motif: 'produit biocide' },
    { regex: /mousse\s+(?:polyur[ée]thane|expansive)|\bmastic\b|silicone\s+(?:sanitaire|joint)/i, motif: 'mousse ou mastic' },
    { regex: /d[ée]grippant|wd[\s-]?40|huile\s+moteur|motor[\s-]?oil|antigel|liquide\s+de\s+(?:frein|refroidissement)/i, motif: 'produit automobile' },
    { regex: /carburant|\bbutane\b|\bpropane\b|gaz\s+(?:briquet|recharge|camping)|allume[\s-]?feu\s+liquide/i, motif: 'produit inflammable' },
];

// Objets durables qui NE SONT PAS des emballages → refus PMC (cf. règle Fost Plus).
// Restrictif par sécurité : qualificatifs exigés pour « gourde » et « couverts » afin
// de ne pas confondre avec de l'emballage (gourde de compote, couverts jetables).
const REGLES_NON_EMBALLAGE = /\bjouet[s]?\b|\btoy[s]?\b|tupperware|\bustensile[s]?\b|\boutil[s]?\b|\btool[s]?\b|\bcintre[s]?\b|arrosoir|vaisselle\s+r[ée]utilisable|gourde\s+(?:r[ée]utilisable|isotherme|inox)|couverts\s+(?:r[ée]utilisables|en\s+inox)/i;

// Règles ordonnées par priorité : les cas spécifiques avant les cas génériques
const REGLES = [
    // Briques alimentaires → PMC (avant "carton" générique → papier)
    { regex: /brique[s]?\s+de\s+(lait|jus|boisson)|carton[s]?\s+[àa]\s+boisson|tetra[\s-]?pak?/i, categorie: 'pmc' },
    // Papier cuisson / sulfurisé → Résiduel (avant "papier" générique → papier)
    { regex: /papier\s+(de\s+)?cuis[s]?on|papier\s+sulfuris[eé]|baking\s+paper/i, categorie: 'residual' },
    // Frigolite de CALAGE / protection (volumineuse, ex. emballage d'électroménager neuf) → Recyparc.
    // Règle Intradel : la frigolite propre de calage n'est PAS acceptée au sac bleu.
    { regex: /(?=.*(?:frigolite|polystyr[eè]ne\s+expans|\beps\b|styrofoam))(?=.*(?:calage|protection|antichoc|transport|[ée]lectrom[eé]nager)).*/i, categorie: 'danger' },
    // Frigolite ALIMENTAIRE (barquettes de viande/poisson) → PMC.
    // Règle Intradel "nouveau sac bleu" : les raviers en frigolite ayant contenu de la nourriture sont acceptés.
    { regex: /frigolite|polystyr[eè]ne\s+expans|\beps\b|styrofoam/i, categorie: 'pmc' },
    // Films multicouches / aluminisés → Résiduel
    { regex: /film\s+aluminisé|multi[\s-]?couche[s]?|complexe\s+plast/i, categorie: 'residual' },

    // Plastiques → PMC
    { regex: /plastique|polypropyl[eè]ne|\bpp\b|poly[eé]thyl[eè]ne|\bpe\b|\bpet\b|\bhdpe\b|\bpehd\b|\bpvc\b|polyester|polystyr[eè]ne|film\s+plast|sachet|sac\s+plast|flacon\s+plast|bouteille\s+plast|barquette\s+plast|pot\s+plast|opercule\s+plast|couvercle\s+plast|bouchon\s+plast|bidon|pochette/i, categorie: 'pmc' },
    // Métaux → PMC
    { regex: /aluminium|aluminum|\balu\b|acier|canette|bo[îi]te\s+de\s+conserve|capsule|opercule\s+(m[eé]tal|alu)|barquette\s+(alu|m[eé]tal)|\bm[eé]tal\b|zinc|\bfer\b/i, categorie: 'pmc' },

    // Verre → Verre
    { regex: /\bverre\b|bocal|pot\s+(en\s+)?verre|bouteille\s+(en\s+)?verre|flacon\s+(en\s+)?verre|\bglass\b/i, categorie: 'glass' },

    // Carton / Papier → Papier & cartons
    { regex: /\bcarton\b|cardboard|\bpap\b|c\/pap|\bpapier\b|\bpaper\b|kraft|[eé]tui|notice|brochure|bo[îi]te\s+carton|emballage\s+carton/i, categorie: 'paper' },

    // Bois → Résiduel
    { regex: /\bbois\b|\bwood\b/i, categorie: 'residual' },
    // Compostable → Organique
    { regex: /compostable|biodégradable|bio[\s-]?sourcé/i, categorie: 'organic' },
    // Dangereux → Recyparc
    { regex: /\bpile[s]?\b|\bbatterie[s]?\b|accumulateur|déchets?\s+[eé]lectronique|\bdeee\b/i, categorie: 'danger' },
];

// Mapping tags normalisés Open Food Facts → catégorie + description française
const TAGS_MAP = {
    'en:plastic':         { categorie: 'pmc',      description: 'Emballage en plastique' },
    'en:plastic-bottle':  { categorie: 'pmc',      description: 'Bouteille en plastique' },
    'en:plastic-bag':     { categorie: 'pmc',      description: 'Sachet en plastique' },
    'en:plastic-pouch':   { categorie: 'pmc',      description: 'Sachet souple' },
    'en:aluminium':       { categorie: 'pmc',      description: 'Emballage en aluminium' },
    'en:aluminum':        { categorie: 'pmc',      description: 'Emballage en aluminium' },
    'en:metal':           { categorie: 'pmc',      description: 'Emballage métallique' },
    'en:steel':           { categorie: 'pmc',      description: 'Emballage en acier' },
    'en:drink-can':       { categorie: 'pmc',      description: 'Canette' },
    'en:food-can':        { categorie: 'pmc',      description: 'Boîte de conserve' },
    'en:beverage-carton': { categorie: 'pmc',      description: 'Brique / Carton à boisson' },
    'en:cardboard':       { categorie: 'paper',    description: 'Emballage en carton' },
    'en:cardboard-box':   { categorie: 'paper',    description: 'Boîte en carton' },
    'en:paper':           { categorie: 'paper',    description: 'Emballage en papier' },
    'en:glass':           { categorie: 'glass',    description: 'Emballage en verre' },
    'en:glass-bottle':    { categorie: 'glass',    description: 'Bouteille en verre' },
    'en:glass-jar':       { categorie: 'glass',    description: 'Bocal en verre' },
    'en:wood':            { categorie: 'residual', description: 'Emballage en bois' },
};

const NOMS_CATEGORIES = {
    pmc:      'le sac bleu (PMC)',
    paper:    'la collecte papier/carton',
    glass:    'la bulle à verre',
    organic:  'la collecte des déchets organiques',
    residual: 'la poubelle des déchets résiduels',
    danger:   'un Recyparc',
};

function detecterCategorie(texte) {
    for (const regle of REGLES) {
        if (regle.regex.test(texte)) return regle.categorie;
    }
    return null;
}

// Concatène les champs qui décrivent la NATURE du produit (nom + catégories), pour
// les règles qui raisonnent sur ce qu'EST le produit, pas sur son emballage.
function texteNature(donneesBrutes) {
    return [
        donneesBrutes.product_name_fr,
        donneesBrutes.product_name,
        donneesBrutes.generic_name_fr,
        donneesBrutes.generic_name,
        donneesBrutes.categories,
        Array.isArray(donneesBrutes.categories_tags) ? donneesBrutes.categories_tags.join(' ') : '',
    ].filter(Boolean).join(' ').trim();
}

// Détecte si le produit est dangereux d'après sa NATURE (nom + catégories OFF/OBF/OPF),
// indépendamment de son emballage. Retourne le motif détecté (ex. 'colle') ou null.
function detecterDanger(donneesBrutes) {
    const texte = texteNature(donneesBrutes);
    if (texte.length === 0) return null;

    for (const regle of REGLES_DANGER) {
        if (regle.regex.test(texte)) return regle.motif;
    }
    return null;
}

// Détecte un OBJET durable (non-emballage) : jouet, ustensile, outil, cintre…
// Ces objets ne relèvent pas du circuit d'emballage → jamais au sac bleu (PMC).
// Volontairement restrictif : on exclut les mots ambigus qui désignent aussi de
// l'emballage alimentaire (seau de glace, pot de yaourt, gourde de compote, bidon
// de lessive) en exigeant un qualificatif (« gourde réutilisable », etc.).
function detecterNonEmballage(donneesBrutes) {
    const texte = texteNature(donneesBrutes);
    if (texte.length === 0) return false;
    return REGLES_NON_EMBALLAGE.test(texte);
}

// Supprime les codes techniques d'emballage (UE) et abréviations résines
// pour rendre la description lisible par tous.
function simplifierDescription(desc) {
    return desc
        // Codes composites EU : C/PAP 82, C/G 90, C/FE 95, C/ALU 96…
        .replace(/\bC\/[A-Z]+\s*\d*\b/gi, '')
        // Codes matériaux EU : PAP 21, GL 70, FE 40, ALU 41, FOR 50, TEX 60, PUR 19…
        .replace(/\b(?:PAP|GL|FE|ALU|FOR|TEX|PUR)\s*\d+\b/gi, '')
        // Abréviations résines plastiques (mot entier uniquement)
        .replace(/\b(?:PP|PE|PET|HDPE|PEHD|LDPE|LLDPE|PVC|PS|EPS|ABS|PC|PMMA|PA|PLA|EVA|POM|SAN)\b/gi, '')
        // Nettoyage espaces multiples et ponctuation traînante
        .replace(/\s{2,}/g, ' ')
        .replace(/[\s,;.]+$/, '')
        .replace(/^[\s,;.]+/, '')
        .trim();
}

function extraireComposants(texte) {
    const lignes = texte.split(/[\n\r;]+/);
    const composants = [];

    for (const ligne of lignes) {
        const propre = ligne
            .replace(/^\s*\d+(\s*[×xX])?\s+/, '')
            .replace(/\s+[àa]\s+recycler\.?\s*$/i, '')
            .replace(/\s+recyclable\.?\s*$/i, '')
            .trim();

        if (propre.length < 3) continue;

        const categorie = detecterCategorie(propre);
        if (categorie) {
            const simplifie = simplifierDescription(propre);
            if (simplifie.length < 3) continue;
            composants.push({
                description: simplifie.charAt(0).toUpperCase() + simplifie.slice(1),
                categorie,
            });
        }
    }

    return composants;
}

function analyserDepuisTags(donneesBrutes) {
    const tags = [
        ...(donneesBrutes.packaging_tags || []),
        ...(donneesBrutes.packaging_materials_tags || []),
    ];

    const composants = [];
    const seenCats = new Set();

    for (const tag of tags) {
        const mapped = TAGS_MAP[tag];
        if (mapped && !seenCats.has(mapped.categorie)) {
            seenCats.add(mapped.categorie);
            composants.push({ description: mapped.description, categorie: mapped.categorie });
        }
    }

    return composants;
}

function genererInstructions(composants) {
    if (composants.length === 0) return null;

    if (composants.length === 1) {
        return `Mettez ${composants[0].description.toLowerCase()} dans ${NOMS_CATEGORIES[composants[0].categorie]}.`;
    }

    const parCategorie = {};
    composants.forEach(c => {
        if (!parCategorie[c.categorie]) parCategorie[c.categorie] = [];
        parCategorie[c.categorie].push(c.description.toLowerCase());
    });

    const parties = Object.entries(parCategorie).map(([cat, descs]) => {
        const items = descs.length === 1
            ? descs[0]
            : descs.slice(0, -1).join(', ') + ' et ' + descs[descs.length - 1];
        return `${items} dans ${NOMS_CATEGORIES[cat]}`;
    });

    if (parties.length === 1) {
        return `Mettez ${parties[0]}.`;
    }

    const derniere = parties.pop();
    return `Séparez les éléments avant de trier : ${parties.join(', ')} et ${derniere}.`;
}

/**
 * Analyse les données brutes d'un produit et retourne les consignes de tri.
 * @param {Object} donneesBrutes - Données brutes de l'API Open Food Facts
 * @returns {{ composants: Array, instructions: string|null }}
 */
export function analyserEmballage(donneesBrutes) {
    if (!donneesBrutes) return { composants: [], instructions: null };

    // Priorité 0 — SÉCURITÉ D'ABORD : si le produit est dangereux par nature, il
    // va au Recyparc (DSM) quel que soit son emballage. Cette règle outrepasse tout
    // (un emballage plastique ne doit pas faire basculer une colle ou une peinture
    // en PMC). C'est ce qui distingue un système logique d'un système fixe.
    const motifDanger = detecterDanger(donneesBrutes);
    if (motifDanger) {
        return {
            composants: [{ description: `Produit dangereux (${motifDanger})`, categorie: 'danger' }],
            instructions: `Produit potentiellement dangereux (${motifDanger}) : apportez-le au Recyparc (Déchets Spéciaux des Ménages). Ne le jetez ni au sac bleu (PMC) ni aux déchets résiduels, même vide.`,
        };
    }

    // Priorité 0 bis — OBJET DURABLE (non-emballage) : un jouet, un ustensile ou un
    // outil n'est pas un emballage → il ne va jamais au sac bleu (PMC), quel que soit
    // son matériau. Même logique que le danger : on raisonne sur la nature du produit.
    if (detecterNonEmballage(donneesBrutes)) {
        return {
            composants: [{ description: 'Objet réutilisable (non emballage)', categorie: 'danger' }],
            instructions: `Cet objet n'est pas un emballage : il ne va donc pas au sac bleu (PMC). Selon sa matière, déposez-le au Recyparc (benne plastiques durs ou métaux) ou dans la filière adaptée.`,
        };
    }

    // Priorité 1 : texte français détaillé (le plus fiable)
    const texteFr = donneesBrutes.packaging_text_fr;
    if (texteFr && texteFr.trim().length > 5) {
        const composants = extraireComposants(texteFr);
        if (composants.length > 0) {
            return { composants, instructions: genererInstructions(composants) };
        }
    }

    // Priorité 2 : texte générique
    const texteGen = donneesBrutes.packaging_text;
    if (texteGen && texteGen.trim().length > 5) {
        const composants = extraireComposants(texteGen);
        if (composants.length > 0) {
            return { composants, instructions: genererInstructions(composants) };
        }
    }

    // Priorité 3 : tags normalisés
    const composantsTags = analyserDepuisTags(donneesBrutes);
    if (composantsTags.length > 0) {
        return { composants: composantsTags, instructions: genererInstructions(composantsTags) };
    }

    // Priorité 4 : champ "packaging" legacy (texte libre, ignorer les valeurs numériques)
    const legacy = donneesBrutes.packaging;
    if (typeof legacy === 'string' && legacy.trim().length > 5 && !/^\d+(\.\d+)?$/.test(legacy.trim())) {
        const composants = extraireComposants(legacy);
        if (composants.length > 0) {
            return { composants, instructions: genererInstructions(composants) };
        }
    }

    return { composants: [], instructions: null };
}
