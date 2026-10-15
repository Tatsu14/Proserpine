/**
 * SCANNER — reproduit `pages/scan.html` + `js/pages/scan.js` :
 * caméra plein écran, bouton retour, cadre de visée (proportion 1,618) avec quatre
 * coins, laser vert qui monte et descend, texte d'aide. Mêmes fenêtres d'autorisation
 * de la caméra qu'en ligne, mêmes messages, même suite après un scan.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Stack, useIsFocused, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, Vibration, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUi } from '@/components/ui/ui-provider';
import { Icone } from '@/design/icones';
import { couleurs, police, rayon, tailleTexte } from '@/design/tokens';
import { rechercherProduitParEAN } from '@/services/api';
import { ecrireProduitCache } from '@/services/cache';

const CLE_PERMISSION = 'camera_permission';
const TEXTE_ATTENTE = 'Pointez la caméra vers un code-barre';
const RAPPORT = 1.618; // largeur / hauteur du cadre de visée

export default function ScanScreen() {
  const router = useRouter();
  const ui = useUi();
  const marges = useSafeAreaInsets();
  const enFocus = useIsFocused();
  const [permission, demanderPermission] = useCameraPermissions();

  const [camera, setCamera] = useState(false); // la caméra tourne-t-elle ?
  const [texte, setTexte] = useState(TEXTE_ATTENTE);
  const [zone, setZone] = useState({ largeur: 0, hauteur: 0 }); // taille de l'écran
  const [boite, setBoite] = useState({ x: 0, y: 0, largeur: 0, hauteur: 0 }); // cadre de visée
  const enTraitement = useRef(false);
  const laser = useRef(new Animated.Value(0)).current;

  const retour = useCallback(() => (router.canGoBack() ? router.back() : router.replace('/(tabs)')), [router]);

  // --- Laser : 4 s de haut en bas, puis de bas en haut, sans fin ---
  useEffect(() => {
    const boucle = Animated.loop(
      Animated.sequence([
        Animated.timing(laser, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(laser, { toValue: 0, duration: 4000, easing: Easing.linear, useNativeDriver: true }),
      ]),
    );
    boucle.start();
    return () => boucle.stop();
  }, [laser]);

  // --- Autorisations de la caméra (mêmes fenêtres et mêmes textes qu'en ligne) ---
  const demander = useCallback(async () => {
    const r = await demanderPermission();
    if (r.granted) {
      await AsyncStorage.setItem(CLE_PERMISSION, 'granted');
      setCamera(true);
    } else {
      await AsyncStorage.setItem(CLE_PERMISSION, 'denied');
      ui.informer({
        titre: "Erreur d'accès",
        message: 'Impossible d\'accéder à la caméra. Veuillez vérifier vos paramètres système.',
        bouton: 'Compris',
        onFermer: retour,
      });
    }
  }, [demanderPermission, ui, retour]);

  useEffect(() => {
    if (!enFocus || !permission) return;
    // On repart d'un état propre à chaque arrivée sur l'écran.
    enTraitement.current = false;
    setTexte(TEXTE_ATTENTE);

    // Déjà autorisée par le système : on démarre directement.
    if (permission.granted) {
      setCamera(true);
      return;
    }
    setCamera(false);

    let annule = false;
    (async () => {
      const memo = await AsyncStorage.getItem(CLE_PERMISSION);
      if (annule) return;
      if (memo === 'denied') {
        ui.confirmer({
          titre: 'Caméra non autorisée',
          message: "Vous avez refusé l'accès à la caméra. Sans cet accès, le scan est impossible.",
          confirmer: 'Autoriser',
          annuler: 'Refuser à nouveau',
          onConfirmer: demander,
          onAnnuler: retour,
        });
      } else {
        ui.confirmer({
          titre: 'Accès à la caméra',
          message: "Proserpine a besoin d'accéder à votre caméra pour scanner les codes-barres des produits.",
          confirmer: 'Autoriser',
          annuler: 'Refuser',
          onConfirmer: demander,
          onAnnuler: async () => {
            await AsyncStorage.setItem(CLE_PERMISSION, 'denied');
            ui.informer({
              titre: 'Fonctionnalités limitées',
              message:
                'Sans accès à la caméra, la majorité des fonctionnalités de Proserpine seront inaccessibles, notamment le scan de produits.',
              bouton: 'Compris',
              onFermer: retour,
            });
          },
        });
      }
    })();
    return () => {
      annule = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enFocus, permission?.granted, permission === null]);

  // --- Un code-barres est lu ---
  const surCodeLu = async (resultat: BarcodeScanningResult) => {
    if (enTraitement.current) return;
    enTraitement.current = true;
    const code = resultat.data;

    setTexte('Code-barre détecté !');
    Vibration.vibrate(100);
    setCamera(false); // la caméra s'arrête pendant la recherche
    ui.chargement('Recherche du produit...');

    const produit = await rechercherProduitParEAN(code);
    ui.chargement(null);

    if (produit) {
      // Mis en mémoire : la fiche s'ouvre instantanément (équivalent du sessionStorage en ligne).
      ecrireProduitCache(code, produit);
      router.replace(`/produit/${code}`);
    } else {
      ui.confirmer({
        titre: 'Produit non trouvé',
        message: "Ce produit n'est pas encore référencé dans notre base de données.",
        confirmer: 'Scanner à nouveau',
        annuler: 'Rechercher manuellement',
        onConfirmer: () => {
          enTraitement.current = false;
          setTexte(TEXTE_ATTENTE);
          setCamera(true);
        },
        onAnnuler: () => router.replace({ pathname: '/(tabs)/recherche', params: { q: code } }),
      });
    }
  };

  // --- Dimensions : le cadre fait 82 % de la largeur, entre 240 et 320 px ---
  const largeurCadre = Math.min(320, Math.max(240, zone.largeur * 0.82));
  const hauteurCadre = largeurCadre / RAPPORT;
  const surZone = (e: LayoutChangeEvent) => setZone({ largeur: e.nativeEvent.layout.width, hauteur: e.nativeEvent.layout.height });
  const surBoite = (e: LayoutChangeEvent) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    setBoite({ x, y, largeur: width, hauteur: height });
  };

  return (
    <View style={styles.page} onLayout={surZone}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* #reader : la caméra */}
      {camera && enFocus ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8'] }}
          onBarcodeScanned={surCodeLu}
        />
      ) : null}

      {/* Voile sombre autour du cadre de visée (l'équivalent de `outline: 9999px`) */}
      {boite.largeur > 0 ? (
        <>
          <View pointerEvents="none" style={[styles.voile, { top: 0, left: 0, right: 0, height: boite.y }]} />
          <View pointerEvents="none" style={[styles.voile, { top: boite.y + boite.hauteur, left: 0, right: 0, bottom: 0 }]} />
          <View pointerEvents="none" style={[styles.voile, { top: boite.y, left: 0, width: boite.x, height: boite.hauteur }]} />
          <View pointerEvents="none" style={[styles.voile, { top: boite.y, left: boite.x + boite.largeur, right: 0, height: boite.hauteur }]} />
        </>
      ) : null}

      {/* .scan-ui-layer : cadre de visée + texte, centrés */}
      <View pointerEvents="none" style={styles.couche}>
        <View onLayout={surBoite} style={[styles.cadre, { width: largeurCadre, height: hauteurCadre }]}>
          <View style={[styles.coin, styles.coinHG]} />
          <View style={[styles.coin, styles.coinHD]} />
          <View style={[styles.coin, styles.coinBG]} />
          <View style={[styles.coin, styles.coinBD]} />
          <Animated.View
            style={[
              styles.laser,
              { transform: [{ translateY: laser.interpolate({ inputRange: [0, 1], outputRange: [0, hauteurCadre - 2] }) }] },
            ]}
          />
        </View>
        <Text style={styles.texte}>{texte}</Text>
      </View>

      {/* .back-btn */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retour"
        onPress={retour}
        style={[styles.retour, { top: Math.max(16, marges.top) }]}
      >
        <Icone nom="arrow_back" taille={24} couleur="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#000000' },
  voile: { position: 'absolute', backgroundColor: couleurs.voileMoyen },
  couche: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  // .targeting-box : bordure blanche + halo lumineux
  cadre: {
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: rayon.sm,
    overflow: 'hidden',
    boxShadow: '0 0 8px 2px rgba(255,255,255,0.8), 0 0 20px 6px rgba(255,255,255,0.4), 0 0 40px 12px rgba(255,255,255,0.15)',
  } as any,
  // .corner : angles de 30 px, trait de 4 px
  coin: { position: 'absolute', width: 30, height: 30, borderColor: '#FFFFFF', zIndex: 5 },
  coinHG: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: rayon.sm },
  coinHD: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: rayon.sm },
  coinBG: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: rayon.sm },
  coinBD: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: rayon.sm },
  // .laser
  laser: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: 2,
    backgroundColor: couleurs.marque,
    boxShadow: `0 0 10px ${couleurs.marque}`,
    zIndex: 2,
  } as any,
  // .scan-text
  texte: {
    marginTop: 32,
    fontFamily: police.semiGras,
    fontSize: tailleTexte.md,
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  // .back-btn
  retour: {
    position: 'absolute',
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: rayon.md,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
});
