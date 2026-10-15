// Contenu du guide de tri — REPRIS MOT POUR MOT de la version en ligne
// (js/pages/guide-detail.js et pages/guide.html de ProserpineV2).
//
// Petit balisage dans les textes, converti en affichage par <TexteRiche> :
//   {{DANGEREUX}}  → pastille rouge « DANGEREUX » (le <span class="badge-danger"> d'origine)
//   **texte**      → texte en gras (le <strong> d'origine)
import { couleurs } from '@/design/tokens';

export type GuideCategory = {
  key: string;
  color: string;
  textColor: string;
  icon: string; // nom d'icône Material Symbols (converti par <Icone>)
  title: string;
  cardTitle: string; // titre de la carte de la liste (avec retour à la ligne, comme guide.html)
  cardDesc: string; // description courte affichée sur la carte de la liste
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
    color: couleurs.bacPmc,
    textColor: '#FFFFFF',
    icon: 'recycling',
    title: 'Sac bleu (PMC)',
    cardTitle: 'Sac bleu\n(PMC)',
    cardDesc: 'Plastiques, métaux, cartons à boisson',
    desc: 'Destiné aux emballages en Plastique, Métal et Cartons à boisson.',
    accepted: [
      'Bouteilles et flacons en plastique',
      'Emballages métalliques (boîtes de conserve, canettes, barquettes en aluminium)',
      'Cartons à boisson (lait, jus)',
      'Films plastiques, sacs et sachets',
      'Pots et raviers en plastique (yaourt, beurre)',
    ],
    refused: [
      'Emballages avec un bouchon de sécurité enfant {{DANGEREUX}}',
      'Emballages de produits chimiques ou toxiques {{DANGEREUX}}',
      'Frigolite (polystyrène expansé)',
      'Objets en plastique (jouets, seaux)',
    ],
    tip: 'Écrasez vos bouteilles en plastique dans le sens de la longueur et remettez le bouchon pour gagner de la place.',
  },
  paper: {
    key: 'paper',
    color: couleurs.bacPapier,
    textColor: couleurs.bacPapierTexte,
    icon: 'description',
    title: 'Papiers & cartons',
    cardTitle: 'Papiers &\ncartons',
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
    tip: "Ficelez bien vos papiers et cartons avec de la ficelle naturelle ou placez-les dans une boîte fermée pour éviter qu'ils ne s'envolent.",
  },
  organic: {
    key: 'organic',
    color: couleurs.bacOrganique,
    textColor: '#FFFFFF',
    icon: 'compost',
    title: 'Déchets organiques',
    cardTitle: 'Déchets\norganiques',
    cardDesc: 'Déchets alimentaires, végétaux',
    desc: 'Destiné aux déchets biodégradables de cuisine et de jardin.',
    accepted: [
      'Restes de repas (sans os ni arêtes)',
      'Épluchures de fruits et légumes',
      'Marc de café, sachets de thé',
      'Fleurs fanées, petites plantes',
      'Essuie-tout et mouchoirs en papier non souillés par des produits chimiques',
    ],
    refused: [
      'Langes / Couches',
      'Cendres de bois ou de charbon',
      'Litières non biodégradables',
      'Plastiques dits "biodégradables" (sauf sacs compostables agréés)',
    ],
  },
  glass: {
    key: 'glass',
    color: couleurs.bacVerre,
    textColor: '#FFFFFF',
    icon: 'liquor',
    title: 'Verre',
    cardTitle: 'Verre',
    cardDesc: 'Bouteilles, bocaux en verre transparent',
    desc: 'Emballages en verre à déposer dans les bulles à verre — attention, il en existe deux types.',
    accepted: ['Bouteilles en verre (vides)', 'Bocaux et pots en verre (vides)'],
    refused: [
      'Verre plat (vitres, miroirs)',
      'Verre résistant à la chaleur (Pyrex)',
      'Porcelaine, céramique, terre cuite',
      'Ampoules et tubes néons {{DANGEREUX}}',
    ],
    warnings: [
      'Verre transparent (bouteilles claires, bocaux) → bulle à verre **blanche**',
      'Verre coloré (vert, brun…) → bulle à verre **colorée**. Mettre du verre coloré dans la bulle blanche rend toute la collecte non recyclable.',
    ],
    tip: 'Rincez rapidement vos bouteilles et bocaux avant de les déposer — inutile de les laver à fond.',
  },
  residual: {
    key: 'residual',
    color: couleurs.bacResiduel,
    textColor: '#FFFFFF',
    icon: 'delete',
    title: 'Déchets résiduels',
    cardTitle: 'Déchets\nrésiduels',
    cardDesc: 'Déchets non recyclables',
    desc: 'La poubelle noire ou le conteneur gris. Pour tout ce qui ne se recycle pas ailleurs.',
    accepted: [
      'Langes / Couches',
      'Restes de repas très gras, os, litières',
      'Objets en plastique (non emballages)',
      'Cassettes audio/vidéo',
      'Filtres à café avec marc (si pas de tri organique)',
    ],
    refused: [
      'Piles et batteries {{DANGEREUX}}',
      'Produits toxiques {{DANGEREUX}}',
      'Déchets électriques ou électroniques',
      'Tout ce qui va dans les autres poubelles de tri',
    ],
  },
  danger: {
    key: 'danger',
    color: couleurs.bacDanger,
    textColor: '#FFFFFF',
    icon: 'warning',
    title: 'Recyparc',
    cardTitle: 'Recyparc',
    cardDesc: 'Piles, produits chimiques, DEEE',
    desc: 'Les déchets qui nécessitent un traitement spécifique en raison de leur toxicité ou encombrement.',
    accepted: [
      'Piles et batteries',
      'Restes de peintures, solvants, huiles de vidange',
      "Déchets d'équipements électriques et électroniques (DEEE)",
      'Ampoules économiques, tubes néon',
      'Médicaments périmés (à rapporter en pharmacie de préférence)',
    ],
    refused: ['Déchets explosifs ou radioactifs', 'Amiante non préparé spécifiquement'],
  },
};
