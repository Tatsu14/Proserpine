/**
 * TOKENS DE DESIGN — source unique du visuel de Proserpine (web + natif).
 *
 * Ces valeurs sont reprises à l'identique de `css/tokens.css` de ProserpineV2,
 * dont Monsieur adore le visuel : on le CONSERVE. Rien n'est inventé ici.
 * Les mesures en rem du site sont converties en pixels (1 rem = 16 px).
 *
 * Règle : aucun écran n'écrit une couleur, un espace ou un rayon « en dur ».
 * Tout passe par ce fichier, pour qu'un changement de design se fasse à un
 * seul endroit et apparaisse partout (web ET natif).
 */

// ---------------------------------------------------------------------------
// COULEURS
// ---------------------------------------------------------------------------
export const couleurs = {
  // Marque
  marqueSombre: '#071E12',
  marque: '#00CC66',
  marqueFoncee: '#00994C',
  marqueClaire: 'rgba(0, 204, 102, 0.10)',
  marqueLueur: 'rgba(0, 204, 102, 0.40)',

  // Arrière-plans
  fondApp: '#E2E8F0',
  fondGris: '#F3F5F4',
  fondCarte: '#FFFFFF',
  fondPointille: '#C2D4C9',

  // Textes
  texte: '#0F1713',
  texteAttenue: '#596B62',
  texteDiscret: '#A4B5AC',
  texteSurSombre: '#FFFFFF',
  texteSurSombreAttenue: 'rgba(255, 255, 255, 0.60)',
  texteSurSombreFaible: 'rgba(255, 255, 255, 0.80)',

  // Bordures
  bordure: '#E4EBE6',
  bordureMarque: '#00CC66',
  bordureSurSombre: 'rgba(255, 255, 255, 0.15)',

  // Statuts
  statutBon: '#27AE60',
  statutAttention: '#FF9800',
  statutDanger: '#E74C3C',
  statutBonFond: 'rgba(0, 204, 102, 0.10)',
  statutAttentionFond: 'rgba(255, 152, 0, 0.10)',

  // Bacs du guide de tri (les couleurs des cartes de tri)
  bacPmc: '#3498DB',
  bacPapier: '#F1C40F',
  bacPapierTexte: '#2C3E50',
  bacOrganique: '#27AE60',
  bacVerre: '#95A5A6',
  bacVerreColore: '#9B7030',
  bacResiduel: '#4a4a4a',
  bacDanger: '#E74C3C',

  // Voiles
  voileFort: 'rgba(0, 0, 0, 0.80)',
  voileMoyen: 'rgba(0, 0, 0, 0.50)',
} as const;

// ---------------------------------------------------------------------------
// ESPACEMENTS (px)
// Deux familles dans le site : une échelle régulière (espace-N, multiples de 4)
// et une échelle « nombre d'or » (φ ≈ 1,618) pour les grands rythmes.
// ---------------------------------------------------------------------------
export const espace = {
  e1: 4,
  e2: 8,
  e3: 12,
  e4: 16,
  e5: 20,
  e6: 24,
  e8: 32,
  e10: 40,
  e12: 48,
  // Échelle nombre d'or
  phiXs: 6.1,
  phiSm: 9.9,
  phiMd: 16,
  phiLg: 25.9,
  phiXl: 41.9,
  phi2xl: 67.8,
  // Espace réservé en bas de page pour ne pas passer sous la barre de navigation
  basContenu: 90,
} as const;

// ---------------------------------------------------------------------------
// RAYONS DE BORDURE (px)
// ---------------------------------------------------------------------------
export const rayon = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xl2: 24,
  xl3: 32,
  phi: 25.9,
  rond: 9999,
} as const;

// ---------------------------------------------------------------------------
// TAILLES DE TEXTE (px) — échelle du site
// ---------------------------------------------------------------------------
export const tailleTexte = {
  xxs: 10,
  xs: 11,
  sm: 12,
  base: 13,
  md: 14,
  lg: 16,
  xl: 18,
  xl2: 20,
  xl3: 24,
  xl4: 26,
  xl5: 41.9,
} as const;

// ---------------------------------------------------------------------------
// POLICES
// Le site utilise Outfit (texte) et JetBrains Mono (chiffres, codes).
// En natif, le « poids » ne s'écrit pas avec font-weight : chaque graisse est
// une police distincte. Ces noms correspondent à ceux chargés dans _layout.tsx.
// ---------------------------------------------------------------------------
export const police = {
  normal: 'Outfit_400Regular',
  moyen: 'Outfit_500Medium',
  semiGras: 'Outfit_600SemiBold',
  gras: 'Outfit_700Bold',
  extraGras: 'Outfit_800ExtraBold',
  noir: 'Outfit_900Black',
  mono: 'JetBrainsMono_400Regular',
  monoGras: 'JetBrainsMono_700Bold',
} as const;

// ---------------------------------------------------------------------------
// OMBRES — mêmes valeurs que le site (syntaxe CSS, comprise par React Native
// 0.76+ en nouvelle architecture ET par le web).
// ---------------------------------------------------------------------------
export const ombre = {
  sm: '0 1px 2px rgba(0,0,0,0.05)',
  md: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
  lg: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
  recherche: '0 8px 16px rgba(0, 204, 102, 0.15)',
} as const;

// ---------------------------------------------------------------------------
// DIMENSIONS DES COMPOSANTS (px)
// ---------------------------------------------------------------------------
export const dimension = {
  boutonIcone: 40,
  icone: 48,
  cercleScan: 56,
  jauge: 160,
  hauteurNavigation: 80,
} as const;

// ---------------------------------------------------------------------------
// DURÉES D'ANIMATION (ms)
// ---------------------------------------------------------------------------
export const duree = {
  rapide: 200,
  normale: 300,
  jauge: 1500,
} as const;
