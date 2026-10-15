/**
 * ACCUEIL — reproduit `pages/accueil.html` + `js/pages/accueil.js` de la version en ligne :
 * en-tête sombre avec salutation selon l'heure, deux classements (produits les plus
 * scannés, meilleurs scores), conseil du jour.
 */
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/texte';

import { EnteteSombre } from '@/components/ui/entete-sombre';
import { Icone } from '@/design/icones';
import { couleurs, police, rayon, tailleTexte } from '@/design/tokens';
import { useAuth } from '@/contexts/auth';
import { chargerStatsDashboard, type HistoriqueItem } from '@/services/historique';
import { getUsername } from '@/services/user';

// Conseils de tri (un par jour) — repris verbatim de la version en ligne.
// (À relire plus tard : le premier est jugé faux par Monsieur, voir le backlog.)
const CONSEILS_TRI = [
  'Rincez rapidement vos emballages avant de les trier — un emballage propre est mieux recyclé.',
  'Le verre ne va pas dans le sac PMC. Chaque type de verre a sa propre bulle.',
  'Un couvercle en plastique se jette dans le sac bleu, même si le pot en verre va à la bulle à verre.',
  'Les boîtes de pizza grasses ne vont PAS dans les papiers/cartons — poubelle résiduelle.',
  'Réduire prime sur recycler : préférez les produits avec moins d\'emballage.',
  'Les canettes en aluminium sont infiniment recyclables sans perte de qualité.',
  'Le polystyrène expansé (frigolite) ne se recycle pas — poubelle résiduelle.',
  'Séparez toujours les composants d\'un emballage avant de le trier.',
  'Un verre brisé ne va pas dans la bulle à verre — emballez-le dans du papier et mettez-le aux résiduels.',
  'Les briques de lait et de jus (Tetra Pak) vont dans le sac bleu PMC.',
  'Préférez les produits rechargeables ou les formats familiaux pour réduire vos déchets.',
  'Les aérosols vides vont dans le sac PMC — ne les percez surtout pas.',
  'Le papier aluminium et les barquettes en alu vont dans le sac bleu PMC.',
  'Les films plastiques fins (sur yaourts, légumes emballés) vont dans le sac PMC.',
  'Évitez les emballages multi-matériaux plastique + carton collés — souvent non recyclables.',
  'Le carton ondulé doit être aplati avant d\'aller dans la collecte papier/carton.',
  'Les médicaments périmés s\'apportent en pharmacie — jamais dans la poubelle.',
  'Achetez en vrac quand c\'est possible : zéro emballage, zéro déchet.',
  'Les capsules de café en aluminium peuvent être déposées dans des points de collecte spécifiques.',
  'Un emballage non identifiable va en général dans les déchets résiduels.',
];

function salutationDynamique(): { label: string; sub: string } {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { label: 'Bonjour,', sub: 'Commencez la journée du bon pied 🌿' };
  if (h >= 12 && h < 18) return { label: 'Bon après-midi,', sub: 'Vous avez scanné quelque chose aujourd\'hui ?' };
  if (h >= 18 && h < 22) return { label: 'Bonsoir,', sub: 'Pensez à trier vos déchets de la journée.' };
  return { label: 'Bonne nuit,', sub: 'Le recyclage ne dort jamais. 🌙' };
}

// Un conseil par jour (indice déterministe, décalage +1 h comme en ligne).
function conseilDuJour(): string {
  const dayIndex = Math.floor((Date.now() + 3_600_000) / 86_400_000);
  return CONSEILS_TRI[dayIndex % CONSEILS_TRI.length];
}

// Couleur du score selon les mêmes seuils que la version en ligne.
function couleurScore(score: number): string {
  if (score >= 75) return '#27AE60';
  if (score >= 50) return '#00CC66';
  if (score >= 25) return '#FF9800';
  return '#E74C3C';
}

/** Une carte de classement (`.stats-card`). */
function CarteStats({ p, rang, mode, onPress }: { p: HistoriqueItem; rang: number; mode: 'scan' | 'score'; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.carte, pressed && { transform: [{ scale: 0.97 }] }]}
    >
      <Text style={styles.rang}>#{rang}</Text>
      <Text style={styles.nomCarte} numberOfLines={2}>
        {p.nom || 'Produit'}
      </Text>
      {mode === 'score' && typeof p.ecoScore === 'number' ? (
        <Text style={[styles.score, { color: couleurScore(p.ecoScore) }]}>{p.ecoScore}/100</Text>
      ) : (
        <Text style={styles.marque} numberOfLines={1}>
          {p.marque || ''}
        </Text>
      )}
    </Pressable>
  );
}

/** Grille vide (`.stats-card-ghost`) : trois cartes pointillées de plus en plus pâles + une phrase. */
function GrilleVide({ message }: { message: string }) {
  return (
    <>
      <View style={styles.grille}>
        <View style={styles.fantome} />
        <View style={[styles.fantome, { opacity: 0.55 }]} />
        <View style={[styles.fantome, { opacity: 0.25 }]} />
      </View>
      <Text style={styles.indice}>{message}</Text>
    </>
  );
}

export default function AccueilScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [pseudo, setPseudo] = useState('...');
  const [plusScannes, setPlusScannes] = useState<HistoriqueItem[]>([]);
  const [meilleursScores, setMeilleursScores] = useState<HistoriqueItem[]>([]);

  const salutation = salutationDynamique();

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

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.page} contentContainerStyle={{ paddingBottom: 16 }}>
      <EnteteSombre>
        <View style={styles.salutation}>
          <Text style={styles.salutationLabel}>{salutation.label}</Text>
          <Text style={styles.salutationNom}>{pseudo}</Text>
          <Text style={styles.salutationSub}>{salutation.sub}</Text>
        </View>
      </EnteteSombre>

      <View style={styles.section}>
        <Text style={styles.titre}>Vos produits les plus scannés</Text>
        {plusScannes.length === 0 ? (
          <GrilleVide message="Scannez des produits pour remplir ce classement." />
        ) : (
          <View style={styles.grille}>
            {plusScannes.map((p, i) => (
              <CarteStats key={p.ean} p={p} rang={i + 1} mode="scan" onPress={() => router.push(`/produit/${p.ean}`)} />
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.titre}>Vos meilleurs scores</Text>
        {meilleursScores.length === 0 ? (
          <GrilleVide message="Vos meilleurs scores apparaîtront ici après vos premiers scans." />
        ) : (
          <View style={styles.grille}>
            {meilleursScores.map((p, i) => (
              <CarteStats key={p.ean} p={p} rang={i + 1} mode="score" onPress={() => router.push(`/produit/${p.ean}`)} />
            ))}
          </View>
        )}
      </View>

      <View style={styles.conseil}>
        <Icone nom="lightbulb" taille={24} couleur={couleurs.marque} />
        <View style={{ flex: 1 }}>
          <Text style={styles.conseilTitre}>Conseil du jour</Text>
          <Text style={styles.conseilTexte}>{conseilDuJour()}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fondCarte },
  // .header-dark-greeting / .greeting-*
  salutation: { paddingTop: 8 },
  salutationLabel: { fontFamily: police.normal, fontSize: tailleTexte.md, color: couleurs.texteSurSombreAttenue, marginBottom: 4 },
  salutationNom: { fontFamily: police.noir, fontSize: tailleTexte.xl3, lineHeight: 26.4, color: couleurs.texteSurSombre, marginBottom: 8 },
  salutationSub: { fontFamily: police.normal, fontSize: tailleTexte.sm, color: couleurs.texteSurSombreAttenue },
  // .accueil-section
  section: { paddingHorizontal: 16, marginBottom: 24 },
  titre: { fontFamily: police.extraGras, fontSize: tailleTexte.xl, color: couleurs.marqueSombre, marginBottom: 16 },
  // .stats-grid : 3 colonnes, écart 8
  grille: { flexDirection: 'row', gap: 8 },
  carte: {
    flex: 1,
    minHeight: 88,
    backgroundColor: couleurs.fondCarte,
    borderRadius: rayon.md,
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  rang: { fontFamily: police.extraGras, fontSize: tailleTexte.xs, color: couleurs.marque },
  nomCarte: { flex: 1, fontFamily: police.gras, fontSize: tailleTexte.xs, lineHeight: 14.3, color: couleurs.texte },
  marque: { fontFamily: police.normal, fontSize: tailleTexte.xxs, color: couleurs.texteAttenue },
  score: { fontFamily: police.extraGras, fontSize: tailleTexte.sm, marginTop: 'auto' },
  // .stats-card-ghost
  fantome: {
    flex: 1,
    minHeight: 88,
    backgroundColor: couleurs.fondCarte,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: couleurs.fondPointille,
    borderRadius: rayon.md,
  },
  indice: { fontFamily: police.normal, fontSize: tailleTexte.xs, lineHeight: 15.4, color: couleurs.texteDiscret, textAlign: 'center', marginTop: 8 },
  // .accueil-tip-card
  conseil: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: couleurs.fondCarte,
    borderLeftWidth: 4,
    borderLeftColor: couleurs.marque,
    borderTopRightRadius: rayon.md,
    borderBottomRightRadius: rayon.md,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  conseilTitre: { fontFamily: police.extraGras, fontSize: tailleTexte.sm, color: couleurs.marque, marginBottom: 4 },
  conseilTexte: { fontFamily: police.normal, fontSize: tailleTexte.sm, lineHeight: 18, color: couleurs.texte },
});
