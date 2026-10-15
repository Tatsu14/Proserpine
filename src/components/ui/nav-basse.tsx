/**
 * BARRE DE NAVIGATION DU BAS — reproduit `.bottom-nav` de la version en ligne :
 * cinq entrées (Accueil · Recherche · [Scan] · Guide · Profil), hauteur 80 px,
 * fond blanc, filet gris en haut. Le bouton Scan est un rond vert très foncé de
 * 56 px, remonté de 30 px, entouré d'un anneau blanc de 4 px, avec une pulsation
 * verte continue.
 *
 * Icône active : pleine et en noir ; inactive : contour et gris clair.
 * La barre disparaît sur l'écran du scanner (plein écran, comme en ligne).
 */
// Type de la barre d'onglets : Expo Router 56 embarque React Navigation en interne.
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icone } from '@/design/icones';
import { couleurs, dimension, ombre, police, tailleTexte } from '@/design/tokens';

// Les routes de l'app, dans l'ordre d'affichage, avec leur libellé et leur icône.
const ENTREES: Record<string, { libelle: string; icone: string }> = {
  index: { libelle: 'Accueil', icone: 'home' },
  recherche: { libelle: 'Recherche', icone: 'search' },
  guide: { libelle: 'Guide', icone: 'menu_book' },
  profil: { libelle: 'Profil', icone: 'account_circle' },
};

/** Le bouton central : rond foncé + anneau qui pulse (animation `pulse-vert`, 2 s). */
function BoutonScan({ onPress }: { onPress: () => void }) {
  const pulsation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const boucle = Animated.loop(
      Animated.timing(pulsation, { toValue: 1, duration: 2000, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    );
    boucle.start();
    return () => boucle.stop();
  }, [pulsation]);

  return (
    <View style={styles.scanZone}>
      {/* Anneau vert qui grandit de 10 px en s'effaçant */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.scanAnneau,
          {
            opacity: pulsation.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.4, 0, 0] }),
            transform: [{ scale: pulsation.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1.18, 1.18] }) }],
          },
        ]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Scanner un produit"
        onPress={onPress}
        style={({ pressed }) => [styles.scanBouton, pressed && { transform: [{ translateY: 4 }] }]}
      >
        <Icone nom="qr_code_scanner" taille={28} couleur={couleurs.marque} />
      </Pressable>
    </View>
  );
}

export function NavBasse({ state, navigation }: BottomTabBarProps) {
  const marges = useSafeAreaInsets();
  const routeActive = state.routes[state.index]?.name;

  // Le scanner est plein écran : pas de barre.
  if (routeActive === 'scan') return null;

  const aller = (nom: string) => {
    const route = state.routes.find((r) => r.name === nom);
    if (!route) return;
    const evenement = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (routeActive !== nom && !evenement.defaultPrevented) navigation.navigate(nom);
  };

  const item = (nom: string) => {
    const e = ENTREES[nom];
    const actif = routeActive === nom;
    const couleur = actif ? couleurs.texte : couleurs.texteDiscret;
    return (
      <Pressable
        key={nom}
        accessibilityRole="tab"
        accessibilityState={{ selected: actif }}
        onPress={() => aller(nom)}
        style={styles.item}
      >
        <Icone nom={e.icone} taille={24} couleur={couleur} contour={!actif} />
        <Text style={[styles.libelle, { color: couleur }]}>{e.libelle}</Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.barre, { height: dimension.hauteurNavigation + marges.bottom, paddingBottom: marges.bottom }]}>
      {item('index')}
      {item('recherche')}
      <BoutonScan onPress={() => aller('scan')} />
      {item('guide')}
      {item('profil')}
    </View>
  );
}

const styles = StyleSheet.create({
  barre: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: couleurs.fondCarte,
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
    overflow: 'visible',
    zIndex: 500,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  libelle: { fontFamily: police.gras, fontSize: tailleTexte.xs },
  scanZone: { width: dimension.cercleScan, height: dimension.cercleScan, marginTop: -30, alignItems: 'center', justifyContent: 'center' },
  scanAnneau: {
    position: 'absolute',
    width: dimension.cercleScan,
    height: dimension.cercleScan,
    borderRadius: dimension.cercleScan / 2,
    backgroundColor: couleurs.marque,
  },
  scanBouton: {
    width: dimension.cercleScan,
    height: dimension.cercleScan,
    borderRadius: dimension.cercleScan / 2,
    backgroundColor: couleurs.marqueSombre,
    borderWidth: 4,
    borderColor: couleurs.fondCarte,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
  },
});
