// Palette de marque Proserpine — portée depuis css/tokens.css de la version web,
// pour garder une identité visuelle cohérente entre le web et le natif.
export const Colors = {
  brandDarkest: '#071E12',
  brandPrimary: '#00CC66',
  brandPrimaryDark: '#00994C',
  brandPrimaryLight: 'rgba(0, 204, 102, 0.10)',

  bgApp: '#E2E8F0',
  bgGray: '#F3F5F4',
  bgSurface: '#FFFFFF',

  textDark: '#0F1713',
  textMuted: '#596B62',
  textLight: '#A4B5AC',
  textOnDark: '#FFFFFF',

  borderDefault: '#E4EBE6',

  statusGood: '#27AE60',
  statusWarning: '#FF9800',
  statusDanger: '#E74C3C',

  // Catégories du guide de tri
  guidePmc: '#3498DB',
  guidePaper: '#F1C40F',
  guidePaperText: '#2C3E50',
  guideOrganic: '#27AE60',
  guideGlass: '#95A5A6',
  guideResidual: '#4a4a4a',
  guideDanger: '#E74C3C',
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
