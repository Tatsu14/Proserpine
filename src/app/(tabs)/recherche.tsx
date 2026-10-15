/**
 * RECHERCHE — reproduit `pages/recherche.html` + `js/pages/recherche.js` :
 * barre de recherche verte, recherches récentes (historique), suggestions en direct
 * (5 résultats, délai de 300 ms), recherche complète à la validation.
 */
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '@/components/ui/texte';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BoutonPrimaire, BoutonSecondaire } from '@/components/ui/boutons';
import { useUi } from '@/components/ui/ui-provider';
import { useAuth } from '@/contexts/auth';
import { Icone } from '@/design/icones';
import { couleurs, ombre, police, rayon, tailleTexte } from '@/design/tokens';
import { rechercherProduitParTexte } from '@/services/api';
import { ecrireProduitCache } from '@/services/cache';
import { chargerHistorique, type HistoriqueItem } from '@/services/historique';

/** Une ligne de liste (`.list-item`) : icône carrée, nom, marque, chevron facultatif. */
function LigneProduit({ icone, nom, marque, chevron, onPress }: { icone: string; nom: string; marque: string; chevron?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.ligne, pressed && { backgroundColor: couleurs.fondGris }]}
    >
      <View style={styles.ligneIcone}>
        <Icone nom={icone} taille={24} couleur={couleurs.texteAttenue} />
      </View>
      <View style={styles.ligneInfo}>
        <Text style={styles.ligneNom} numberOfLines={1}>
          {nom}
        </Text>
        <Text style={styles.ligneMarque} numberOfLines={1}>
          {marque}
        </Text>
      </View>
      {chevron ? <Icone nom="chevron_right" taille={24} couleur={couleurs.bordure} /> : null}
    </Pressable>
  );
}

/** Squelette d'une ligne pendant le chargement (`.skeleton-item`, 66 px). */
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

export default function RechercheScreen() {
  const router = useRouter();
  const ui = useUi();
  const { user } = useAuth();
  const marges = useSafeAreaInsets();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const champ = useRef<TextInput>(null);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Évite qu'une ancienne réponse écrase une plus récente.
  const numeroRequete = useRef(0);

  const [terme, setTerme] = useState('');
  // 'recents' : état initial · 'live' : suggestions · 'complet' : tous les résultats
  const [mode, setMode] = useState<'recents' | 'live' | 'complet'>('recents');
  const [resultats, setResultats] = useState<any[]>([]);
  const [enChargement, setEnChargement] = useState(false);
  const [recents, setRecents] = useState<HistoriqueItem[] | null>(null);
  const [erreurRecents, setErreurRecents] = useState(false);

  // Recherches récentes + focus automatique à chaque arrivée sur l'onglet.
  useFocusEffect(
    useCallback(() => {
      const t = setTimeout(() => champ.current?.focus(), 100);
      let actif = true;
      if (user) {
        setRecents(null);
        chargerHistorique(user.uid, 10)
          .then((h) => {
            if (!actif) return;
            setRecents(h);
            setErreurRecents(false);
          })
          .catch(() => actif && setErreurRecents(true));
      }
      return () => {
        actif = false;
        clearTimeout(t);
      };
    }, [user]),
  );

  const ouvrirProduit = (p: any) => {
    // Le produit est mis en mémoire : la fiche s'ouvre instantanément (équivalent du sessionStorage en ligne).
    ecrireProduitCache(p.ean, p);
    router.push(`/produit/${encodeURIComponent(p.ean)}`);
  };

  // Recherche en direct : 5 résultats max, sans écran de chargement.
  const chercherEnDirect = async (valeur: string) => {
    const n = ++numeroRequete.current;
    setMode('live');
    setEnChargement(true);
    const r = await rechercherProduitParTexte(valeur);
    if (n !== numeroRequete.current) return;
    setResultats(r ?? []);
    setEnChargement(false);
  };

  // Recherche complète : écran de chargement + tous les résultats.
  const chercherTout = async (valeur: string) => {
    const n = ++numeroRequete.current;
    ui.chargement('Recherche en cours...');
    setMode('complet');
    const r = await rechercherProduitParTexte(valeur);
    ui.chargement(null);
    if (n !== numeroRequete.current) return;
    setResultats(r ?? []);
    setEnChargement(false);
  };

  // Arrivée depuis un scan sans résultat : la recherche part toute seule.
  useEffect(() => {
    if (q) {
      setTerme(String(q));
      chercherTout(String(q));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const surSaisie = (valeur: string) => {
    setTerme(valeur);
    if (minuteur.current) clearTimeout(minuteur.current);
    const net = valeur.trim();
    if (net.length === 0) {
      setMode('recents');
      return;
    }
    minuteur.current = setTimeout(() => chercherEnDirect(net), 300);
  };

  const effacer = () => {
    setTerme('');
    setMode('recents');
    champ.current?.focus();
  };

  const valider = () => {
    const net = terme.trim();
    if (net.length > 0) {
      if (minuteur.current) clearTimeout(minuteur.current);
      chercherTout(net);
    }
  };

  const affiches = mode === 'live' ? resultats.slice(0, 5) : resultats;

  return (
    <View style={styles.page}>
      {/* .search-header */}
      <View style={[styles.entete, { paddingTop: 24 + marges.top }]}>
        <View style={styles.barre}>
          <Icone nom="search" taille={24} couleur={couleurs.texteAttenue} />
          <TextInput
            ref={champ}
            value={terme}
            onChangeText={surSaisie}
            onSubmitEditing={valider}
            returnKeyType="search"
            autoComplete="off"
            autoCorrect={false}
            placeholder="Rechercher un produit, une marque..."
            placeholderTextColor={couleurs.texteDiscret}
            style={styles.saisie}
            accessibilityLabel="Rechercher un produit, une marque"
          />
          {terme.length > 0 ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Effacer la recherche" onPress={effacer} style={styles.bouton}>
              <Icone nom="close" taille={24} couleur={couleurs.texteDiscret} />
            </Pressable>
          ) : null}
          <Pressable accessibilityRole="button" accessibilityLabel="Lancer la recherche" onPress={valider} style={styles.bouton}>
            <Icone nom="arrow_forward" taille={24} couleur={couleurs.marque} />
          </Pressable>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.resultats} keyboardShouldPersistTaps="handled">
        {mode === 'recents' ? (
          <View>
            {/* Le titre disparaît quand il n'y a aucun historique (.recent-no-history) */}
            {!(recents && recents.length === 0) ? <Text style={styles.titre}>Recherches récentes</Text> : null}
            {recents === null && !erreurRecents ? <Squelette /> : null}
            {erreurRecents ? <Text style={styles.texteAttenue}>Erreur lors du chargement des recherches récentes.</Text> : null}
            {recents && recents.length === 0 ? (
              <Text style={styles.vide}>Aucune recherche pour l'instant. Scannez ou recherchez un produit pour commencer.</Text>
            ) : null}
            {recents?.map((h) => (
              <LigneProduit
                key={h.ean}
                icone="history"
                nom={h.nom || 'Produit inconnu'}
                marque={h.marque || ''}
                chevron
                onPress={() => router.push(`/produit/${encodeURIComponent(h.ean)}`)}
              />
            ))}
          </View>
        ) : (
          <View>
            {enChargement && resultats.length === 0 ? <Squelette /> : null}
            {!enChargement && affiches.length === 0 ? (
              <View style={styles.aucun}>
                <Icone nom="search_off" taille={24} couleur={couleurs.texteDiscret} />
                <Text style={styles.aucunTexte}>Aucun produit trouvé pour cette recherche.</Text>
                <BoutonPrimaire style={{ marginTop: 16 }} onPress={() => router.push('/(tabs)/scan')}>
                  Scanner un produit
                </BoutonPrimaire>
              </View>
            ) : null}
            {affiches.map((p) => (
              <LigneProduit key={p.ean} icone="package_2" nom={p.nom} marque={p.marque} onPress={() => ouvrirProduit(p)} />
            ))}
            {mode === 'live' && resultats.length > 5 ? (
              <BoutonSecondaire style={{ marginTop: 8 }} onPress={() => chercherTout(terme.trim())}>
                {`Voir tous les résultats (${resultats.length})`}
              </BoutonSecondaire>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fondCarte },
  entete: { paddingHorizontal: 16, paddingBottom: 16, backgroundColor: couleurs.fondCarte, zIndex: 100 },
  // .search-bar
  barre: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.fondCarte,
    borderWidth: 2,
    borderColor: couleurs.marque,
    borderRadius: rayon.lg,
    paddingVertical: 8,
    paddingHorizontal: 12,
    boxShadow: ombre.recherche,
  },
  saisie: {
    flex: 1,
    padding: 8,
    fontFamily: police.normal,
    fontSize: tailleTexte.md,
    color: couleurs.texte,
    outlineStyle: 'none',
  } as any,
  bouton: { padding: 4, alignItems: 'center', justifyContent: 'center' },
  resultats: { paddingVertical: 8, paddingHorizontal: 16, paddingBottom: 24 },
  // .section-title (avec son propre retrait de 16 px, comme en ligne)
  titre: { fontFamily: police.extraGras, fontSize: tailleTexte.xl, color: couleurs.marqueSombre, marginBottom: 16, paddingHorizontal: 16 },
  // .list-item
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: couleurs.fondCarte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon.md,
    marginBottom: 12,
  },
  ligneIcone: {
    width: 40,
    height: 40,
    borderRadius: rayon.sm,
    backgroundColor: couleurs.fondApp,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  ligneInfo: { flex: 1 },
  ligneNom: { fontFamily: police.gras, fontSize: tailleTexte.md, color: couleurs.texte },
  ligneMarque: { fontFamily: police.normal, fontSize: tailleTexte.xs, color: couleurs.texteAttenue },
  squelette: { height: 66, borderRadius: rayon.sm, backgroundColor: couleurs.bordure, marginBottom: 12 },
  vide: { fontFamily: police.normal, fontSize: tailleTexte.sm, color: couleurs.texteAttenue },
  texteAttenue: { fontFamily: police.normal, fontSize: tailleTexte.base, color: couleurs.texteAttenue },
  // .empty-state
  aucun: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16 },
  aucunTexte: { fontFamily: police.normal, fontSize: tailleTexte.base, color: couleurs.texteAttenue, textAlign: 'center', marginTop: 16 },
});
