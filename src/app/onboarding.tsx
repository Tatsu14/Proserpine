/**
 * ONBOARDING — reproduit `pages/onboarding.html` + `js/pages/onboarding.js` :
 * écran de bienvenue sombre, affiché une seule fois après la création d'un compte.
 * « Commencer » marque l'onboarding comme vu puis ouvre l'accueil.
 */
import { Image } from 'expo-image';
import { Redirect, Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/texte';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BoutonPrimaire } from '@/components/ui/boutons';
import { EcranSplash } from '@/components/ui/ecran-splash';
import { useAuth } from '@/contexts/auth';
import { couleurs, police, rayon, tailleTexte } from '@/design/tokens';
import { marquerOnboardingVu, onboardingDejaVu } from '@/services/auth';

const logo = require('../../assets/images/logo.png');

// Halo vert en haut de l'écran : dégradé radial. Web : `backgroundImage` ; natif : `experimental_backgroundImage`.
const HALO = 'radial-gradient(circle, rgba(0, 204, 102, 0.12) 0%, rgba(0, 204, 102, 0) 68%)';
const styleHalo: any = Platform.OS === 'web' ? { backgroundImage: HALO } : { experimental_backgroundImage: HALO };

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, initializing } = useAuth();
  const marges = useSafeAreaInsets();
  // null = on vérifie encore si l'onboarding a déjà été vu.
  const [dejaVu, setDejaVu] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    let actif = true;
    onboardingDejaVu(user.uid).then((v) => actif && setDejaVu(v));
    return () => {
      actif = false;
    };
  }, [user]);

  if (initializing) return <EcranSplash />;
  if (!user) return <Redirect href="/(auth)/login" />;
  // Sécurité : déjà vu → on renvoie sur l'accueil.
  if (dejaVu === true) return <Redirect href="/(tabs)" />;
  if (dejaVu === null) return <EcranSplash />;

  const commencer = async () => {
    await marquerOnboardingVu(user.uid);
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.page}>
      <Stack.Screen options={{ headerShown: false }} />
      <View pointerEvents="none" style={[styles.halo, styleHalo]} />
      <ScrollView
        contentContainerStyle={[
          styles.contenuEcran,
          { paddingTop: Math.max(32, 16 + marges.top), paddingBottom: Math.max(26, marges.bottom) },
        ]}
      >
        {/* Identité de marque */}
        <Image source={logo} style={styles.logo} contentFit="cover" />

        {/* Textes */}
        <View style={styles.contenu}>
          <Text style={styles.titre}>Bienvenue sur Proserpine</Text>
          <Text style={styles.sousTitre}>
            L'application qui vous accompagne au quotidien pour évaluer vos produits et vous aider à trier sans hésiter.
          </Text>
          <Text style={styles.corps}>
            Pour chaque produit, vous découvrez son impact sur l'environnement et la bonne façon de le trier. Parce que
            comprendre ce qu'on achète et ce qu'on jette, c'est déjà se donner le pouvoir d'agir.
          </Text>
          <View style={styles.separateur} />
          <Text style={styles.contexte}>
            Gratuite, sans publicités, pédagogique et bienveillante, elle est adaptée aux règles de tri de la Province de
            Liège — et bientôt aux consignes de chaque commune.
          </Text>
        </View>

        {/* Slogan */}
        <Text style={styles.slogan}>Un scan.{' '}Un geste.{' '}Un impact.</Text>

        {/* CTA */}
        <BoutonPrimaire style={styles.bouton} onPress={commencer}>
          <Text style={styles.boutonTexte}>Commencer</Text>
        </BoutonPrimaire>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.marqueSombre, overflow: 'hidden' },
  // Cercle de 352 px dont le centre est 96 px au-dessus du haut (top: -6rem)
  halo: { position: 'absolute', top: -96, left: '50%', marginLeft: -176, width: 352, height: 352 },
  contenuEcran: { flexGrow: 1, paddingHorizontal: 26 },
  logo: { width: 56, height: 56, borderRadius: 28 },
  contenu: { flex: 1, justifyContent: 'center', gap: 26, paddingVertical: 26 },
  titre: { fontFamily: police.extraGras, fontSize: tailleTexte.xl4, lineHeight: 29.9, color: couleurs.texteSurSombre, marginBottom: 8 },
  sousTitre: { fontFamily: police.semiGras, fontSize: tailleTexte.lg, lineHeight: 23.2, color: couleurs.marque },
  corps: { fontFamily: police.normal, fontSize: tailleTexte.md, lineHeight: 23.1, color: couleurs.texteSurSombreFaible },
  separateur: { width: 40, height: 2, borderRadius: 1, backgroundColor: couleurs.marqueClaire },
  contexte: { fontFamily: police.normal, fontSize: tailleTexte.sm, lineHeight: 19.8, color: couleurs.texteSurSombreAttenue },
  slogan: { fontFamily: police.semiGras, fontSize: tailleTexte.md, color: couleurs.texteSurSombreAttenue, letterSpacing: 0.7, paddingBottom: 16 },
  // .onboarding-cta .btn-primary
  bouton: { paddingVertical: 9.9, borderRadius: rayon.phi, marginBottom: 8 },
  boutonTexte: { fontFamily: police.gras, fontSize: tailleTexte.lg, color: '#EEEEEE', letterSpacing: 0.32 },
});
