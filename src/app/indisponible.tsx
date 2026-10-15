/**
 * FONCTIONNALITÉ INDISPONIBLE — reproduit `pages/indisponible.html` : icône, titre,
 * message, bouton « Retour ». Atteint depuis « Modifier mes informations » et « Paramètres ».
 */
import { Stack, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/texte';

import { BoutonPrimaire } from '@/components/ui/boutons';
import { Icone } from '@/design/icones';
import { couleurs, police, tailleTexte } from '@/design/tokens';

export default function IndisponibleScreen() {
  const router = useRouter();
  return (
    <View style={styles.page}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* .unavailable-container */}
      <View style={styles.centre}>
        <View style={{ marginBottom: 16 }}>
          <Icone nom="engineering" taille={24} couleur={couleurs.marque} />
        </View>
        <Text style={styles.titre}>Fonctionnalité en cours de développement</Text>
        <Text style={styles.texte}>Cette fonctionnalité sera disponible prochainement. Merci de votre patience.</Text>
        <BoutonPrimaire
          style={styles.bouton}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
        >
          Retour
        </BoutonPrimaire>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fondCarte },
  // En ligne, le contenu reste en haut de l'écran (la hauteur de .unavailable-container n'est pas fixée).
  centre: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', padding: 24 },
  // .text-h2 (16 px, 800) · .text-body (13 px, atténué)
  titre: { fontFamily: police.extraGras, fontSize: tailleTexte.lg, color: couleurs.texte, textAlign: 'center', marginBottom: 8 },
  texte: { fontFamily: police.normal, fontSize: tailleTexte.base, lineHeight: 19.5, color: couleurs.texteAttenue, textAlign: 'center', marginBottom: 24 },
  bouton: { maxWidth: 200, alignSelf: 'center', width: '100%' },
});
