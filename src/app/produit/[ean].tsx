/**
 * FICHE PRODUIT — variante B validée par Monsieur (maquettes du 2026-10-15).
 *
 * Principe : l'application vend d'abord les CONSIGNES DE TRI. Elles viennent donc
 * en premier ; l'indice d'impact (ex-« éco-score ») est un plus, compact, en bas.
 *
 * Ordre de la page :
 *   1. en-tête fin (retour, nom, marque)
 *   2. bannière « hors connexion » (seulement si besoin)
 *   3. « Où le jeter ? » : cartes de bac horizontales + étiquette de fiabilité
 *   4. « Conseil de tri »
 *   5. bloc compact « Indice d'impact »
 *   6. source des données
 *
 * La logique de données (cache d'abord, revalidation réseau, historique) est reprise
 * de la version précédente : seul l'AFFICHAGE change. Étapes suivantes prévues :
 * message précis « séparez… », choix de la matière quand rien n'est connu, feuille
 * « Pourquoi cette note ? », conseils par bac.
 */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BandeauHorsLigne, BlocIndice, BoiteConseil, EnteteFiche, Source } from '@/components/fiche/blocs-info';
import { EcranChargement, EcranIntrouvable } from '@/components/fiche/ecrans-etat';
import { SectionTri, type Bac, type Fiabilite } from '@/components/fiche/blocs-tri';
import { scoreColor } from '@/constants/colors';
import { useAuth } from '@/contexts/auth';
import { couleurs } from '@/design/tokens';
import { rechercherProduitParEAN } from '@/services/api';
import { ecrireProduitCache, lireProduitCache } from '@/services/cache';
import { calculerEcoScore } from '@/services/ecoscore';
import { enregistrerScan } from '@/services/historique';
import { analyserEmballage } from '@/services/tri';

type Statut = 'chargement' | 'introuvable' | 'ok';

// Conseil général validé par Monsieur (inutile de rincer un emballage vide).
// Les conseils propres à chaque bac viendront à l'étape suivante.
const CONSEIL_GENERAL =
  'Inutile de rincer un emballage vide : il doit seulement ne pas être trop souillé. S’il reste beaucoup de produit, videz-le d’abord.';

// Nom lisible de la base d'où viennent les données.
const NOMS_SOURCES: Record<string, string> = {
  openfoodfacts: 'Open Food Facts',
  openbeautyfacts: 'Open Beauty Facts',
  openproductsfacts: 'Open Products Facts',
};

/**
 * Les textes d'emballage d'Open Food Facts sont souvent saisis EN CAPITALES.
 * Pour l'affichage seulement : un texte entièrement en capitales passe en phrase
 * normale (« PAPIER DE CUISSON » → « Papier de cuisson »). Le tri n'est pas modifié.
 */
function enPhraseNormale(texte: string): string {
  const lettres = texte.replace(/[^A-Za-zÀ-ÿ]/g, '');
  if (lettres.length < 3 || texte !== texte.toUpperCase()) return texte;
  const minuscules = texte.toLowerCase();
  return minuscules.charAt(0).toUpperCase() + minuscules.slice(1);
}

/** Regroupe les composants du tri par bac, dans l'ordre où ils apparaissent. */
function grouperParBac(composants: { description: string; categorie: string }[]): Bac[] {
  const parBac = new Map<string, string[]>();
  for (const c of composants) {
    const liste = parBac.get(c.categorie) ?? [];
    liste.push(enPhraseNormale(c.description));
    parBac.set(c.categorie, liste);
  }
  return [...parBac.entries()].map(([categorie, elements]) => ({ categorie, elements }));
}

export default function ProduitScreen() {
  const { ean } = useLocalSearchParams<{ ean: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [statut, setStatut] = useState<Statut>('chargement');
  const [produit, setProduit] = useState<any>(null);
  const [score, setScore] = useState<any>(null);
  const [tri, setTri] = useState<any>(null);
  const [nonRafraichi, setNonRafraichi] = useState(false);
  // Incrémenté par « Réessayer » pour relancer le chargement.
  const [tentative, setTentative] = useState(0);

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
  }, [ean, user, tentative]);

  // Retour : revient en arrière, ou à l'accueil si la fiche a été ouverte directement par un lien.
  const retour = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));
  const reessayer = () => {
    setStatut('chargement');
    setTentative((n) => n + 1);
  };

  if (statut === 'chargement') {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <EcranChargement onRetour={retour} />
      </>
    );
  }

  if (statut === 'introuvable') {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <EcranIntrouvable
          onRetour={retour}
          onReessayer={reessayer}
          onChercher={() => router.push('/(tabs)/recherche')}
        />
      </>
    );
  }

  // ----- Données de la fiche -----
  const bacs = grouperParBac(tri.composants ?? []);

  // D'où vient la consigne ? Lue sur l'emballage, déduite de la catégorie, ou absente.
  // Jamais de consigne déduite présentée comme un fait.
  const fiabilite: Fiabilite = tri.deduit ? 'deduit' : bacs.length > 0 ? 'lu' : 'aucune';

  const estDanger = bacs.some((b) => b.categorie === 'danger');
  // Texte de sécurité (Recyparc) : affiché car il compte plus que les cartes.
  const consigneSecurite = estDanger ? tri.instructions : null;
  // Emballage impossible à déterminer : tri.js fournit alors un texte honnête.
  const indetermine = tri.indetermine ? tri.instructions : null;
  // Le conseil de rinçage ne concerne ni le Recyparc ni l'absence de consigne.
  const afficherConseil = fiabilite !== 'aucune' && !(estDanger && bacs.length === 1);

  // Indice d'impact : null = « Non évalué » (jamais une note par défaut).
  const evalue = score && score.evalue !== false && score.score !== null;
  const note: number | null = evalue ? score.score : null;

  return (
    <View style={styles.page}>
      <Stack.Screen options={{ headerShown: false }} />
      <EnteteFiche nom={produit.nom} marque={produit.marque} onRetour={retour} />
      <ScrollView contentContainerStyle={styles.contenu} showsVerticalScrollIndicator={false}>
        {nonRafraichi ? <BandeauHorsLigne /> : null}

        <SectionTri
          bacs={bacs}
          fiabilite={fiabilite}
          consigneSecurite={consigneSecurite}
          indetermine={indetermine}
          onOuvrirGuide={(categorie) => router.push(`/guide/${categorie}`)}
        />

        {afficherConseil ? <BoiteConseil texte={CONSEIL_GENERAL} /> : null}

        <BlocIndice note={note} palier={score?.label ?? ''} couleur={scoreColor(score?.scoreClass ?? 'unknown')} />

        <Source nom={NOMS_SOURCES[produit.source] ?? String(produit.source ?? 'Open Food Facts')} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fondGris },
  contenu: { paddingBottom: 24 },
});
