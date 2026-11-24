/**
 * SCANNER — design « D » choisi par Monsieur (provisoire, à retravailler) :
 *   - caméra plein écran, TOUT l'écran est une zone de scan (plus de zone sombre) ;
 *   - aucun cadre ni repère : l'image est lue partout ;
 *   - texte d'aide dans une pastille en bas de l'écran ;
 *   - bouton retour en haut à gauche, bouton lampe torche en haut à droite.
 * Mêmes fenêtres d'autorisation de la caméra qu'en ligne, mêmes messages, même suite
 * après un scan.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Stack, useIsFocused, useRouter } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Vibration, View } from 'react-native';
import { Text } from '@/components/ui/texte';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUi } from '@/components/ui/ui-provider';
import { Icone } from '@/design/icones';
import { couleurs, police, rayon, tailleTexte } from '@/design/tokens';
import { rechercherProduitParEAN } from '@/services/api';
import { ecrireProduitCache } from '@/services/cache';
import { creerConfirmateur, DELAI_SECOURS_MS } from '@/services/ean';

const CLE_PERMISSION = 'camera_permission';
const TEXTE_ATTENTE = 'Pointez la caméra vers un code-barre';
// Pendant le contrôle d'une lecture (voir services/ean.ts), la pastille le dit à l'utilisateur.
const TEXTE_VERIFICATION = 'Code détecté, vérification…';
const TEXTE_DIFFICILE = 'Lecture difficile, gardez le code immobile';
// Sans nouvelle lecture pendant ce délai, la pastille revient au message d'attente.
const RETOUR_ATTENTE_MS = 2500;

export default function ScanScreen() {
  const router = useRouter();
  const ui = useUi();
  const marges = useSafeAreaInsets();
  const enFocus = useIsFocused();
  const [permission, demanderPermission] = useCameraPermissions();

  const [camera, setCamera] = useState(false); // la caméra tourne-t-elle ?
  const [texte, setTexte] = useState(TEXTE_ATTENTE);
  const [lampe, setLampe] = useState(false); // lampe de poche allumée ?
  const [verification, setVerification] = useState(false); // contrôle d'une lecture en cours : pastille + indicateur
  const enTraitement = useRef(false);
  // Contrôle des lectures de la caméra : clé de l'EAN valide + même code lu deux fois d'affilée
  // (+ filet de sécurité si la caméra ne relit jamais le même code, voir services/ean.ts).
  const confirmateur = useRef(creerConfirmateur()).current;
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);
  const annulerMinuterie = () => {
    if (minuterie.current) clearTimeout(minuterie.current);
    minuterie.current = null;
  };
  // Retour automatique de la pastille au message d'attente, et lectures rejetées récemment (bruit de la caméra).
  const minuterieRetour = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rejets = useRef<number[]>([]);
  const annulerRetour = () => {
    if (minuterieRetour.current) clearTimeout(minuterieRetour.current);
    minuterieRetour.current = null;
  };
  const afficherVerification = (message: string) => {
    setTexte(message);
    setVerification(true);
    annulerRetour();
    minuterieRetour.current = setTimeout(() => {
      minuterieRetour.current = null;
      rejets.current = [];
      setTexte(TEXTE_ATTENTE);
      setVerification(false);
    }, RETOUR_ATTENTE_MS);
  };
  // Quitter l'écran : plus aucune acceptation ni message différé.
  useEffect(
    () => () => {
      annulerMinuterie();
      annulerRetour();
    },
    [],
  );

  // Fond noir : icônes de la barre d'état en clair tant que le scanner est affiché.
  useEffect(() => {
    if (!enFocus) return;
    setStatusBarStyle('light');
    return () => setStatusBarStyle('dark');
  }, [enFocus]);

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
    annulerMinuterie();
    annulerRetour();
    rejets.current = [];
    confirmateur.reinitialiser();
    setVerification(false);
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
  // La caméra appelle cette fonction à chaque lecture. Le code n'est accepté qu'après contrôle ;
  // en attendant, la caméra continue et l'utilisateur ne voit rien (une fraction de seconde).
  const surCodeLu = (resultat: BarcodeScanningResult) => {
    if (enTraitement.current) return;
    const code = resultat.data;

    const maintenant = Date.now();
    const verdict = confirmateur.lire(code, maintenant);

    if (verdict === 'confirme') {
      accepterCode(code);
      return;
    }

    if (verdict === 'en_attente') {
      // Un code valide est vu mais pas encore confirmé : on le dit à l'utilisateur.
      afficherVerification(confirmateur.incertain() ? TEXTE_DIFFICILE : TEXTE_VERIFICATION);
      // Filet de sécurité : si plus rien n'est lu pendant un court silence, ce code unique est accepté.
      annulerMinuterie();
      minuterie.current = setTimeout(() => {
        minuterie.current = null;
        const secours = confirmateur.secours(Date.now());
        if (secours) accepterCode(secours);
      }, DELAI_SECOURS_MS + 50);
      return;
    }

    // « rejete » : clé de contrôle fausse. Une lecture isolée est du bruit et reste invisible ;
    // si cela se répète (3 fois en 1,5 s), la lecture est difficile et on le dit.
    rejets.current = rejets.current.filter((t) => maintenant - t < 1500).concat(maintenant);
    if (rejets.current.length >= 3) afficherVerification(TEXTE_DIFFICILE);
  };

  // --- Un code est accepté : on cherche le produit ---
  const accepterCode = async (code: string) => {
    if (enTraitement.current) return;
    enTraitement.current = true;
    annulerMinuterie();
    annulerRetour();
    setVerification(false);

    setTexte('Code-barre détecté !');
    Vibration.vibrate(100);
    setCamera(false); // la caméra s'arrête pendant la recherche
    setLampe(false);
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
          confirmateur.reinitialiser();
          setTexte(TEXTE_ATTENTE);
          setCamera(true);
        },
        onAnnuler: () => router.replace({ pathname: '/(tabs)/recherche', params: { q: code } }),
      });
    }
  };

  return (
    <View style={styles.page}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* #reader : la caméra */}
      {camera && enFocus ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={lampe}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8'] }}
          onBarcodeScanned={surCodeLu}
        />
      ) : null}

      {/* Texte d'aide : pastille en bas de l'écran (il ne masque ainsi rien de l'image) */}
      <View pointerEvents="none" style={[styles.couche, { bottom: 40 + marges.bottom }]}>
        <View style={styles.pastille} accessibilityLiveRegion="polite">
          {verification ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
          <Text style={styles.texte}>{texte}</Text>
        </View>
      </View>

      {/* Lampe de poche : utile dans un magasin sombre */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={lampe ? 'Éteindre la lampe' : 'Allumer la lampe'}
        accessibilityState={{ selected: lampe }}
        onPress={() => setLampe((l) => !l)}
        style={[styles.retour, styles.lampe, { top: 16 + marges.top }, lampe && { backgroundColor: couleurs.marque }]}
      >
        <Icone nom={lampe ? 'lampe_torche' : 'lampe_torche_off'} taille={24} couleur={lampe ? couleurs.marqueSombre : '#FFFFFF'} />
      </Pressable>

      {/* .back-btn */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retour"
        onPress={retour}
        style={[styles.retour, { top: 16 + marges.top }]}
      >
        <Icone nom="arrow_back" taille={24} couleur="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#000000' },
  // Couche du texte d'aide, centrée en bas
  couche: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 10, paddingHorizontal: 16 },
  pastille: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  // .scan-text
  texte: {
    flexShrink: 1,
    fontFamily: police.semiGras,
    fontSize: tailleTexte.md,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  lampe: { left: undefined, right: 16 },
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
