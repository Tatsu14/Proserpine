/**
 * FEUILLE DU BAS — panneau blanc qui monte depuis le bas de l'écran (équivalent de
 * `ouvrirFeuille` dans js/ui.js de ProserpineV2).
 *
 * Elle est dessinée DANS l'écran (vue en position absolue) et non dans un <Modal> système.
 * Raison : un <Modal> Android affiche brièvement un écran noir à l'ouverture, ce qui est
 * désagréable ; une vue dans l'écran n'a pas ce défaut, et reste dans le cadre « téléphone »
 * sur ordinateur.
 *
 * Fermeture : toucher le fond sombre, glisser la poignée ou le titre vers le bas, ou
 * (Android) le bouton retour. À placer dans un conteneur qui occupe tout l'écran.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/texte';
import { couleurs, ombre, police, rayon, tailleTexte } from '@/design/tokens';

// Distance (px) ou vitesse de glissement au-delà de laquelle la feuille se ferme.
const SEUIL_DISTANCE = 90;
const SEUIL_VITESSE = 0.8;
const DUREE = 280;

type Props = {
  visible: boolean;
  titre: string;
  sousTitre?: string;
  onFermer: () => void;
  children: ReactNode;
};

export function FeuilleBas({ visible, titre, sousTitre, onFermer, children }: Props) {
  const marges = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // `monte` : la feuille existe dans l'arbre (pendant l'ouverture, l'affichage et la fermeture animée).
  const [monte, setMonte] = useState(visible);
  const progression = useRef(new Animated.Value(visible ? 1 : 0)).current; // 0 = fermée, 1 = ouverte
  const decalage = useRef(new Animated.Value(0)).current; // glissement du doigt
  const natif = Platform.OS !== 'web';

  useEffect(() => {
    if (visible) {
      setMonte(true);
      decalage.setValue(0);
      Animated.timing(progression, { toValue: 1, duration: DUREE, easing: Easing.out(Easing.cubic), useNativeDriver: natif }).start();
    } else {
      Animated.timing(progression, { toValue: 0, duration: DUREE - 60, easing: Easing.in(Easing.cubic), useNativeDriver: natif }).start(
        ({ finished }) => finished && setMonte(false),
      );
    }
  }, [visible, progression, decalage, natif]);

  // Bouton retour d'Android : ferme la feuille au lieu de quitter l'écran.
  useEffect(() => {
    if (!visible || Platform.OS === 'web') return;
    const abonnement = BackHandler.addEventListener('hardwareBackPress', () => {
      onFermer();
      return true;
    });
    return () => abonnement.remove();
  }, [visible, onFermer]);

  const glissement = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_e, g) => {
        if (g.dy > 0) decalage.setValue(g.dy);
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dy > SEUIL_DISTANCE || g.vy > SEUIL_VITESSE) onFermer();
        else Animated.spring(decalage, { toValue: 0, useNativeDriver: natif }).start();
      },
    }),
  ).current;

  if (!monte) return null;

  const glisseOuverture = progression.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });

  return (
    <View style={styles.conteneur} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: progression }]}>
        <Pressable style={styles.voile} onPress={onFermer} accessibilityRole="button" accessibilityLabel="Fermer" />
      </Animated.View>

      <KeyboardAvoidingView behavior="padding" style={styles.clavier} pointerEvents="box-none">
        <Animated.View
          accessibilityViewIsModal
          style={[styles.feuille, { paddingBottom: 24 + marges.bottom, transform: [{ translateY: glisseOuverture }, { translateY: decalage }] }]}
        >
          {/* Zone de glissement : poignée + titre */}
          <View {...glissement.panHandlers}>
            <View style={styles.poignee} />
            <Text style={styles.titre}>{titre}</Text>
            {sousTitre ? <Text style={styles.sousTitre}>{sousTitre}</Text> : null}
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false}>
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: { ...StyleSheet.absoluteFill, zIndex: 1000, elevation: 1000 },
  voile: { flex: 1, backgroundColor: couleurs.voileMoyen },
  clavier: { flex: 1, justifyContent: 'flex-end' },
  feuille: {
    backgroundColor: couleurs.fondCarte,
    borderTopLeftRadius: rayon.xl2,
    borderTopRightRadius: rayon.xl2,
    paddingTop: 10,
    paddingHorizontal: 20,
    maxHeight: '88%',
    boxShadow: ombre.lg,
  },
  poignee: { alignSelf: 'center', width: 40, height: 5, borderRadius: 999, backgroundColor: couleurs.bordure, marginBottom: 12 },
  titre: { fontFamily: police.extraGras, fontSize: tailleTexte.xl2, color: couleurs.texte, marginBottom: 4 },
  sousTitre: { fontFamily: police.normal, fontSize: tailleTexte.base, color: couleurs.texteAttenue, marginBottom: 12 },
});
