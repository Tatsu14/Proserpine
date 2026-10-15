/**
 * ecoscore.js - Moteur de calcul de l'éco-score
 */

const PALM_OIL_KEYWORDS = [
    'huile de palme', 'palm oil', 'palmöl', 'aceite de palma',
    'olio di palma', 'palmolie', 'huile de palmiste', 'palm kernel oil'
];

const HIGH_CARBON_COUNTRIES = [
    'chine', 'china', 'inde', 'india', 'brésil', 'brazil', 'indonésie', 'indonesia',
    'vietnam', 'bangladesh', 'thaïlande', 'thailand', 'malaisie', 'malaysia'
];

// Cherche des termes dans d.labels (texte) et d.labels_tags (tableau normalisé OFF)
function hasLabel(d, ...terms) {
    const text = (d.labels || '').toLowerCase();
    const tags = (d.labels_tags || []).join(' ').toLowerCase();
    const all = text + ' ' + tags;
    return terms.some(t => all.includes(t));
}

/**
 * Collecte tous les facteurs (positifs et négatifs) à partir des données brutes.
 * Sert à la fois au calcul du score et à l'affichage filtré.
 */
function collecterTousFacteurs(d) {
    const facteurs = [];
    if (!d) return facteurs;

    // --- Emballage ---
    // Priorité aux tags normalisés OFF pour le Tetra Pak (sinon le texte "plastique" le pénalise à tort)
    const packagingTags = [
        ...(d.packaging_tags || []),
        ...(d.packaging_materials_tags || []),
    ];

    if (packagingTags.includes('en:beverage-carton')) {
        facteurs.push({
            label: 'Emballage multicouche léger',
            impact: +5,
            explication: "Les briques en carton (type Tetra Pak) ont l'une des meilleures empreintes carbones par litre contenu grâce à leur légèreté et à leur proportion élevée de matériaux renouvelables (~75 % de carton)."
        });
    } else if (d.packaging && typeof d.packaging === 'string') {
        const pkg = d.packaging.toLowerCase();

        if (pkg.includes('compostable') || pkg.includes('biosourcé') || pkg.includes('biosource')) {
            facteurs.push({
                label: 'Emballage bioplastique',
                impact: -10,
                explication: "Les bioplastiques dits « compostables » nécessitent des cultures (maïs, canne à sucre) consommatrices d'eau et de pesticides. Ils se dégradent mal en compostage domestique et leur bilan ACV est souvent moins bon que le PET recyclé."
            });
        } else if (pkg.includes('plastique') || pkg.includes('plastic')) {
            facteurs.push({
                label: 'Emballage plastique',
                impact: -20,
                explication: "Le plastique est l'un des matériaux les plus polluants de la planète. Sa production consomme des ressources fossiles non renouvelables, et il met plusieurs centaines d'années à se décomposer. Moins de 10 % du plastique mondial est effectivement recyclé."
            });
        } else if (
            (pkg.includes('carton') || pkg.includes('papier') || pkg.includes('paper'))
            && !pkg.includes('plastique') && !pkg.includes('plastic')
        ) {
            facteurs.push({
                label: 'Emballage carton / papier',
                impact: +5,
                explication: "Le carton et le papier sont des matériaux biosourcés et recyclables. Bien gérés en fin de vie, ils ont un impact environnemental nettement inférieur aux emballages plastiques."
            });
        }
        // Verre = impact 0 (fusion très énergivore + poids logistique élevé compensent la recyclabilité)
    }

    // --- Huile de palme ---
    if (d.ingredients_text) {
        const ingredients = d.ingredients_text.toLowerCase();
        if (PALM_OIL_KEYWORDS.some(kw => ingredients.includes(kw))) {
            facteurs.push({
                label: 'Huile de palme',
                impact: -18,
                explication: "La culture de l'huile de palme est l'une des principales causes de déforestation tropicale, notamment en Asie du Sud-Est. Elle entraîne la destruction d'habitats naturels et la perte de biodiversité. Même certifiée durable, son impact reste significatif."
            });
        }
    }

    // --- Ultra-transformation (NOVA 4) ---
    if (d.nova_group && Number(d.nova_group) === 4) {
        facteurs.push({
            label: 'Produit ultra-transformé',
            impact: -15,
            explication: "Les produits ultra-transformés nécessitent de nombreuses étapes industrielles, chacune consommant de l'énergie et générant des déchets. Leur fabrication mobilise souvent des ingrédients issus de cultures intensives et des emballages complexes difficiles à recycler."
        });
    }

    // --- Pays de fabrication éloigné ---
    // Signal faible : le transport représente 5-9 % de l'ACV totale (maritime très efficace, air catastrophique
    // mais indétectable depuis l'API). Malus réduit à -5 pour éviter la surévaluation.
    if (d.origins || d.countries) {
        const geo = ((d.origins || '') + ' ' + (d.countries || '')).toLowerCase();
        if (HIGH_CARBON_COUNTRIES.some(pays => geo.includes(pays))) {
            facteurs.push({
                label: 'Pays de fabrication éloigné',
                impact: -5,
                explication: "Le transport représente 5 à 9 % de l'ACV d'un aliment. L'origine lointaine est un signal d'impact modéré — le mode de transport (aérien ou maritime) et les pratiques agricoles locales restent plus déterminants."
            });
        }
    }

    // --- Certifications agricoles (hiérarchisées : la plus exigeante prime) ---
    if (hasLabel(d, 'demeter', 'biodynami', 'natureo')) {
        facteurs.push({
            label: 'Agriculture biodynamique',
            impact: +15,
            explication: "Les certifications biodynamiques (Demeter) vont au-delà du bio standard : elles intègrent la reconstitution active des sols, la biodiversité fonctionnelle et l'absence totale de produits de synthèse."
        });
    } else if (hasLabel(d, 'bio', 'organic')) {
        facteurs.push({
            label: 'Agriculture biologique',
            impact: +10,
            explication: "La certification biologique garantit l'absence de pesticides et d'engrais de synthèse. Ces pratiques préservent la biodiversité des sols et limitent la contamination des eaux souterraines."
        });
    }

    // --- Haute Valeur Environnementale (HVE) ---
    if (hasLabel(d, 'hve', 'haute valeur environnementale', 'haute-valeur-environnementale')) {
        facteurs.push({
            label: 'Haute Valeur Environnementale',
            impact: +5,
            explication: "La certification HVE atteste de pratiques agricoles respectueuses de la biodiversité (haies, agroforesterie), d'une gestion raisonnée des intrants et de la préservation des ressources en eau."
        });
    }

    // --- Commerce équitable ---
    if (hasLabel(d, 'fair-trade', 'fairtrade', 'havelaar', 'équitable', 'equitable')) {
        facteurs.push({
            label: 'Commerce équitable',
            impact: +10,
            explication: "Les certifications Fairtrade et Max Havelaar garantissent un prix plancher aux producteurs, des conditions de travail décentes et des exigences environnementales minimales (interdiction des intrants les plus dangereux)."
        });
    }

    // --- Pêche durable (MSC) ---
    if (hasLabel(d, 'msc', 'marine stewardship')) {
        facteurs.push({
            label: 'Pêche durable (MSC)',
            impact: +10,
            explication: "La certification MSC garantit que la pêcherie respecte les quotas de reproduction des espèces et utilise des techniques limitant la destruction des fonds marins et les captures accidentelles."
        });
    }

    // --- Produit non transformé (NOVA 1) ---
    if (d.nova_group && Number(d.nova_group) === 1) {
        facteurs.push({
            label: 'Produit non transformé',
            impact: +5,
            explication: "Les produits bruts ou peu transformés (NOVA 1) nécessitent moins d'étapes industrielles. Leur fabrication est moins énergivore et génère moins de déchets d'emballage complexes."
        });
    }

    return facteurs;
}

/**
 * Retourne les facteurs négatifs les plus impactants pour l'affichage sur la fiche produit.
 * @param {Object} d - Les données brutes issues de l'API
 * @returns {Array} Top 3 facteurs négatifs { label, impact, explication }
 */
function detecterFacteurs(d) {
    const tous = collecterTousFacteurs(d);
    const negatifs = tous.filter(f => f.impact < 0);
    negatifs.sort((a, b) => a.impact - b.impact);
    return negatifs.slice(0, 3);
}

/**
 * Calcule l'éco-score final d'un produit.
 * @param {Object} donneesBrutes - Données brutes issues de l'API
 * @returns {Object} { score, label, detail, scoreClass, facteurs }
 */
export function calculerEcoScore(donneesBrutes) {
    // Facteurs réels détectés (emballage, ingrédients, labels, NOVA, origine…)
    const tousFacteurs = collecterTousFacteurs(donneesBrutes);

    // Open Food Facts a-t-il fourni son propre éco-score (basé sur l'ACV) ?
    const aScoreOFF = donneesBrutes
        && donneesBrutes.ecoscore_score != null
        && !Number.isNaN(Number(donneesBrutes.ecoscore_score));

    // Honnêteté intellectuelle : sans score OFF NI aucun facteur réel détecté, on n'a
    // aucune base pour juger. On n'invente pas une note de 50 (« Bon ») — on le dit.
    if (!aScoreOFF && tousFacteurs.length === 0) {
        return {
            score: null,
            label: 'Non évalué',
            detail: "Données insuffisantes pour évaluer l'impact écologique de ce produit. Nous préférons ne rien affirmer plutôt que de vous induire en erreur.",
            scoreClass: 'unknown',
            facteurs: [],
            evalue: false,
        };
    }

    // Score de base : éco-score Open Food Facts si disponible, sinon 50 (point de
    // départ neutre, utilisé uniquement quand au moins un facteur réel existe).
    let baseScore = aScoreOFF ? Number(donneesBrutes.ecoscore_score) : 50;
    baseScore = Math.max(0, Math.min(100, baseScore));

    // Ajustement : somme de tous les facteurs détectés (positifs + négatifs), plafonné à ±40
    const totalBrut = tousFacteurs.reduce((sum, f) => sum + f.impact, 0);
    const ajustement = Math.max(-40, Math.min(40, totalBrut));

    let scoreFinal = Math.floor(baseScore + ajustement);
    scoreFinal = Math.max(0, Math.min(100, scoreFinal));

    let label = '';
    let detail = '';
    if (scoreFinal >= 75) {
        label = 'Excellent';
        detail = "Ce produit a un très faible impact environnemental. Son cycle de vie, de la production à l'emballage, respecte les normes écologiques.";
    } else if (scoreFinal >= 50) {
        label = 'Bon';
        detail = "Impact environnemental modéré. Des efforts ont été faits (ex: emballage recyclable ou agriculture responsable), mais des marges de progression existent.";
    } else if (scoreFinal >= 25) {
        label = 'Moyen';
        detail = "L'impact écologique de ce produit est non négligeable. Pensez à vérifier ses emballages ou son origine.";
    } else {
        label = 'Mauvais';
        detail = "Impact environnemental très élevé. Son cycle de production, son transport ou ses emballages pèsent lourdement sur la planète.";
    }

    return {
        score: scoreFinal,
        label,
        detail,
        scoreClass: getClassForScore(scoreFinal),
        facteurs: detecterFacteurs(donneesBrutes),
        evalue: true,
    };
}

function getClassForScore(score) {
    if (score >= 75) return 'excellent';
    if (score >= 50) return 'bon';
    if (score >= 25) return 'moyen';
    return 'mauvais';
}
