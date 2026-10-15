/**
 * DÉTAIL D'UN BAC DU GUIDE — reproduit `pages/guide-detail.html` + `guide-detail.js` :
 * bandeau de la couleur du bac (icône, titre), puis une feuille blanche arrondie avec
 * la description, les listes « Accepté » / « Interdit », les points d'attention et le
 * conseil Intradel. Écran plein, sans barre de navigation.
 */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TexteRiche } from '@/components/ui/texte-riche';
import { GUIDE } from '@/constants/guide';
import { Icone } from '@/design/icones';
import { couleurs, police, rayon, tailleTexte } from '@/design/tokens';

/** Une ligne de liste (`.list-item-guide`) : icône à gauche, texte à droite. */
function Ligne({ icone, couleur, texte, gras }: { icone: string; couleur: string; texte: string; gras?: boolean }) {
  return (
    <View style={styles.ligne}>
      <Icone nom={icone} taille={20} couleur={couleur} />
      <TexteRiche
        texte={texte}
        style={[styles.ligneTexte, gras && { fontFamily: police.gras, color: couleurs.statutDanger }]}
      />
    </View>
  );
}

export default function GuideDetailScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const router = useRouter();
  const marges = useSafeAreaInsets();
  const cat = type ? GUIDE[type] : undefined;
  const retour = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/guide'));

  // Catégorie inconnue : même comportement que la version en ligne.
  if (!cat) {
    return (
      <View style={[styles.entete, { backgroundColor: couleurs.fondApp }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={[styles.titre, { color: couleurs.texte }]}>Catégorie inconnue</Text>
      </View>
    );
  }

  // Le bouton retour est blanc translucide ; sur fond clair (papier) il devient sombre.
  const surClair = cat.textColor !== '#FFFFFF';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: cat.color }} contentContainerStyle={{ flexGrow: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* .detail-header */}
      <View style={[styles.entete, { backgroundColor: cat.color, paddingTop: 24 + marges.top }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retour au guide"
          onPress={retour}
          style={[styles.retour, { top: Math.max(16, marges.top), backgroundColor: surClair ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)' }]}
        >
          <Icone nom="arrow_back" taille={24} couleur={cat.textColor} />
        </Pressable>
        <View style={{ marginTop: 16, marginBottom: 8 }}>
          <Icone nom={cat.icon} taille={64} couleur={cat.textColor} />
        </View>
        <Text style={[styles.titre, { color: cat.textColor }]}>{cat.title}</Text>
      </View>

      {/* .detail-content : feuille blanche qui remonte de 24 px */}
      <View style={styles.contenu}>
        <Text style={styles.description}>{cat.desc}</Text>

        <View style={[styles.liste, styles.accepte]}>
          <View style={styles.listeTitre}>
            <Icone nom="check_circle" taille={24} couleur={couleurs.statutBon} />
            <Text style={[styles.listeTitreTexte, { color: couleurs.statutBon }]}>Accepté</Text>
          </View>
          <View style={styles.elements}>
            {cat.accepted.map((t, i) => (
              <Ligne key={i} icone="check" couleur={couleurs.statutBon} texte={t} />
            ))}
          </View>
        </View>

        <View style={[styles.liste, styles.refuse]}>
          <View style={styles.listeTitre}>
            <Icone nom="cancel" taille={24} couleur={couleurs.statutDanger} />
            <Text style={[styles.listeTitreTexte, { color: couleurs.statutDanger }]}>Interdit</Text>
          </View>
          <View style={styles.elements}>
            {cat.refused.map((t, i) => (
              <Ligne key={i} icone="close" couleur={couleurs.statutDanger} texte={t} gras />
            ))}
          </View>
        </View>

        {cat.warnings ? (
          <View style={[styles.liste, styles.attention]}>
            <View style={styles.listeTitre}>
              <Icone nom="warning" taille={24} couleur={couleurs.statutAttention} />
              <Text style={[styles.listeTitreTexte, { color: couleurs.statutAttention }]}>Points d'attention</Text>
            </View>
            <View style={styles.elements}>
              {cat.warnings.map((t, i) => (
                <Ligne key={i} icone="warning" couleur={couleurs.statutAttention} texte={t} />
              ))}
            </View>
          </View>
        ) : null}

        {cat.tip ? (
          <View style={styles.conseil}>
            <Icone nom="lightbulb" taille={24} couleur={couleurs.statutAttention} />
            <View style={{ flex: 1 }}>
              <Text style={styles.conseilTitre}>Conseil Intradel (Liège)</Text>
              <Text style={styles.conseilTexte}>{cat.tip}</Text>
            </View>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  entete: { paddingHorizontal: 16, paddingBottom: 40, alignItems: 'center', justifyContent: 'center' },
  retour: { position: 'absolute', left: 16, width: 40, height: 40, borderRadius: rayon.sm, alignItems: 'center', justifyContent: 'center', zIndex: 5 },
  titre: { fontFamily: police.noir, fontSize: tailleTexte.xl2, lineHeight: 24, textAlign: 'center' },
  contenu: {
    flex: 1,
    backgroundColor: couleurs.fondCarte,
    borderTopLeftRadius: rayon.xl2,
    borderTopRightRadius: rayon.xl2,
    marginTop: -24,
    paddingTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 96,
  },
  description: { fontFamily: police.normal, fontSize: tailleTexte.md, lineHeight: 22.4, color: couleurs.texteAttenue, textAlign: 'center', marginBottom: 24 },
  liste: { borderRadius: rayon.md, padding: 16, marginBottom: 24, borderWidth: 1 },
  accepte: { backgroundColor: couleurs.statutBonFond, borderColor: 'rgba(39, 174, 96, 0.2)' },
  refuse: { backgroundColor: 'rgba(231, 76, 60, 0.05)', borderColor: 'rgba(231, 76, 60, 0.2)' },
  attention: { backgroundColor: couleurs.statutAttentionFond, borderColor: 'rgba(255, 152, 0, 0.3)' },
  listeTitre: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  listeTitreTexte: { fontFamily: police.extraGras, fontSize: tailleTexte.lg },
  elements: { gap: 12 },
  ligne: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  ligneTexte: { flex: 1, fontFamily: police.normal, fontSize: tailleTexte.sm, lineHeight: 16.8, color: couleurs.texte },
  // .local-tip
  conseil: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: couleurs.statutAttentionFond,
    borderLeftWidth: 4,
    borderLeftColor: couleurs.statutAttention,
    padding: 16,
    borderTopRightRadius: rayon.md,
    borderBottomRightRadius: rayon.md,
  },
  conseilTitre: { fontFamily: police.extraGras, fontSize: tailleTexte.sm, color: couleurs.texte, marginBottom: 2 },
  conseilTexte: { fontFamily: police.normal, fontSize: tailleTexte.sm, color: couleurs.texte, lineHeight: 18 },
});
