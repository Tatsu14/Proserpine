/**
 * SCANNER — reproduit `pages/scan.html` + `js/pages/scan.js` de la version en ligne,
 * tel qu'il s'affiche RÉELLEMENT (mesuré sur un téléphone, pas déduit du CSS) :
 *   - caméra plein écran ;
 *   - carré de visée de 300 px, centré, entouré d'une zone ombrée à 48 % ;
 *   - quatre coins blancs (traits de 5 px, bras de 40 px) posés juste hors du carré ;
 *   - pas de laser, pas de halo : ils existent dans l'ancien CSS mais plus dans la page ;
 *   - le texte d'aide au centre de l'écran ;
 *   - bouton retour en haut à gauche.
 * Mêmes fenêtres d'autorisation de la caméra qu'en ligne, mêmes messages, même suite
 * après un scan.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Stack, useIsFocused, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Vibration, View, type LayoutChangeEvent } from 'react-native';
import { Text } from '@/components/ui/texte';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUi } from '@/components/ui/ui-provider';
import { Icone } from '@/design/icones';
import { couleurs, police, rayon, tailleTexte } from '@/design/tokens';
import { rechercherProduitParEAN } from '@/services/api';
import { ecrireProduitCache } from '@/services/cache';

const CLE_PERMISSION = 'camera_permission';
const TEXTE_ATTENTE = 'Pointez la caméra vers un code-barre';

// Mesures relevées sur la version en ligne (en pixels CSS).
const COTE_VISEE = 300; // carré de visée
const EPAISSEUR_COIN = 5; // épaisseur des coins blancs
const BRAS_COIN = 40; // longueur des bras des coins
const OMBRE = 'rgba(0, 0, 0, 0.48)'; // zone ombrée autour du carré

export default function ScanScreen() {
  const router = useRouter();
  const ui = useUi();
  const marges = useSafeAreaInsets();
  const enFocus = useIsFocused();
  const [permission, demanderPermission] = useCameraPermissions();

  const [camera, setCamera] = useState(false); // la caméra tourne-t-elle ?
  const [texte, setTexte] = useState(TEXTE_ATTENTE);
  const [zone, setZone] = useState({ largeur: 0, hauteur: 0 }); // taille de l'écran
  const enTraitement = useRef(false);

  const retour = useCallback(() => (router.canGoBack() ? router.back() : router.replace('/(tabs)')), [router]);

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
        message: "Impossible d'accéder à la caméra. Veuillez vérifier vos paramètres système.",
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

  // --- Position du carré de visée : 300 px, centré (réduit si l'écran est plus étroit) ---
  const surZone = (e: LayoutChangeEvent) => setZone({ largeur: e.nativeEvent.layout.width, hauteur: e.nativeEvent.layout.height });
  const cote = Math.min(COTE_VISEE, Math.max(0, zone.largeur - 24));
  const gauche = (zone.largeur - cote) / 2;
  const haut = (zone.hauteur - cote) / 2;
  const prete = zone.largeur > 0 && zone.hauteur > 0;
  const e = EPAISSEUR_COIN;
  const b = BRAS_COIN;

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

      {prete ? (
        <>
          {/* Zone ombrée autour du carré (#qr-shaded-region) */}
          <View pointerEvents="none" style={[styles.ombre, { top: 0, left: 0, right: 0, height: haut }]} />
          <View pointerEvents="none" style={[styles.ombre, { top: haut + cote, left: 0, right: 0, bottom: 0 }]} />
          <View pointerEvents="none" style={[styles.ombre, { top: haut, left: 0, width: gauche, height: cote }]} />
          <View pointerEvents="none" style={[styles.ombre, { top: haut, left: gauche + cote, right: 0, height: cote }]} />

          {/* Quatre coins blancs : le « L » est posé juste hors du carré */}
          {/* haut-gauche */}
          <View pointerEvents="none" style={[styles.coin, { left: gauche, top: haut - e, width: b, height: e }]} />
          <View pointerEvents="none" style={[styles.coin, { left: gauche - e, top: haut - e, width: e, height: b + e }]} />
          {/* haut-droite */}
          <View pointerEvents="none" style={[styles.coin, { left: gauche + cote - b, top: haut - e, width: b, height: e }]} />
          <View pointerEvents="none" style={[styles.coin, { left: gauche + cote, top: haut - e, width: e, height: b + e }]} />
          {/* bas-gauche */}
          <View pointerEvents="none" style={[styles.coin, { left: gauche, top: haut + cote, width: b, height: e }]} />
          <View pointerEvents="none" style={[styles.coin, { left: gauche - e, top: haut + cote - b, width: e, height: b + e }]} />
          {/* bas-droite */}
          <View pointerEvents="none" style={[styles.coin, { left: gauche + cote - b, top: haut + cote, width: b, height: e }]} />
          <View pointerEvents="none" style={[styles.coin, { left: gauche + cote, top: haut + cote - b, width: e, height: b + e }]} />
        </>
      ) : null}

      {/* .scan-ui-layer : le texte d'aide, au centre de l'écran */}
      <View pointerEvents="none" style={styles.couche}>
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
  ombre: { position: 'absolute', backgroundColor: OMBRE },
  coin: { position: 'absolute', backgroundColor: '#FFFFFF', zIndex: 5 },
  // .scan-ui-layer : texte centré sur tout l'écran
  couche: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  // .scan-text
  texte: {
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
