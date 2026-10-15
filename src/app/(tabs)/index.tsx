import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, scoreColorByValue } from '@/constants/colors';
import { useAuth } from '@/contexts/auth';
import { chargerStatsDashboard, type HistoriqueItem } from '@/services/historique';
import { getUsername } from '@/services/user';

const logo = require('../../../assets/images/logo.png');

// Conseils de tri (un par jour) — repris verbatim de la version web.
const CONSEILS_TRI = [
  'Rincez rapidement vos emballages avant de les trier — un emballage propre est mieux recyclé.',
  'Le verre ne va pas dans le sac PMC. Chaque type de verre a sa propre bulle.',
  'Un couvercle en plastique se jette dans le sac bleu, même si le pot en verre va à la bulle à verre.',
  'Les boîtes de pizza grasses ne vont PAS dans les papiers/cartons — poubelle résiduelle.',
  'Réduire prime sur recycler : préférez les produits avec moins d’emballage.',
  'Les canettes en aluminium sont infiniment recyclables sans perte de qualité.',
  'Le polystyrène expansé (frigolite) ne se recycle pas — poubelle résiduelle.',
  'Séparez toujours les composants d’un emballage avant de le trier.',
  'Un verre brisé ne va pas dans la bulle à verre — emballez-le dans du papier et mettez-le aux résiduels.',
  'Les briques de lait et de jus (Tetra Pak) vont dans le sac bleu PMC.',
  'Préférez les produits rechargeables ou les formats familiaux pour réduire vos déchets.',
  'Les aérosols vides vont dans le sac PMC — ne les percez surtout pas.',
  'Le papier aluminium et les barquettes en alu vont dans le sac bleu PMC.',
  'Les films plastiques fins (sur yaourts, légumes emballés) vont dans le sac PMC.',
  'Évitez les emballages multi-matériaux plastique + carton collés — souvent non recyclables.',
  'Le carton ondulé doit être aplati avant d’aller dans la collecte papier/carton.',
  'Les médicaments périmés s’apportent en pharmacie — jamais dans la poubelle.',
  'Achetez en vrac quand c’est possible : zéro emballage, zéro déchet.',
  'Les capsules de café en aluminium peuvent être déposées dans des points de collecte spécifiques.',
  'Un emballage non identifiable va en général dans les déchets résiduels.',
];

function salutationDynamique(): { label: string; sub: string } {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { label: 'Bonjour,', sub: 'Commencez la journée du bon pied 🌿' };
  if (h >= 12 && h < 18) return { label: 'Bon après-midi,', sub: 'Vous avez scanné quelque chose aujourd’hui ?' };
  if (h >= 18 && h < 22) return { label: 'Bonsoir,', sub: 'Pensez à trier vos déchets de la journée.' };
  return { label: 'Bonne nuit,', sub: 'Le recyclage ne dort jamais. 🌙' };
}

function conseilDuJour(): string {
  const dayIndex = Math.floor((Date.now() + 3_600_000) / 86_400_000);
  return CONSEILS_TRI[dayIndex % CONSEILS_TRI.length];
}

export default function AccueilScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [pseudo, setPseudo] = useState('…');
  const [plusScannes, setPlusScannes] = useState<HistoriqueItem[]>([]);
  const [meilleursScores, setMeilleursScores] = useState<HistoriqueItem[]>([]);

  const greeting = salutationDynamique();
  const tip = conseilDuJour();

  useFocusEffect(
    useCallback(() => {
      let actif = true;
      if (user) {
        getUsername(user.uid, user.displayName).then((n) => actif && setPseudo(n));
        chargerStatsDashboard(user.uid)
          .then((s) => {
            if (!actif) return;
            setPlusScannes(s.plusScannes);
            setMeilleursScores(s.meilleursScores);
          })
          .catch(() => {});
      }
      return () => {
        actif = false;
      };
    }, [user]),
  );

  function carte(p: HistoriqueItem, i: number, mode: 'scan' | 'score') {
    return (
      <TouchableOpacity
        key={p.ean}
        style={styles.statCard}
        onPress={() => router.push(`/produit/${p.ean}`)}
        activeOpacity={0.8}
      >
        <Text style={styles.statRank}>#{i + 1}</Text>
        <Text style={styles.statName} numberOfLines={2}>
          {p.nom}
        </Text>
        {mode === 'score' && typeof p.ecoScore === 'number' ? (
          <Text style={[styles.statScore, { color: scoreColorByValue(p.ecoScore) }]}>{p.ecoScore}/100</Text>
        ) : (
          <Text style={styles.statBrand} numberOfLines={1}>
            {p.marque || ''}
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.brandRow}>
          <Image source={logo} style={styles.brandLogo} contentFit="contain" />
          <Text style={styles.brandName}>PROSERPINE</Text>
        </View>
        <Text style={styles.greetLabel}>{greeting.label}</Text>
        <Text style={styles.greetName}>{pseudo}</Text>
        <Text style={styles.greetSub}>{greeting.sub}</Text>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.sectionTitle}>Vos produits les plus scannés</Text>
        {plusScannes.length === 0 ? (
          <Text style={styles.hint}>Scannez des produits pour remplir ce classement.</Text>
        ) : (
          <View style={styles.statsGrid}>{plusScannes.map((p, i) => carte(p, i, 'scan'))}</View>
        )}

        <Text style={styles.sectionTitle}>Vos meilleurs scores</Text>
        {meilleursScores.length === 0 ? (
          <Text style={styles.hint}>Vos meilleurs scores apparaîtront ici après vos premiers scans.</Text>
        ) : (
          <View style={styles.statsGrid}>{meilleursScores.map((p, i) => carte(p, i, 'score'))}</View>
        )}

        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>💡 Conseil du jour</Text>
          <Text style={styles.tipText}>{tip}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgApp },
  header: { backgroundColor: Colors.brandDarkest, paddingHorizontal: 20, paddingBottom: 22 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  brandLogo: { width: 26, height: 26 },
  brandName: { color: Colors.textOnDark, fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  greetLabel: { color: Colors.textOnDark, opacity: 0.7, fontSize: 15, marginTop: 18 },
  greetName: { color: Colors.textOnDark, fontSize: 26, fontWeight: '800', marginTop: 2 },
  greetSub: { color: Colors.textOnDark, opacity: 0.8, fontSize: 13, marginTop: 6 },
  body: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.textDark, marginTop: 22, marginBottom: 12 },
  hint: { color: Colors.textMuted, fontSize: 13, fontStyle: 'italic' },
  statsGrid: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.bgSurface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    minHeight: 110,
  },
  statRank: { fontSize: 13, fontWeight: '800', color: Colors.brandPrimary },
  statName: { fontSize: 13, fontWeight: '600', color: Colors.textDark, marginTop: 6, flex: 1 },
  statBrand: { fontSize: 12, color: Colors.textMuted, marginTop: 6 },
  statScore: { fontSize: 16, fontWeight: '800', marginTop: 6 },
  tipCard: {
    flexDirection: 'column',
    backgroundColor: Colors.brandPrimaryLight,
    borderRadius: 16,
    padding: 18,
    marginTop: 28,
  },
  tipTitle: { fontSize: 14, fontWeight: '800', color: Colors.brandPrimaryDark },
  tipText: { fontSize: 13.5, color: Colors.textDark, marginTop: 6, lineHeight: 20 },
});
