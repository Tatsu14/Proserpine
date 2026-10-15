import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const router = useRouter();
  // Verrou pour éviter qu'un même code déclenche plusieurs navigations.
  const verrou = useRef(false);

  useFocusEffect(
    useCallback(() => {
      // Réarmer le scanner à chaque fois qu'on revient sur l'écran.
      verrou.current = false;
      return () => {};
    }, []),
  );

  function onScan(result: BarcodeScanningResult) {
    if (verrou.current) return;
    const code = result.data?.trim();
    if (!code) return;
    verrou.current = true;
    router.push(`/produit/${encodeURIComponent(code)}`);
  }

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.info}>Initialisation de la caméra…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    const peutDemander = permission.canAskAgain;
    return (
      <SafeAreaView style={styles.center}>
        <Ionicons name="camera-outline" size={56} color={Colors.textLight} />
        <Text style={styles.info}>
          {peutDemander
            ? 'Proserpine a besoin d’accéder à la caméra pour scanner les codes-barres.'
            : 'L’accès à la caméra a été refusé. Activez-le dans les réglages pour scanner des produits.'}
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => (peutDemander ? requestPermission() : Linking.openSettings())}
        >
          <Text style={styles.buttonText}>
            {peutDemander ? 'Autoriser la caméra' : 'Ouvrir les réglages'}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.flex}>
      <CameraView
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={onScan}
      />
      <SafeAreaView style={styles.overlay} pointerEvents="none">
        <View style={styles.frame} />
        <Text style={styles.hint}>Visez le code-barres du produit</Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 16,
    backgroundColor: Colors.bgApp,
  },
  info: { fontSize: 15, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },
  button: { backgroundColor: Colors.brandPrimary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24 },
  buttonText: { color: Colors.textOnDark, fontWeight: '700', fontSize: 15 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: 260,
    height: 170,
    borderWidth: 3,
    borderColor: Colors.textOnDark,
    borderRadius: 18,
    backgroundColor: 'transparent',
  },
  hint: {
    marginTop: 20,
    color: Colors.textOnDark,
    fontSize: 15,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    overflow: 'hidden',
  },
});
