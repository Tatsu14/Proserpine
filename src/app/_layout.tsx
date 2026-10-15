import {
  Outfit_400Regular,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
  Outfit_900Black,
} from '@expo-google-fonts/outfit';
import { JetBrainsMono_400Regular, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider } from '@/contexts/auth';

// On garde l'écran de démarrage tant que les polices ne sont pas chargées,
// pour ne jamais montrer un texte dans une police de secours (même visuel que le site).
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Mêmes polices que ProserpineV2 : Outfit (texte) et JetBrains Mono (chiffres).
  const [policesChargees, erreurPolices] = useFonts({
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    Outfit_900Black,
    JetBrainsMono_400Regular,
    JetBrainsMono_700Bold,
  });

  // En cas d'échec de chargement on affiche quand même l'app (police système) plutôt que de la bloquer.
  const pret = policesChargees || erreurPolices;

  useEffect(() => {
    if (pret) SplashScreen.hideAsync();
  }, [pret]);

  if (!pret) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <StatusBar style="dark" />
        {/* Les routes sont auto-découvertes : index (dispatcher), (auth), (tabs),
            produit/[ean], guide/[type]. En-têtes gérés écran par écran. */}
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
