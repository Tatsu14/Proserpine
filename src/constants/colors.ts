// Palette de marque Proserpine.
// Les valeurs ne sont PLUS écrites ici : elles viennent de `src/design/tokens.ts`,
// la source unique du design (reprise de css/tokens.css de ProserpineV2).
// Ce fichier garde les anciens noms (Colors.brandPrimary…) pour que les écrans
// existants continuent de fonctionner pendant la refonte.
import { couleurs } from '@/design/tokens';

export const Colors = {
  brandDarkest: couleurs.marqueSombre,
  brandPrimary: couleurs.marque,
  brandPrimaryDark: couleurs.marqueFoncee,
  brandPrimaryLight: couleurs.marqueClaire,

  bgApp: couleurs.fondApp,
  bgGray: couleurs.fondGris,
  bgSurface: couleurs.fondCarte,

  textDark: couleurs.texte,
  textMuted: couleurs.texteAttenue,
  textLight: couleurs.texteDiscret,
  textOnDark: couleurs.texteSurSombre,

  borderDefault: couleurs.bordure,

  statusGood: couleurs.statutBon,
  statusWarning: couleurs.statutAttention,
  statusDanger: couleurs.statutDanger,

  // Catégories du guide de tri
  guidePmc: couleurs.bacPmc,
  guidePaper: couleurs.bacPapier,
  guidePaperText: couleurs.bacPapierTexte,
  guideOrganic: couleurs.bacOrganique,
  guideGlass: couleurs.bacVerre,
  guideResidual: couleurs.bacResiduel,
  guideDanger: couleurs.bacDanger,
} as const;

// Couleur d'accent associée à une classe d'éco-score.
export function scoreColor(scoreClass: string): string {
  switch (scoreClass) {
    case 'excellent':
      return Colors.statusGood;
    case 'bon':
      return Colors.brandPrimary;
    case 'moyen':
      return Colors.statusWarning;
    case 'mauvais':
      return Colors.statusDanger;
    default:
      return Colors.textLight; // 'unknown' → produit non évalué
  }
}

// Couleur associée à une valeur d'éco-score (0-100), selon les mêmes seuils que ecoscore.js.
export function scoreColorByValue(score: number): string {
  if (score >= 75) return Colors.statusGood;
  if (score >= 50) return Colors.brandPrimary;
  if (score >= 25) return Colors.statusWarning;
  return Colors.statusDanger;
}

// Couleur de fond associée à une catégorie de tri (clé telle que retournée par tri.js).
export function categorieColor(categorie: string): string {
  switch (categorie) {
    case 'pmc':
      return Colors.guidePmc;
    case 'paper':
      return Colors.guidePaper;
    case 'glass':
      return Colors.guideGlass;
    case 'organic':
      return Colors.guideOrganic;
    case 'residual':
      return Colors.guideResidual;
    case 'danger':
      return Colors.guideDanger;
    default:
      return Colors.textMuted;
  }
}
