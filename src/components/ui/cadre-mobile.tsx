/**
 * CADRE MOBILE — sur ordinateur (largeur ≥ 600 px), la version en ligne montre l'app
 * dans un cadre de téléphone de 390 × 844 px (coins arrondis, bordure, ombre verte),
 * centré sur un fond gris. On reproduit exactement cela. Sur téléphone, et dans
 * l'application native, l'app occupe tout l'écran.
 */
import type { ReactNode } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

import { couleurs } from '@/design/tokens';

const LARGEUR_CADRE = 390;
const HAUTEUR_CADRE = 844;

export function CadreMobile({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  const sousCadre = Platform.OS === 'web' && width >= 600;

  if (!sousCadre) return <View style={styles.plein}>{children}</View>;

  return (
    <View style={styles.exterieur}>
      <View style={[styles.cadre, { height: Math.min(HAUTEUR_CADRE, height - 16) }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  plein: { flex: 1, backgroundColor: couleurs.fondApp },
  // Fond extérieur sur ordinateur : #f0f0f0 comme en ligne.
  exterieur: { flex: 1, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  cadre: {
    width: LARGEUR_CADRE,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#DFE6E1',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: couleurs.fondApp,
    boxShadow: '0 20px 60px rgba(0, 204, 102, 0.15)',
  } as any,
});
