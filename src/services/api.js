/**
 * api.js - Cascade de recherche API
 * Implémente la recherche prioritaire : Open Food Facts -> Open Beauty Facts -> Open Products Facts
 */

const APIS = [
    { id: 'openfoodfacts', url: 'https://world.openfoodfacts.org' },
    { id: 'openbeautyfacts', url: 'https://world.openbeautyfacts.org' },
    { id: 'openproductsfacts', url: 'https://world.openproductsfacts.org' }
];

/**
 * Fetch résilient : impose un timeout (AbortController) et réessaie avec un
 * back-off croissant. Amortit l'instabilité des connexions à Open*Facts — une
 * coupure passagère ne fait plus échouer la requête au premier essai.
 * Lève l'erreur après le dernier essai (l'appelant passe alors à l'API suivante).
 */
async function fetchResilient(url, { timeoutMs = 7000, retries = 1 } = {}) {
    let derniereErreur;
    for (let tentative = 0; tentative <= retries; tentative++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timer);
            return response;
        } catch (error) {
            clearTimeout(timer);
            derniereErreur = error;
            if (tentative < retries) {
                await new Promise((r) => setTimeout(r, 400 * (tentative + 1)));
            }
        }
    }
    throw derniereErreur;
}

/**
 * Recherche un produit par son code-barres (EAN) et dit si « introuvable » est CERTAIN.
 * Parcourt les API en cascade et s'arrête à la première correspondance trouvée.
 *
 * Pourquoi `introuvableCertain` : un `null` peut vouloir dire « ce produit n'existe pas » ou
 * « le réseau a lâché » (timeout, erreur 500…). Pour tenir la liste des produits à compléter,
 * on ne doit noter que les vrais « inconnu ». Une API qui ne connaît pas l'EAN répond
 * 404 + `{"status":0}` : on exige cette réponse nette des TROIS API.
 *
 * @param {string} ean Le code EAN scanné ou entré manuellement
 * @returns {{ produit: Object|null, introuvableCertain: boolean }}
 */
export async function rechercherProduitDetaille(ean) {
    let reponsesInconnu = 0; // API ayant répondu clairement « produit inconnu »

    for (const api of APIS) {
        try {
            const response = await fetchResilient(`${api.url}/api/v2/product/${ean}.json`, {
                timeoutMs: 7000,
                retries: 1,
            });

            // Si la requête échoue techniquement (ex: 404, 500), on passe à la suivante.
            // Un 404 accompagné de status 0 reste compté : c'est la réponse normale « inconnu ».
            if (!response.ok) {
                if (response.status === 404) {
                    const inconnu = await response.json().catch(() => null);
                    if (inconnu && inconnu.status === 0) reponsesInconnu++;
                }
                continue;
            }

            const data = await response.json();

            // status: 1 indique que le produit a été trouvé
            if (data.status === 1 && data.product) {
                return { produit: normaliserProduit(data.product, api.id), introuvableCertain: false };
            }
            if (data.status === 0) reponsesInconnu++;
        } catch (error) {
            console.error(`Erreur fetch EAN via ${api.id}:`, error);
        }
    }

    // Si la boucle se termine sans rien trouver
    return { produit: null, introuvableCertain: reponsesInconnu === APIS.length };
}

/**
 * Recherche un produit par son code-barres (EAN) — version simple : l'objet produit ou null.
 * @param {string} ean Le code EAN scanné ou entré manuellement
 * @returns {Object|null} Objet produit normalisé ou null si introuvable
 */
export async function rechercherProduitParEAN(ean) {
    return (await rechercherProduitDetaille(ean)).produit;
}

/**
 * Recherche textuelle de produits
 * Lance les requêtes en parallèle sur les 3 API, puis agrège et déduplique.
 * @param {string} terme Le terme de recherche
 * @returns {Array} Liste des produits trouvés
 */
export async function rechercherProduitParTexte(terme) {
    const termEncoded = encodeURIComponent(terme);
    
    // Requêtes parallèles pour des résultats plus rapides en recherche temps réel
    const fetchPromises = APIS.map(async (api) => {
        try {
            // Utilisation de l'API de recherche V1 (search.pl) qui est plus tolérante pour le texte complet.
            // Pas de retry ici (recherche live) mais un timeout pour ne pas bloquer la frappe.
            const response = await fetchResilient(
                `${api.url}/cgi/search.pl?search_terms=${termEncoded}&json=1&page_size=20`,
                { timeoutMs: 6000, retries: 0 },
            );
            if (!response.ok) return [];
            
            const data = await response.json();
            if (data.products && data.products.length > 0) {
                return data.products.map(p => normaliserProduit(p, api.id));
            }
        } catch (error) {
            console.error(`Erreur fetch texte via ${api.id}:`, error);
        }
        return [];
    });
    
    const resultsArrays = await Promise.all(fetchPromises);
    const allResults = resultsArrays.flat();
    
    // Déduplication par EAN — favorise l'entrée nommée si l'EAN apparaît dans plusieurs API
    const uniqueResultsMap = new Map();
    allResults.forEach(product => {
        const existing = uniqueResultsMap.get(product.ean);
        if (product.nom !== 'Produit inconnu') {
            if (!existing || existing.nom === 'Produit inconnu') {
                uniqueResultsMap.set(product.ean, product);
            }
        } else if (!existing) {
            uniqueResultsMap.set(product.ean, product);
        }
    });
    
    return Array.from(uniqueResultsMap.values());
}

/**
 * Normalise les données brutes provenant de n'importe quelle instance d'Open (Food/Beauty/Products) Facts
 * Produit un objet standardisé pour toute l'application.
 * @param {Object} donneesBrutes Les données JSON de l'API
 * @param {string} source L'ID de l'API source
 * @returns {Object} Le produit normalisé
 */
export function normaliserProduit(donneesBrutes, source) {
    return {
        ean: donneesBrutes.code || donneesBrutes.id || '',
        nom: donneesBrutes.product_name_fr || donneesBrutes.product_name || 'Produit inconnu',
        marque: donneesBrutes.brands || 'Marque inconnue',
        categorie: donneesBrutes.categories || '',
        imageUrl: donneesBrutes.image_url || donneesBrutes.image_front_url || null,
        ingredients: donneesBrutes.ingredients_text_fr || donneesBrutes.ingredients_text || null,
        emballage: donneesBrutes.packaging || null,
        pays_origine: donneesBrutes.manufacturing_places || donneesBrutes.origins || null,
        source: source,
        donnees_brutes: donneesBrutes // Conservé pour le calcul de l'éco-score
    };
}
