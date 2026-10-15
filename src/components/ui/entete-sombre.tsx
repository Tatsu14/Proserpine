/**
 * EN-TÊTE SOMBRE — `.header-dark` de la version en ligne (accueil et profil).
 * Fond vert très foncé, coins du bas arrondis (24), puis la barre de marque
 * (logo rond + « PROSERPINE » en vert) avec, à droite, une action facultative.
 */
import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/texte';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { couleurs, police, rayon, tailleTexte } from '@/design/tokens';

const logo = require('../../../assets/images/logo.png');

export function EnteteSombre({ children, action }: { children: ReactNode; action?: ReactNode }) {
  const marges = useSafeAreaInsets();
  return (
    <View style={[styles.entete, { paddingTop: Math.max(32, 16 + marges.top) }]}>
      <View style={styles.barre}>
        <View style={styles.marque}>
          <Image source={logo} style={styles.logo} contentFit="cover" />
          <Text style={styles.nom}>PROSERPINE</Text>
        </View>
        {action}
      </View>
      {children}
    </View>
  );
}

/** `.header-action-btn--danger` : petit bouton carré rouge translucide (déconnexion). */
export function EnteteBoutonDanger({ children, onPress }: { children: ReactNode; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Se déconnecter"
      onPress={onPress}
      style={({ pressed }) => [styles.boutonDanger, pressed && { backgroundColor: 'rgba(231, 76, 60, 0.25)' }]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  entete: {
    backgroundColor: couleurs.marqueSombre,
    paddingHorizontal: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: rayon.xl2,
    borderBottomRightRadius: rayon.xl2,
    marginBottom: 24,
  },
  barre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  marque: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 26, height: 26, borderRadius: 13 },
  nom: { fontFamily: police.noir, fontSize: tailleTexte.sm, color: couleurs.marque, letterSpacing: 1.2 },
  boutonDanger: {
    width: 34,
    height: 34,
    borderRadius: rayon.sm,
    backgroundColor: 'rgba(231, 76, 60, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
