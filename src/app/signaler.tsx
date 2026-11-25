/**
 * SIGNALER UNE ERREUR — premier écran (option A validée le 25/11/2026) : l'utilisateur choisit ce qui ne va pas,
 * la consigne de tri ou les informations du produit, puis arrive sur le formulaire correspondant.
 * Ouvert depuis le lien « Une erreur ? Signaler » de la fiche produit.
 */
import { Stack, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { RappelProduit, stylesSignalement, useProduitSignale } from '@/components/signalement/commun';
import { EnteteEcran } from '@/components/ui/menu';
import { Text } from '@/components/ui/texte';
import { Icone } from '@/design/icones';
import { couleurs, police, rayon, tailleTexte } from '@/design/tokens';

const CHOIX = [
  {
    id: 'consigne',
    icone: 'recycling',
    titre: 'La consigne de tri',
    texte: 'Un élément n’est pas dans le bon bac, ou il en manque un',
    chemin: '/signaler-consigne',
  },
  {
    id: 'produit',
    icone: 'inventory_2',
    titre: 'Les informations du produit',
    texte: 'Nom, marque, quantité, ou ce n’est pas ce produit',
    chemin: '/signaler-produit',
  },
] as const;

export default function SignalerScreen() {
  const router = useRouter();
  const produit = useProduitSignale();

  return (
    <View style={stylesSignalement.page}>
      <Stack.Screen options={{ headerShown: false }} />
      <EnteteEcran titre="Signaler une erreur" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={stylesSignalement.contenu}>
        <RappelProduit produit={produit} />
        <Text style={stylesSignalement.etiquette}>{'QU’EST-CE QUI NE VA PAS ?'}</Text>
        {CHOIX.map((c) => (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            accessibilityLabel={`${c.titre}. ${c.texte}`}
            onPress={() => router.push({ pathname: c.chemin, params: produit.params })}
            style={({ pressed }) => [styles.choix, pressed && { opacity: 0.7 }]}
          >
            <View style={styles.icone}>
              <Icone nom={c.icone} taille={24} couleur={couleurs.marqueFoncee} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.titre}>{c.titre}</Text>
              <Text style={styles.texte}>{c.texte}</Text>
            </View>
            <Icone nom="chevron_right" taille={24} couleur={couleurs.texteDiscret} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  choix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: couleurs.bordure,
    borderRadius: rayon.lg,
    minHeight: 76,
  },
  icone: {
    width: 44,
    height: 44,
    borderRadius: rayon.md,
    backgroundColor: couleurs.marqueClaire,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titre: { fontFamily: police.extraGras, fontSize: tailleTexte.lg, color: couleurs.texte },
  texte: { fontFamily: police.normal, fontSize: tailleTexte.sm, color: couleurs.texteAttenue, marginTop: 2 },
});
