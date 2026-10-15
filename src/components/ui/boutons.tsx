/**
 * BOUTONS — reproduisent `.btn-primary`, `.btn-secondary` et `.btn-google` de la
 * version en ligne (css/components.css et css/style.css), valeur pour valeur.
 */
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { couleurs, police, rayon, tailleTexte } from '@/design/tokens';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Remplace la couleur de fond (ex. bouton « Se déconnecter » en rouge). */
  fond?: string;
  accessibilityLabel?: string;
};

/** `.btn-primary` : fond vert, texte gris clair, 14 px gras, coins 12, pleine largeur. */
export function BoutonPrimaire({ children, onPress, disabled, style, fond, accessibilityLabel }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: fond ?? (pressed ? couleurs.marqueFoncee : couleurs.marque), opacity: disabled ? 0.5 : 1 },
        style,
      ]}
    >
      {typeof children === 'string' ? <Text style={[styles.texte, { color: '#EEEEEE' }]}>{children}</Text> : children}
    </Pressable>
  );
}

/** `.btn-secondary` : fond gris clair, texte atténué. */
export function BoutonSecondaire({ children, onPress, disabled, style, accessibilityLabel }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: pressed ? couleurs.bordure : couleurs.fondGris },
        style,
      ]}
    >
      {typeof children === 'string' ? <Text style={[styles.texte, { color: couleurs.texteAttenue }]}>{children}</Text> : children}
    </Pressable>
  );
}

/** Logo Google en quatre couleurs (le même tracé que la version en ligne). */
function LogoGoogle() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </Svg>
  );
}

/** `.btn-google` : fond blanc, bordure 1,5 px, logo Google + « Continuer avec Google ». */
export function BoutonGoogle({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.google,
        { backgroundColor: pressed ? couleurs.fondGris : couleurs.fondCarte, borderColor: pressed ? couleurs.texteAttenue : couleurs.bordure },
      ]}
    >
      <LogoGoogle />
      <Text style={styles.googleTexte}>Continuer avec Google</Text>
    </Pressable>
  );
}

/** Séparateur « ou » entre le formulaire et le bouton Google. */
export function SeparateurOu() {
  return (
    <View style={styles.separateur}>
      <View style={styles.separateurTrait} />
      <Text style={styles.separateurTexte}>OU</Text>
      <View style={styles.separateurTrait} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: rayon.md,
  },
  texte: { fontFamily: police.gras, fontSize: tailleTexte.md },
  google: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    alignSelf: 'stretch',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 1.5,
    borderRadius: rayon.md,
  },
  googleTexte: { fontFamily: police.gras, fontSize: tailleTexte.md, color: couleurs.texte },
  separateur: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 24 },
  separateurTrait: { flex: 1, height: 1, backgroundColor: couleurs.bordure },
  separateurTexte: {
    fontFamily: police.semiGras,
    fontSize: tailleTexte.xs,
    color: couleurs.texteDiscret,
    letterSpacing: 0.55,
  },
});
