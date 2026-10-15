import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { categorieColor, Colors, scoreColor } from '@/constants/colors';
import { useAuth } from '@/contexts/auth';
import { rechercherProduitParEAN } from '@/services/api';
import { ecrireProduitCache, lireProduitCache } from '@/services/cache';
import { calculerEcoScore } from '@/services/ecoscore';
import { enregistrerScan } from '@/services/historique';
import { analyserEmballage, CATEGORIES } from '@/services/tri';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Statut = 'chargement' | 'introuvable' | 'ok';

function Ring({ value, color, evalue }: { value: number; color: string; evalue: boolean }) {
  const size = 150;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = evalue ? Math.max(0, Math.min(100, value)) / 100 : 0;
  const offset = c * (1 - pct);
  // Animation d'entrée : l'anneau se remplit de 0 jusqu'au score.
  const anim = useRef(new Animated.Value(c)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: offset, duration: 900, useNativeDriver: false }).start();
  }, [offset, anim]);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={Colors.borderDefault} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={anim}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ alignItems: 'center' }}>
        <Text style={[styles.scoreNum, { color }]}>{evalue ? value : '?'}</Text>
        {evalue ? <Text style={styles.scoreOutOf}>/100</Text> : null}
      </View>
    </View>
  );
}

export default function ProduitScreen() {
  const { ean } = useLocalSearchParams<{ ean: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [statut, setStatut] = useState<Statut>('chargement');
  const [produit, setProduit] = useState<any>(null);
  const [score, setScore] = useState<any>(null);
  const [tri, setTri] = useState<any>(null);
  const [depliés, setDepliés] = useState<Record<number, boolean>>({});
  const [nonRafraichi, setNonRafraichi] = useState(false);

  useEffect(() => {
    let actif = true;

    // Calcule score + tri et affiche le produit. Renvoie le score (pour l'historique).
    const appliquer = (p: any) => {
      const s: any = calculerEcoScore(p.donnees_brutes);
      const t: any = analyserEmballage(p.donnees_brutes);
      setProduit(p);
      setScore(s);
      setTri(t);
      setStatut('ok');
      return s;
    };

    (async () => {
      const code = String(ean);

      // 1. Cache d'abord : affichage instantané si le produit est déjà connu.
      const cache = await lireProduitCache(code);
      let courant: any = null;
      let scoreCourant: any = null;
      if (cache && actif) {
        scoreCourant = appliquer(cache);
        courant = cache;
      } else if (actif) {
        setStatut('chargement');
      }

      // 2. Revalidation réseau (résiliente : timeout + retry côté api.js).
      const frais: any = await rechercherProduitParEAN(code);
      if (!actif) return;

      if (frais) {
        scoreCourant = appliquer(frais);
        courant = frais;
        setNonRafraichi(false);
        ecrireProduitCache(code, frais);
      } else if (cache) {
        // Réseau KO mais on a une copie en cache → on la garde et on le signale.
        setNonRafraichi(true);
      } else {
        setStatut('introuvable');
      }

      // 3. Historique, avec la meilleure donnée disponible (fraîche de préférence).
      if (courant && user) {
        const note =
          scoreCourant && scoreCourant.evalue !== false && scoreCourant.score !== null
            ? scoreCourant.score
            : null;
        enregistrerScan(user.uid, { ean: courant.ean, nom: courant.nom, marque: courant.marque }, note).catch(
          () => {},
        );
      }
    })();

    return () => {
      actif = false;
    };
  }, [ean, user]);

  if (statut === 'chargement') {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Fiche produit', headerShown: true }} />
        <ActivityIndicator size="large" color={Colors.brandPrimary} />
      </View>
    );
  }

  if (statut === 'introuvable') {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Produit introuvable', headerShown: true }} />
        <Text style={styles.introuvable}>
          Produit introuvable, ou connexion à Open Food Facts indisponible. Vérifiez votre connexion et
          réessayez.
        </Text>
        <TouchableOpacity style={styles.searchBtn} onPress={() => router.push('/(tabs)/recherche')}>
          <Text style={styles.searchBtnText}>Rechercher manuellement</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const evalue = score && score.evalue !== false && score.score !== null;
  const couleurScore = scoreColor(score.scoreClass);

  const parCategorie: Record<string, string[]> = {};
  for (const c of tri.composants ?? []) {
    (parCategorie[c.categorie] ??= []).push(c.description);
  }
  const categories = Object.keys(parCategorie);

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: 'Fiche produit', headerShown: true }} />

      {nonRafraichi ? (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color={Colors.guidePaperText} />
          <Text style={styles.offlineText}>
            Données en cache — Open Food Facts est injoignable pour le moment.
          </Text>
        </View>
      ) : null}

      {produit.imageUrl ? (
        <Image source={{ uri: produit.imageUrl }} style={styles.image} contentFit="contain" />
      ) : null}

      <Text style={styles.nom}>{produit.nom}</Text>
      <Text style={styles.marque}>{produit.marque}</Text>
      <Text style={styles.origine}>Origine : {produit.pays_origine || 'Non spécifié'}</Text>

      {/* Éco-score (anneau) */}
      <View style={styles.scoreBlock}>
        <Ring value={score.score ?? 0} color={couleurScore} evalue={!!evalue} />
        <Text style={[styles.scoreLabel, { color: couleurScore }]}>{score.label}</Text>
        <Text style={styles.scoreDetail}>{score.detail}</Text>
      </View>

      {/* Facteurs (dépliables) */}
      {score.facteurs && score.facteurs.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pourquoi ce score</Text>
          {score.facteurs.map((f: any, i: number) => (
            <TouchableOpacity
              key={i}
              style={styles.facteur}
              activeOpacity={0.7}
              onPress={() => setDepliés((d) => ({ ...d, [i]: !d[i] }))}
            >
              <View style={styles.facteurHead}>
                <View style={styles.facteurDot} />
                <Text style={styles.facteurLabel}>{f.label}</Text>
                <Text style={styles.facteurImpact}>{f.impact}</Text>
                <Ionicons
                  name={depliés[i] ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={Colors.textLight}
                />
              </View>
              {depliés[i] ? <Text style={styles.facteurExpl}>{f.explication}</Text> : null}
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {/* Consignes de tri */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Comment le trier</Text>
        {categories.length === 0 ? (
          <Text style={styles.triVide}>Pas assez de données pour déterminer le tri de ce produit.</Text>
        ) : (
          <>
            {categories.length > 1 ? (
              <Text style={styles.triNote}>Séparez les éléments avant de trier.</Text>
            ) : null}
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.triCard, { backgroundColor: categorieColor(cat) }]}
                onPress={() => router.push(`/guide/${cat}`)}
                activeOpacity={0.85}
              >
                <View style={styles.triCardHead}>
                  <Text style={styles.triCardTitle}>{(CATEGORIES as any)[cat]?.title ?? cat}</Text>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textOnDark} />
                </View>
                <View style={styles.chips}>
                  {parCategorie[cat].map((desc, i) => (
                    <View key={i} style={styles.chip}>
                      <Text style={styles.chipText}>{desc}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            ))}
            {categories.includes('glass') ? (
              <View style={styles.glassWarning}>
                <Ionicons name="warning-outline" size={18} color={Colors.guidePaperText} />
                <Text style={styles.glassWarningText}>
                  Triez le verre par couleur : transparent → bulle blanche, coloré → bulle colorée.
                </Text>
              </View>
            ) : null}
          </>
        )}
      </View>

      <Text style={styles.source}>Source des données : {produit.source}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.bgApp },
  container: { padding: 20, paddingBottom: 50 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 16, backgroundColor: Colors.bgApp },
  introuvable: { fontSize: 15, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },
  searchBtn: { backgroundColor: Colors.brandPrimary, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 22 },
  searchBtnText: { color: Colors.textOnDark, fontWeight: '700', fontSize: 15 },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.guidePaper,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  offlineText: { flex: 1, fontSize: 12.5, color: Colors.guidePaperText },
  image: { width: '100%', height: 180, marginBottom: 12 },
  nom: { fontSize: 22, fontWeight: '800', color: Colors.textDark, textAlign: 'center' },
  marque: { fontSize: 15, color: Colors.textMuted, textAlign: 'center', marginTop: 2 },
  origine: { fontSize: 13, color: Colors.textLight, textAlign: 'center', marginTop: 4 },
  scoreBlock: { alignItems: 'center', marginTop: 24 },
  scoreNum: { fontSize: 42, fontWeight: '800' },
  scoreOutOf: { fontSize: 13, color: Colors.textMuted, marginTop: -4 },
  scoreLabel: { fontSize: 20, fontWeight: '800', marginTop: 12 },
  scoreDetail: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  section: { marginTop: 28 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: Colors.textDark, marginBottom: 12 },
  facteur: {
    backgroundColor: Colors.bgSurface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
  },
  facteurHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  facteurDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.statusDanger },
  facteurLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.textDark },
  facteurImpact: { fontSize: 15, fontWeight: '800', color: Colors.statusDanger },
  facteurExpl: { fontSize: 13, color: Colors.textMuted, marginTop: 8, lineHeight: 19 },
  triVide: { fontSize: 14, color: Colors.textMuted, fontStyle: 'italic' },
  triNote: { fontSize: 13, color: Colors.textMuted, marginBottom: 10 },
  triCard: { borderRadius: 14, padding: 16, marginBottom: 10 },
  triCardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  triCardTitle: { fontSize: 16, fontWeight: '800', color: Colors.textOnDark },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  chipText: { color: Colors.textOnDark, fontSize: 13, fontWeight: '600' },
  glassWarning: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.guidePaper,
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  glassWarningText: { flex: 1, fontSize: 13, color: Colors.guidePaperText, lineHeight: 19 },
  source: { fontSize: 12, color: Colors.textLight, textAlign: 'center', marginTop: 24 },
});
