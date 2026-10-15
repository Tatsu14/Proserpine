/**
 * FEUILLE « Pourquoi cette note ? » — les détails de l'indice d'impact quittent la
 * fiche et s'ouvrent À LA DEMANDE, dans une feuille qui monte du bas de l'écran.
 *
 * On la ferme en touchant le fond sombre, en la faisant glisser vers le bas
 * (par la poignée ou le titre), ou avec le bouton « retour » d'Android.
 */
import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { couleurs, ombre, police, rayon, tailleTexte } from '@/design/tokens';
import { Icone } from '@/design/icones';

/** Un point qui fait varier l'indice (forme renvoyée par ecoscore.js). */
export type Facteur = { label: string; impact: number; explication: string };

// Distance (px) ou vitesse de glissement au-delà de laquelle la feuille se ferme.
const SEUIL_DISTANCE = 90;
const SEUIL_VITESSE = 0.8;

function LigneFacteur({ facteur }: { facteur: Facteur }) {
  const [ouvert, setOuvert] = useState(false);
  const negatif = facteur.impact < 0;
  // Le signe moins typographique « − » est plus lisible que le trait d'union.
  const impact = `${negatif ? '−' : '+'}${Math.abs(facteur.impact)}`;
  const teinte = negatif ? couleurs.statutDanger : couleurs.statutBon;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: ouvert }}
      onPress={() => setOuvert((o) => !o)}
      style={styles.facteur}
    >
      <View style={styles.facteurTete}>
        <View style={[styles.point, { backgroundColor: teinte }]} />
        <Text style={styles.facteurLabel}>{facteur.label}</Text>
        <Text style={[styles.facteurImpact, { color: teinte }]}>{impact}</Text>
        <Icone nom={ouvert ? 'expand_less' : 'expand_more'} taille={24} couleur={couleurs.texteDiscret} />
      </View>
      {ouvert ? <Text style={styles.facteurExplication}>{facteur.explication}</Text> : null}
    </Pressable>
  );
}

export function FeuilleIndice({
  visible,
  onFermer,
  facteurs,
  paysOrigine,
}: {
  visible: boolean;
  onFermer: () => void;
  facteurs: Facteur[];
  /** Pays de fabrication, s'il est connu : simple information, sans effet affiché sur la note. */
  paysOrigine?: string | null;
}) {
  const marges = useSafeAreaInsets();
  const decalage = useRef(new Animated.Value(0)).current;

  // À chaque ouverture, la feuille repart de sa position normale.
  useEffect(() => {
    if (visible) decalage.setValue(0);
  }, [visible, decalage]);

  // Glissement vers le bas : la feuille suit le doigt, puis se ferme ou revient.
  const glissement = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_e, g) => {
        if (g.dy > 0) decalage.setValue(g.dy);
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dy > SEUIL_DISTANCE || g.vy > SEUIL_VITESSE) {
          onFermer();
        } else {
          Animated.spring(decalage, { toValue: 0, useNativeDriver: Platform.OS !== 'web' }).start();
        }
      },
    }),
  ).current;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onFermer} statusBarTranslucent>
      <View style={styles.conteneur}>
        <Pressable
          style={styles.voile}
          onPress={onFermer}
          accessibilityRole="button"
          accessibilityLabel="Fermer"
        />
        <Animated.View
          accessibilityViewIsModal
          style={[styles.feuille, { paddingBottom: 24 + marges.bottom, transform: [{ translateY: decalage }] }]}
        >
          {/* Zone de glissement : poignée + titre */}
          <View {...glissement.panHandlers}>
            <View style={styles.poignee} />
            <Text style={styles.titre}>Pourquoi cette note ?</Text>
            <Text style={styles.sousTitre}>Les points qui font varier l’indice d’impact de ce produit.</Text>
          </View>

          {facteurs.length > 0 ? (
            facteurs.map((f) => <LigneFacteur key={f.label} facteur={f} />)
          ) : (
            // Aucun facteur propre à Proserpine : la note vient entièrement de la base de données.
            <Text style={styles.aucun}>
              Cette note vient de l’indice calculé par Open Food Facts (analyse du cycle de vie du produit).
              Aucun autre point n’a été relevé pour l’ajuster.
            </Text>
          )}

          {paysOrigine ? (
            <View style={styles.facteur}>
              <View style={styles.facteurTete}>
                <View style={[styles.point, { backgroundColor: couleurs.texteDiscret }]} />
                <Text style={[styles.facteurLabel, { color: couleurs.texteAttenue }]}>
                  Pays de fabrication : {paysOrigine}
                </Text>
              </View>
            </View>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  conteneur: { flex: 1, justifyContent: 'flex-end' },
  voile: { ...StyleSheet.absoluteFill, backgroundColor: couleurs.voileMoyen },
  feuille: {
    backgroundColor: couleurs.fondCarte,
    borderTopLeftRadius: rayon.xl2,
    borderTopRightRadius: rayon.xl2,
    paddingTop: 10,
    paddingHorizontal: 20,
    maxHeight: '85%',
    boxShadow: ombre.lg,
  },
  poignee: { alignSelf: 'center', width: 40, height: 5, borderRadius: 999, backgroundColor: couleurs.bordure, marginBottom: 12 },
  titre: { fontFamily: police.extraGras, fontSize: tailleTexte.xl2, color: couleurs.texte, marginBottom: 4 },
  sousTitre: { fontFamily: police.normal, fontSize: tailleTexte.base, color: couleurs.texteAttenue, marginBottom: 12 },
  facteur: { borderBottomWidth: 1, borderBottomColor: couleurs.bordure, minHeight: 52, justifyContent: 'center', paddingVertical: 6 },
  facteurTete: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  point: { width: 10, height: 10, borderRadius: 5 },
  facteurLabel: { flex: 1, fontFamily: police.semiGras, fontSize: tailleTexte.md, color: couleurs.texte },
  facteurImpact: { fontFamily: police.extraGras, fontSize: tailleTexte.md },
  facteurExplication: {
    fontFamily: police.normal,
    fontSize: tailleTexte.base,
    color: couleurs.texteAttenue,
    lineHeight: 19,
    marginTop: 8,
    marginLeft: 20,
  },
  aucun: { fontFamily: police.normal, fontSize: tailleTexte.md, color: couleurs.texteAttenue, lineHeight: 20, paddingVertical: 8 },
});
