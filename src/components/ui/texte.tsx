/**
 * TEXTE — remplace le <Text> de React Native dans les écrans repris de la version en ligne.
 *
 * Pourquoi : la version en ligne applique `line-height: 1.5` à tout le texte de la page
 * (règle `body` de base.css). Sans cela, React Native utilise l'interligne naturel de la
 * police (plus serré) et les blocs de texte sont plus bas qu'en ligne. Ce composant
 * ajoute donc 1,5 × la taille du texte, sauf si l'écran précise lui-même un interligne
 * (comme le fait déjà le CSS de la version en ligne là où il en impose un).
 */
import { StyleSheet, Text as TexteRN, type TextProps } from 'react-native';

import { tailleTexte } from '@/design/tokens';

export function Text({ style, ...reste }: TextProps) {
  const aplati = StyleSheet.flatten(style);
  const taille = typeof aplati?.fontSize === 'number' ? aplati.fontSize : tailleTexte.base;
  return <TexteRN {...reste} style={[{ lineHeight: taille * 1.5 }, style]} />;
}
