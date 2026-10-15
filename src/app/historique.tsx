/**
 * HISTORIQUE COMPLET — reproduit `pages/historique.html` + `js/pages/historique.js` :
 * barre du haut (retour + « Historique complet »), puis jusqu'à 100 produits scannés,
 * le plus récent d'abord, avec leur date. Écran plein, sans barre de navigation.
 */
import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/texte';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth';
import { Icone } from '@/design/icones';
import { couleurs, police, rayon, tailleTexte } from '@/design/tokens';
import { formaterNomListe } from '@/services/affichage-produit';
import { chargerHistorique, type HistoriqueItem } from '@/services/historique';

// Date en toutes lettres, comme en ligne : « 15 octobre 2026 ».
function dateEnLettres(item: HistoriqueItem): string {
  const d = item.date?.toDate?.();
  if (!d) return '';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function Squelette() {
  const opacite = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const boucle = Animated.loop(
      Animated.sequence([
        Animated.timing(opacite, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(opacite, { toValue: 0.5, duration: 750, useNativeDriver: true }),
      ]),
    );
    boucle.start();
    return () => boucle.stop();
  }, [opacite]);
  return <Animated.View style={[styles.squelette, { opacity: opacite }]} />;
}

export default function HistoriqueScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const marges = useSafeAreaInsets();
  const [items, setItems] = useState<HistoriqueItem[] | null>(null);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    if (!user) return;
    let actif = true;
    chargerHistorique(user.uid, 100)
      .then((h) => actif && setItems(h))
      .catch(() => actif && setErreur(true));
    return () => {
      actif = false;
    };
  }, [user]);

  return (
    <View style={styles.page}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* .history-header */}
      <View style={[styles.entete, { paddingTop: Math.max(16, marges.top) }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retour"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profil'))}
          style={styles.retour}
        >
          <Icone nom="arrow_back" taille={24} couleur={couleurs.texte} />
        </Pressable>
        <Text style={styles.titre}>Historique complet</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={styles.liste}>
        {erreur ? (
          <Text style={styles.erreur}>Erreur lors du chargement de l'historique.</Text>
        ) : items === null ? (
          <>
            <Squelette />
            <Squelette />
            <Squelette />
            <Squelette />
          </>
        ) : items.length === 0 ? (
          <View style={styles.vide}>
            <Icone nom="history" taille={24} couleur={couleurs.texteDiscret} />
            <Text style={styles.videTexte}>Votre historique est vide.</Text>
          </View>
        ) : (
          items.map((h) => (
            <Pressable
              key={h.ean}
              accessibilityRole="button"
              onPress={() => router.push(`/produit/${encodeURIComponent(h.ean)}`)}
              style={({ pressed }) => [styles.ligne, pressed && { backgroundColor: couleurs.fondGris }]}
            >
              <View style={styles.ligneIcone}>
                <Icone nom="package_2" taille={24} couleur={couleurs.texteAttenue} />
              </View>
              <View style={styles.ligneInfo}>
                <Text style={styles.ligneNom} numberOfLines={1}>
                  {formaterNomListe(h.nom, h.marque) || 'Produit inconnu'}
                </Text>
                <Text style={styles.ligneDate} numberOfLines={1}>
                  {dateEnLettres(h)}
                </Text>
              </View>
              <Icone nom="chevron_right" taille={24} couleur={couleurs.texteDiscret} />
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fondCarte },
  entete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: couleurs.fondCarte,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
    zIndex: 100,
  },
  // .btn-back-history
  retour: { width: 40, height: 40, borderRadius: rayon.sm, backgroundColor: couleurs.fondApp, alignItems: 'center', justifyContent: 'center' },
  // .header-title
  titre: { fontFamily: police.noir, fontSize: tailleTexte.xl2, lineHeight: 24, color: couleurs.texte },
  // .history-list-container + .history-item
  liste: { padding: 16 },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: couleurs.fondCarte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon.md,
    padding: 12,
  },
  ligneIcone: { width: 40, height: 40, borderRadius: rayon.sm, backgroundColor: couleurs.fondApp, alignItems: 'center', justifyContent: 'center' },
  ligneInfo: { flex: 1 },
  ligneNom: { fontFamily: police.gras, fontSize: tailleTexte.md, color: couleurs.texte },
  ligneDate: { fontFamily: police.normal, fontSize: tailleTexte.xs, color: couleurs.texteAttenue },
  squelette: { height: 66, borderRadius: rayon.sm, backgroundColor: couleurs.bordure },
  vide: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16 },
  videTexte: { fontFamily: police.normal, fontSize: tailleTexte.base, color: couleurs.texteAttenue, marginTop: 16 },
  erreur: { fontFamily: police.normal, fontSize: tailleTexte.base, color: couleurs.texteAttenue, textAlign: 'center', marginTop: 32 },
});
