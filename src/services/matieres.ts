/**
 * matieres.ts — « Quelle est la matière ? » : arbre de décision en deux questions.
 *
 * Quand l'application ne sait rien de l'emballage, l'utilisateur répond lui-même. Une seule
 * question (« Carton, papier ») ne sert à rien : la réponse est évidente. L'intérêt est dans
 * les cas où l'on se trompe vraiment : un carton gras ne va PAS au papier, une brique de lait
 * va au sac PMC, le verre se trie par couleur, la frigolite n'est pas du plastique d'emballage.
 *
 * Toutes les réponses viennent du guide de tri de l'application (constants/guide.ts, repris de
 * la version en ligne). TEXTES ET RÈGLES PROVISOIRES : à valider avec Monsieur et à recouper avec
 * une source officielle (trionsmieux.be, Intradel). Module pur : aucun affichage.
 */

/** Le résultat d'un choix : le bac et ce qu'on affiche sur sa carte. */
export type ResultatMatiere = {
  /** Clé du bac (celles de tri.js : pmc, paper, glass, organic, residual, danger). */
  categorie: string;
  /** Texte de la carte (ce que l'utilisateur a choisi). */
  elements: string[];
  /** Pourquoi : une phrase qui explique la règle. */
  explication: string;
};

export type OptionMatiere = {
  id: string;
  /** Titre court de la réponse. */
  libelle: string;
  /** Précision entre parenthèses, en plus petit. */
  detail?: string;
  resultat: ResultatMatiere;
};

export type Matiere = {
  id: string;
  nom: string;
  exemples: string;
  icone: string;
  /** Deuxième question. Absente = la matière donne toujours le même bac (pas de question). */
  question?: string;
  options: OptionMatiere[];
};

export const MATIERES: Matiere[] = [
  {
    id: 'plastique',
    nom: 'Plastique',
    exemples: 'sachet, bouteille, pot',
    icone: 'inventory_2',
    question: 'De quel plastique s’agit-il ?',
    options: [
      {
        id: 'emballage',
        libelle: 'Un emballage',
        detail: 'sachet, film, bouteille, pot, barquette',
        resultat: { categorie: 'pmc', elements: ['Emballage en plastique'], explication: 'Tous les emballages en plastique vont dans le sac PMC.' },
      },
      {
        id: 'frigolite',
        libelle: 'De la frigolite',
        detail: 'polystyrène blanc, calage',
        resultat: {
          categorie: 'residual',
          elements: ['Frigolite'],
          explication: 'La frigolite ne va pas au sac PMC. Elle va aux déchets résiduels.',
        },
      },
      {
        id: 'objet',
        libelle: 'Un objet',
        detail: 'jouet, seau, ustensile',
        resultat: {
          categorie: 'residual',
          elements: ['Objet en plastique'],
          explication: 'Ce n’est pas un emballage : un objet en plastique ne va pas au sac PMC.',
        },
      },
      {
        id: 'dangereux',
        libelle: 'Un emballage dangereux',
        detail: 'produit chimique, bouchon de sécurité enfant',
        resultat: {
          categorie: 'danger',
          elements: ['Emballage de produit dangereux'],
          explication: 'Un emballage de produit chimique ou toxique, ou avec un bouchon de sécurité enfant, va au Recyparc.',
        },
      },
    ],
  },
  {
    id: 'carton',
    nom: 'Carton, papier',
    exemples: 'boîte, étui',
    icone: 'description',
    question: 'Dans quel état est-il ?',
    options: [
      {
        id: 'propre',
        libelle: 'Propre et sec',
        detail: 'boîte, étui, journal',
        resultat: { categorie: 'paper', elements: ['Carton ou papier propre'], explication: 'Le papier et le carton propres et secs vont à la collecte papiers et cartons.' },
      },
      {
        id: 'souille',
        libelle: 'Gras ou très souillé',
        detail: 'boîte de pizza sale',
        resultat: {
          categorie: 'residual',
          elements: ['Carton gras ou souillé'],
          explication: 'Un papier ou un carton gras ou souillé ne se recycle pas : il va aux déchets résiduels.',
        },
      },
      {
        id: 'plastifie',
        libelle: 'Plastifié ou métallisé',
        detail: 'papier brillant, doublé d’aluminium',
        resultat: {
          categorie: 'residual',
          elements: ['Papier plastifié ou métallisé'],
          explication: 'Les papiers plastifiés ou métallisés ne vont pas aux papiers et cartons.',
        },
      },
      {
        id: 'boisson',
        libelle: 'Un carton à boisson',
        detail: 'brique de lait ou de jus',
        resultat: { categorie: 'pmc', elements: ['Carton à boisson'], explication: 'Les cartons à boisson (lait, jus) vont dans le sac PMC, pas aux papiers.' },
      },
      {
        id: 'mouchoirs',
        libelle: 'Mouchoirs, essuie-tout',
        detail: 'non souillés par un produit chimique',
        resultat: { categorie: 'organic', elements: ['Mouchoirs, essuie-tout'], explication: 'Les mouchoirs et essuie-tout non souillés par un produit chimique vont aux déchets organiques.' },
      },
    ],
  },
  {
    id: 'metal',
    nom: 'Métal',
    exemples: 'canette, conserve',
    icone: 'settings',
    question: 'De quoi s’agit-il ?',
    options: [
      {
        id: 'emballage',
        libelle: 'Une canette ou une conserve',
        detail: 'boîte, barquette ou papier aluminium',
        resultat: { categorie: 'pmc', elements: ['Emballage métallique'], explication: 'Les emballages métalliques vont dans le sac PMC.' },
      },
      {
        id: 'aerosol',
        libelle: 'Un aérosol vide',
        detail: 'ne le percez surtout pas',
        resultat: { categorie: 'pmc', elements: ['Aérosol vide'], explication: 'Un aérosol vide va dans le sac PMC. Ne le percez surtout pas.' },
      },
      {
        id: 'dangereux',
        libelle: 'Il a contenu un produit chimique',
        detail: 'peinture, solvant, produit toxique',
        resultat: { categorie: 'danger', elements: ['Emballage de produit dangereux'], explication: 'Un emballage de peinture, solvant ou produit toxique va au Recyparc.' },
      },
    ],
  },
  {
    id: 'verre',
    nom: 'Verre',
    exemples: 'bocal, bouteille',
    icone: 'liquor',
    question: 'De quelle couleur est-il ?',
    options: [
      {
        id: 'transparent',
        libelle: 'Transparent',
        detail: 'verre clair, incolore',
        resultat: { categorie: 'glass', elements: ['Verre transparent : bulle blanche'], explication: 'Le verre transparent va dans la bulle à verre blanche.' },
      },
      {
        id: 'colore',
        libelle: 'Coloré',
        detail: 'vert, brun…',
        resultat: {
          categorie: 'glass',
          elements: ['Verre coloré : bulle colorée'],
          explication: 'Le verre coloré va dans la bulle colorée. Le mettre dans la bulle blanche rend toute la collecte non recyclable.',
        },
      },
      {
        id: 'ampoule',
        libelle: 'Une ampoule ou un tube néon',
        resultat: { categorie: 'danger', elements: ['Ampoule ou tube néon'], explication: 'Les ampoules et les tubes néon vont au Recyparc, pas à la bulle à verre.' },
      },
    ],
  },
  {
    id: 'brique',
    nom: 'Brique de boisson',
    exemples: 'lait, jus',
    icone: 'local_drink',
    // Pas de question : une brique va toujours au sac PMC.
    options: [
      {
        id: 'brique',
        libelle: 'Brique de boisson',
        resultat: { categorie: 'pmc', elements: ['Brique de boisson'], explication: 'Les briques de lait et de jus vont dans le sac PMC.' },
      },
    ],
  },
];
