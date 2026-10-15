// Contenu du guide de tri, porté depuis la version web (guide-detail.js + guide.html).
// Le balisage HTML d'origine (badges « DANGEREUX ») est converti en texte simple.
import { Colors } from './colors';

export type GuideCategory = {
  key: string;
  color: string;
  textColor: string;
  icon: string; // nom d'icône MaterialIcons (mêmes que les Material Symbols du web)
  title: string;
  cardDesc: string; // description courte affichée sur la carte de la liste (comme guide.html)
  desc: string; // description longue affichée sur l'écran de détail
  accepted: string[];
  refused: string[];
  warnings?: string[];
  tip?: string;
};

// Ordre identique à guide.html : pmc, paper, organic, glass, residual, danger.
export const GUIDE_ORDER = ['pmc', 'paper', 'organic', 'glass', 'residual', 'danger'];

export const GUIDE: Record<string, GuideCategory> = {
  pmc: {
    key: 'pmc',
    color: Colors.guidePmc,
    textColor: '#FFFFFF',
    icon: 'recycling',
    title: 'Sac bleu (PMC)',
    cardDesc: 'Plastiques, métaux, cartons à boisson',
    desc: 'Destiné aux emballages en Plastique, Métal et Cartons à boisson.',
    accepted: [
      'Bouteilles et flacons en plastique',
      'Emballages métalliques (conserves, canettes, barquettes en aluminium)',
      'Cartons à boisson (lait, jus)',
      'Films plastiques, sacs et sachets',
      'Pots et raviers en plastique (yaourt, beurre)',
    ],
    refused: [
      'Emballages avec un bouchon de sécurité enfant (dangereux)',
      'Emballages de produits chimiques ou toxiques (dangereux)',
      'Frigolite de calage (volumineuse)',
      'Objets en plastique (jouets, seaux)',
    ],
    tip: 'Écrasez vos bouteilles en plastique dans le sens de la longueur et remettez le bouchon pour gagner de la place.',
  },
  paper: {
    key: 'paper',
    color: Colors.guidePaper,
    textColor: Colors.guidePaperText,
    icon: 'description',
    title: 'Papiers & cartons',
    cardDesc: 'Papiers, cartons propres',
    desc: 'Collecte des papiers et cartons propres et secs.',
    accepted: [
      'Boîtes en carton',
      'Journaux, magazines, publicités',
      "Papiers d'écriture, enveloppes",
      'Sacs en papier',
    ],
    refused: [
      'Papiers gras ou souillés (boîtes de pizza sales)',
      'Mouchoirs en papier, essuie-tout (→ Organique)',
      'Papier peint',
      'Papiers plastifiés ou métallisés',
    ],
    tip: "Ficelez vos papiers et cartons ou placez-les dans une boîte fermée pour éviter qu'ils ne s'envolent.",
  },
  organic: {
    key: 'organic',
    color: Colors.guideOrganic,
    textColor: '#FFFFFF',
    icon: 'compost',
    title: 'Déchets organiques',
    cardDesc: 'Déchets alimentaires, végétaux',
    desc: 'Destiné aux déchets biodégradables de cuisine et de jardin.',
    accepted: [
      'Restes de repas (sans os ni arêtes)',
      'Épluchures de fruits et légumes',
      'Marc de café, sachets de thé',
      'Fleurs fanées, petites plantes',
      'Essuie-tout et mouchoirs non souillés par des produits chimiques',
    ],
    refused: [
      'Langes / Couches',
      'Cendres de bois ou de charbon',
      'Litières non biodégradables',
      'Plastiques dits « biodégradables » (sauf sacs compostables agréés)',
    ],
  },
  glass: {
    key: 'glass',
    color: Colors.guideGlass,
    textColor: '#FFFFFF',
    icon: 'liquor',
    title: 'Verre',
    cardDesc: 'Bouteilles, bocaux en verre transparent',
    desc: 'Emballages en verre à déposer dans les bulles à verre — il en existe deux types.',
    accepted: ['Bouteilles en verre (vides)', 'Bocaux et pots en verre (vides)'],
    refused: [
      'Verre plat (vitres, miroirs)',
      'Verre résistant à la chaleur (Pyrex)',
      'Porcelaine, céramique, terre cuite',
      'Ampoules et tubes néons (dangereux)',
    ],
    warnings: [
      'Verre transparent (bouteilles claires, bocaux) → bulle à verre BLANCHE.',
      'Verre coloré (vert, brun…) → bulle à verre COLORÉE. Mettre du verre coloré dans la bulle blanche rend toute la collecte non recyclable.',
    ],
    tip: 'Rincez rapidement vos bouteilles et bocaux avant de les déposer — inutile de les laver à fond.',
  },
  residual: {
    key: 'residual',
    color: Colors.guideResidual,
    textColor: '#FFFFFF',
    icon: 'delete',
    title: 'Déchets résiduels',
    cardDesc: 'Déchets non recyclables',
    desc: 'La poubelle des déchets non recyclables ailleurs.',
    accepted: [
      'Langes / Couches',
      'Restes de repas très gras, os, litières',
      'Objets en plastique (non emballages)',
      'Filtres à café avec marc (si pas de tri organique)',
    ],
    refused: [
      'Piles et batteries (dangereux)',
      'Produits toxiques (dangereux)',
      'Déchets électriques ou électroniques',
      'Tout ce qui va dans les autres poubelles de tri',
    ],
  },
  danger: {
    key: 'danger',
    color: Colors.guideDanger,
    textColor: '#FFFFFF',
    icon: 'warning',
    title: 'Recyparc',
    cardDesc: 'Piles, produits chimiques, DEEE',
    desc: 'Les déchets qui nécessitent un traitement spécifique (toxicité ou encombrement).',
    accepted: [
      'Piles et batteries',
      'Restes de peintures, solvants, huiles de vidange',
      'Déchets électriques et électroniques (DEEE)',
      'Ampoules économiques, tubes néon',
      'Médicaments périmés (de préférence à rapporter en pharmacie)',
    ],
    refused: ['Déchets explosifs ou radioactifs', 'Amiante non préparé spécifiquement'],
  },
};
