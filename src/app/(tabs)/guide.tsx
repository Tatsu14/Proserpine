/**
 * GUIDE DE TRI — reproduit `pages/guide.html` : titre, sous-titre, puis six cartes
 * en deux colonnes (proportion 1 : 1,618, reflet diagonal, ombre).
 */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GUIDE, GUIDE_ORDER } from '@/constants/guide';
import { Icone } from '@/design/icones';
import { couleurs, ombre, police, rayon, tailleTexte } from '@/design/tokens';

const ECART = 16;

export default function GuideScreen() {
  const router = useRouter();
  const marges = useSafeAreaInsets();
  // Largeur réelle de la grille : sert à calculer la largeur exacte de chaque carte.
  const [largeur, setLargeur] = useState(0);
  // La mesure inclut les marges de 16 px de chaque côté : on les retire.
  const largeurCarte = largeur > 0 ? (largeur - 32 - ECART) / 2 : 0;

  return (
    <ScrollView style={styles.page} contentContainerStyle={{ paddingBottom: 16 }}>
      {/* .guide-header */}
      <View style={[styles.entete, { paddingTop: Math.max(16, marges.top) }]}>
        <Text style={styles.titre}>Guide de tri</Text>
        <Text style={styles.sousTitre}>Province de Liège</Text>
      </View>

      {/* .guide-grid */}
      <View style={styles.grille} onLayout={(e) => setLargeur(e.nativeEvent.layout.width)}>
        {largeurCarte > 0
          ? GUIDE_ORDER.map((cle) => {
              const cat = GUIDE[cle];
              return (
                <Pressable
                  key={cle}
                  accessibilityRole="button"
                  accessibilityLabel={cat.title}
                  onPress={() => router.push(`/guide/${cle}`)}
                  style={({ pressed }) => [
                    styles.carte,
                    { width: largeurCarte, height: largeurCarte * 1.618, backgroundColor: cat.color },
                    pressed && { transform: [{ scale: 0.97 }] },
                  ]}
                >
                  {/* Reflet diagonal blanc → transparent */}
                  <LinearGradient
                    pointerEvents="none"
                    colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={{ marginBottom: 16 }}>
                    <Icone nom={cat.icon} taille={48} couleur={cat.textColor} />
                  </View>
                  <Text style={[styles.carteTitre, { color: cat.textColor }]}>{cat.cardTitle}</Text>
                  <Text style={[styles.carteDesc, { color: cat.textColor }]}>{cat.cardDesc}</Text>
                </Pressable>
              );
            })
          : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fondCarte },
  entete: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: couleurs.fondCarte,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
    marginBottom: 16,
  },
  titre: { fontFamily: police.noir, fontSize: tailleTexte.xl3, color: couleurs.marqueSombre },
  sousTitre: { fontFamily: police.semiGras, fontSize: tailleTexte.md, color: couleurs.texteAttenue, marginTop: 4 },
  grille: { paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: ECART },
  carte: {
    borderRadius: rayon.lg,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    boxShadow: ombre.md,
  },
  carteTitre: { fontFamily: police.extraGras, fontSize: tailleTexte.lg, lineHeight: 19.2, textAlign: 'center', marginBottom: 8 },
  carteDesc: { fontFamily: police.semiGras, fontSize: tailleTexte.xs, textAlign: 'center', opacity: 0.9 },
});
