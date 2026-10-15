/**
 * TEXTE — remplace le <Text> de React Native dans tous les écrans.
 *
 * Deux choses :
 *  1. Interligne : la version en ligne applique `line-height: 1.5` à tout le texte (règle
 *     `body` de base.css). Sans cela, React Native utilise l'interligne naturel de la police
 *     (plus serré). On ajoute donc 1,5 × la taille, sauf si l'écran précise lui-même un
 *     interligne (comme le fait déjà le CSS de la version en ligne là où il en impose un).
 *  2. Taille du texte choisie dans les Paramètres : toutes les tailles (et les interlignes
 *     explicites) sont multipliées par le facteur du réglage.
 *
 * `TexteMesure` = même chose mais SANS interligne par défaut : pour la fiche produit, qui
 * suit la maquette et non le CSS de la version en ligne.
 */
import { StyleSheet, Text as TexteRN, type TextProps } from 'react-native';

import { useReglages } from '@/contexts/reglages';
import { tailleTexte } from '@/design/tokens';

function appliquer(style: TextProps['style'], echelle: number, interligneDefaut: boolean) {
  const aplati = StyleSheet.flatten(style) ?? {};
  const taille = typeof aplati.fontSize === 'number' ? aplati.fontSize : tailleTexte.base;
  const tailleFinale = taille * echelle;
  const interligne =
    typeof aplati.lineHeight === 'number'
      ? aplati.lineHeight * echelle
      : interligneDefaut
        ? tailleFinale * 1.5
        : undefined;
  return [style, { fontSize: typeof aplati.fontSize === 'number' ? tailleFinale : undefined, lineHeight: interligne }];
}

export function Text({ style, ...reste }: TextProps) {
  const { echelle } = useReglages();
  return <TexteRN {...reste} style={appliquer(style, echelle, true)} />;
}

export function TexteMesure({ style, ...reste }: TextProps) {
  const { echelle } = useReglages();
  return <TexteRN {...reste} style={appliquer(style, echelle, false)} />;
}
