/**
 * CARTE D'AUTHENTIFICATION — le décor commun de la connexion et de l'inscription
 * (`.auth-container` / `.auth-card`) : carte blanche arrondie, logo rond, titre,
 * sous-titre. La carte arrive en glissant de 20 px vers le haut (animation `slideIn`).
 */
import { Image } from 'expo-image';
import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/texte';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { couleurs, ombre, police, rayon, tailleTexte } from '@/design/tokens';

const logo = require('../../../assets/images/logo.png');

export function CarteAuth({ titre, sousTitre, children }: { titre: string; sousTitre: string; children: ReactNode }) {
  const marges = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [anim]);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: couleurs.fondCarte }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.conteneur, { paddingTop: 16 + marges.top, paddingBottom: 16 + marges.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={[
            styles.carte,
            { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] },
          ]}
        >
          <Image source={logo} style={styles.logo} contentFit="cover" />
          <Text style={styles.titre}>{titre}</Text>
          <Text style={styles.sousTitre}>{sousTitre}</Text>
          {children}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Message d'erreur général au-dessus du formulaire (`.auth-error`). */
export function ErreurAuth({ message }: { message: string }) {
  if (!message) return null;
  return <Text style={styles.erreur}>{message}</Text>;
}

/** « Pas encore de compte ? S'inscrire » (`.auth-links`). */
export function LiensAuth({ texte, lien, onPress }: { texte: string; lien: string; onPress: () => void }) {
  return (
    <View style={styles.liens}>
      <Text style={styles.liensTexte}>
        {texte}{' '}
        <Text accessibilityRole="link" onPress={onPress} style={styles.lien}>
          {lien}
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  carte: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: couleurs.fondCarte,
    borderRadius: rayon.xl2,
    paddingVertical: 32,
    paddingHorizontal: 24,
    boxShadow: ombre.lg,
  },
  logo: { width: 64, height: 64, borderRadius: 32, alignSelf: 'center', marginBottom: 24 },
  titre: { fontFamily: police.extraGras, fontSize: tailleTexte.xl2, color: couleurs.marqueSombre, textAlign: 'center', marginBottom: 8 },
  sousTitre: { fontFamily: police.normal, fontSize: tailleTexte.sm, color: couleurs.texteAttenue, textAlign: 'center', marginBottom: 32 },
  erreur: { fontFamily: police.normal, fontSize: tailleTexte.sm, color: couleurs.statutDanger, textAlign: 'center', marginBottom: 16 },
  liens: { marginTop: 24, alignItems: 'center' },
  liensTexte: { fontFamily: police.normal, fontSize: tailleTexte.sm, color: couleurs.texteAttenue, textAlign: 'center' },
  lien: { fontFamily: police.gras, color: couleurs.marqueFoncee },
});
