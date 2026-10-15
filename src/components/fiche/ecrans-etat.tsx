/**
 * ÉCRANS D'ÉTAT de la fiche produit : « Produit introuvable » et « Chargement ».
 * Chacun est un écran dédié (maquettes validées) : pas de jauge « 0 / 100 » ni de
 * sections vides en attendant la réponse.
 */
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BoutonRetour } from '@/components/fiche/blocs-info';
import { couleurs, police, rayon, tailleTexte } from '@/design/tokens';
import { Icone } from '@/design/icones';

/** Écran « Produit introuvable » avec deux actions claires. */
export function EcranIntrouvable({
  onRetour,
  onReessayer,
  onChercher,
}: {
  onRetour: () => void;
  onReessayer: () => void;
  onChercher: () => void;
}) {
  const marges = useSafeAreaInsets();
  return (
    <View style={styles.page}>
      <View style={[styles.enteteNu, { paddingTop: 10 + marges.top }]}>
        <BoutonRetour onPress={onRetour} />
        <Text style={styles.enteteTitre}>Produit</Text>
      </View>
      <View style={styles.vide}>
        <View style={styles.rond}>
          <Icone nom="search_off" taille={44} couleur={couleurs.texteAttenue} />
        </View>
        <Text style={styles.videTitre}>Produit introuvable</Text>
        <Text style={styles.videTexte}>
          Nous n’avons pas pu identifier ce code-barres. Il n’est peut-être pas encore dans la base, ou la
          connexion a échoué.
        </Text>
      </View>
      <Pressable accessibilityRole="button" onPress={onReessayer} style={[styles.bouton, styles.boutonPlein]}>
        <Icone nom="refresh" taille={22} couleur={couleurs.marqueSombre} />
        <Text style={[styles.boutonTexte, { color: couleurs.marqueSombre }]}>Réessayer</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onChercher} style={[styles.bouton, styles.boutonGris]}>
        <Icone nom="search" taille={22} couleur={couleurs.texte} />
        <Text style={[styles.boutonTexte, { color: couleurs.texte }]}>Chercher par nom</Text>
      </Pressable>
    </View>
  );
}

/** Une zone grise qui « respire » (squelette) à la place du contenu qui arrive. */
function Squelette({ style }: { style: object }) {
  const opacite = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const boucle = Animated.loop(
      Animated.sequence([
        Animated.timing(opacite, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacite, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    boucle.start();
    return () => boucle.stop();
  }, [opacite]);
  return <Animated.View style={[styles.squelette, style, { opacity: opacite }]} />;
}

/** Écran de chargement : squelette gris à la place de « 0 / 100 » et de « Chargement… ». */
export function EcranChargement({ onRetour }: { onRetour: () => void }) {
  const marges = useSafeAreaInsets();
  return (
    <View style={styles.page}>
      <View style={[styles.enteteNu, { paddingTop: 10 + marges.top }]}>
        <BoutonRetour onPress={onRetour} />
        <View style={{ flex: 1 }}>
          <Squelette style={{ height: 20, width: '80%', marginBottom: 6 }} />
          <Squelette style={{ height: 13, width: '40%' }} />
        </View>
      </View>
      <View style={styles.recherche}>
        <Icone nom="hourglass_top" taille={22} couleur={couleurs.texteAttenue} />
        <Text style={styles.rechercheTexte}>Recherche du produit…</Text>
      </View>
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <Squelette style={{ height: 22, width: 140, marginBottom: 12 }} />
        <Squelette style={{ height: 72, borderRadius: rayon.lg, marginBottom: 10 }} />
        <Squelette style={{ height: 72, borderRadius: rayon.lg, marginBottom: 10 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fondGris },
  enteteNu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: couleurs.fondCarte,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  enteteTitre: { fontFamily: police.extraGras, fontSize: tailleTexte.xl, color: couleurs.marqueSombre },
  vide: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 24, paddingBottom: 16 },
  rond: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: couleurs.fondCarte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  videTitre: { fontFamily: police.noir, fontSize: 22, color: couleurs.marqueSombre, marginBottom: 8 },
  videTexte: {
    fontFamily: police.normal,
    fontSize: tailleTexte.md,
    color: couleurs.texteAttenue,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 290,
  },
  bouton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    borderRadius: rayon.md,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  boutonPlein: { backgroundColor: couleurs.marque },
  boutonGris: { backgroundColor: couleurs.fondCarte, borderWidth: 1, borderColor: couleurs.bordure },
  boutonTexte: { fontFamily: police.extraGras, fontSize: tailleTexte.lg - 1 },
  squelette: { backgroundColor: couleurs.bordure, borderRadius: rayon.sm },
  recherche: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 14 },
  rechercheTexte: { fontFamily: police.gras, fontSize: tailleTexte.md, color: couleurs.texteAttenue },
});
