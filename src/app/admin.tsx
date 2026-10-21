/**
 * ADMINISTRATION — tableau de bord des retours utilisateurs (réservé au compte administrateur).
 *
 * Compteurs, deux onglets (avis / signalements), filtres par fonctionnalité et par statut,
 * changement de statut en touchant le statut d'une carte, et export d'un rapport texte à coller
 * dans une conversation Claude Code pour analyser les retours.
 *
 * Les graphiques viendront à l'étape suivante.
 */
import { Stack } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';

import { BoutonPrimaire, BoutonSecondaire } from '@/components/ui/boutons';
import { ChoixPuces, ChoixSegment } from '@/components/ui/choix-retour';
import { EnteteEcran } from '@/components/ui/menu';
import { Text } from '@/components/ui/texte';
import { useUi } from '@/components/ui/ui-provider';
import { UID_ADMIN } from '@/constants/admin';
import { useAuth } from '@/contexts/auth';
import { couleurs, police, rayon, tailleTexte } from '@/design/tokens';
import {
  changerStatut,
  chargerAvis,
  chargerSignalements,
  LIMITE_CHARGEMENT,
  STATUTS,
  statutSuivant,
  type Avis,
  type Signalement,
  type Statut,
} from '@/services/admin-retours';
import { construireRapport, noteMoyenne } from '@/services/export-retours';
import {
  COLLECTION_AVIS,
  COLLECTION_SIGNALEMENTS,
  FONCTIONNALITES,
  GRAVITES,
  TYPES_AVIS,
  type Fonctionnalite,
} from '@/services/retours';

type Onglet = 'avis' | 'signalements';
type FiltreFonctionnalite = 'toutes' | Fonctionnalite;
type FiltreStatut = 'tous' | Statut;

const ONGLETS = [
  { id: 'avis', libelle: 'Avis' },
  { id: 'signalements', libelle: 'Signalements' },
] as const;
const FILTRES_FONCTIONNALITE = [{ id: 'toutes', libelle: 'Toutes' }, ...FONCTIONNALITES] as const;
const FILTRES_STATUT = [{ id: 'tous', libelle: 'Tous' }, ...STATUTS] as const;

const libelle = (liste: readonly { id: string; libelle: string }[], id: string) =>
  liste.find((e) => e.id === id)?.libelle ?? id;

const dateCourte = (d: Date | null) => (d ? d.toLocaleDateString('fr-FR') : '—');

function Compteur({ valeur, titre, alerte }: { valeur: string; titre: string; alerte?: boolean }) {
  return (
    <View style={styles.compteur}>
      <Text style={[styles.compteurValeur, alerte && { color: couleurs.statutDanger }]}>{valeur}</Text>
      <Text style={styles.compteurTitre}>{titre}</Text>
    </View>
  );
}

function PuceStatut({ statut, onPress }: { statut: Statut; onPress: () => void }) {
  const couleur =
    statut === 'traite' ? couleurs.statutBon : statut === 'en_cours' ? couleurs.statutAttention : couleurs.texteAttenue;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Statut : ${libelle(STATUTS, statut)}. Toucher pour changer.`}
      onPress={onPress}
      style={[styles.statut, { borderColor: couleur }]}
    >
      <Text style={[styles.statutTexte, { color: couleur }]}>{libelle(STATUTS, statut)}</Text>
    </Pressable>
  );
}

export default function AdminScreen() {
  const ui = useUi();
  const { user } = useAuth();
  const estAdmin = user?.uid === UID_ADMIN;

  const [onglet, setOnglet] = useState<Onglet>('avis');
  const [filtreFonctionnalite, setFiltreFonctionnalite] = useState<FiltreFonctionnalite>('toutes');
  const [filtreStatut, setFiltreStatut] = useState<FiltreStatut>('tous');
  const [avis, setAvis] = useState<Avis[]>([]);
  const [signalements, setSignalements] = useState<Signalement[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    const [a, s] = await Promise.all([chargerAvis(), chargerSignalements()]);
    if (a.success) setAvis(a.donnees);
    if (s.success) setSignalements(s.donnees);
    if (!a.success) setErreur(a.error);
    else if (!s.success) setErreur(s.error);
    setChargement(false);
  }, []);

  useEffect(() => {
    if (estAdmin) charger();
  }, [estAdmin, charger]);

  const correspond = (r: { fonctionnalite: Fonctionnalite; statut: Statut }) =>
    (filtreFonctionnalite === 'toutes' || r.fonctionnalite === filtreFonctionnalite) &&
    (filtreStatut === 'tous' || r.statut === filtreStatut);

  const avisAffiches = useMemo(() => avis.filter(correspond), [avis, filtreFonctionnalite, filtreStatut]);
  const signalementsAffiches = useMemo(
    () => signalements.filter(correspond),
    [signalements, filtreFonctionnalite, filtreStatut],
  );

  const moyenne = noteMoyenne(avis);
  const nouveauxAvis = avis.filter((a) => a.statut === 'nouveau').length;
  const bloquantsOuverts = signalements.filter((s) => s.gravite === 'bloquant' && s.statut !== 'traite').length;
  const nouveauxSignalements = signalements.filter((s) => s.statut === 'nouveau').length;

  async function cycler(collectionRetours: typeof COLLECTION_AVIS | typeof COLLECTION_SIGNALEMENTS, id: string, courant: Statut) {
    const suivant = statutSuivant(courant);
    const maj = <T extends { id: string; statut: Statut }>(liste: T[]) =>
      liste.map((r) => (r.id === id ? { ...r, statut: suivant } : r));
    // Affichage immédiat, puis retour en arrière si l'écriture échoue.
    if (collectionRetours === COLLECTION_AVIS) setAvis(maj);
    else setSignalements(maj);
    const resultat = await changerStatut(collectionRetours, id, suivant);
    if (!resultat.success) {
      const annuler = <T extends { id: string; statut: Statut }>(liste: T[]) =>
        liste.map((r) => (r.id === id ? { ...r, statut: courant } : r));
      if (collectionRetours === COLLECTION_AVIS) setAvis(annuler);
      else setSignalements(annuler);
      ui.toast(resultat.error ?? 'Erreur', 'error');
    }
  }

  /** Copie le rapport (web) ou ouvre le menu de partage du système (téléphone). */
  async function exporter(seulementNouveaux: boolean) {
    const a = seulementNouveaux ? avis.filter((r) => r.statut === 'nouveau') : avis;
    const s = seulementNouveaux ? signalements.filter((r) => r.statut === 'nouveau') : signalements;
    if (a.length + s.length === 0) {
      ui.toast('Aucun retour à exporter.', 'error');
      return;
    }
    const rapport = construireRapport(a, s);
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(rapport);
        ui.toast('Rapport copié : collez-le dans Claude Code.', 'success');
      } else {
        await Share.share({ title: 'Retours Proserpine', message: rapport });
      }
    } catch {
      ui.toast("L'export n'a pas pu aboutir.", 'error');
    }
  }

  if (!estAdmin) {
    return (
      <View style={styles.page}>
        <Stack.Screen options={{ headerShown: false }} />
        <EnteteEcran titre="Administration" />
        <Text style={styles.vide}>Accès réservé à l'administrateur.</Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <Stack.Screen options={{ headerShown: false }} />
      <EnteteEcran titre="Administration" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.contenu}>
        <View style={styles.compteurs}>
          <Compteur valeur={String(avis.length)} titre="Avis" />
          <Compteur valeur={moyenne === null ? '—' : `${moyenne}/5`} titre="Note moyenne" />
          <Compteur valeur={String(nouveauxAvis + nouveauxSignalements)} titre="Nouveaux" />
          <Compteur valeur={String(bloquantsOuverts)} titre="Bloquants ouverts" alerte={bloquantsOuverts > 0} />
        </View>

        <View style={styles.actions}>
          <BoutonPrimaire onPress={() => exporter(true)} style={styles.action}>
            Exporter les nouveaux
          </BoutonPrimaire>
          <BoutonSecondaire onPress={() => exporter(false)} style={styles.action}>
            Tout exporter
          </BoutonSecondaire>
        </View>
        <Text style={styles.aide}>
          {Platform.OS === 'web'
            ? 'Le rapport est copié : collez-le ensuite dans une conversation Claude Code.'
            : 'Le menu de partage s\'ouvre : choisissez « Copier » ou envoyez-vous le rapport, puis collez-le dans Claude Code.'}{' '}
          Les {LIMITE_CHARGEMENT} retours les plus récents de chaque type sont chargés.
        </Text>

        <ChoixSegment etiquette="Retours" options={ONGLETS} valeur={onglet} onChange={setOnglet} />
        <ChoixPuces
          etiquette="Fonctionnalité"
          options={FILTRES_FONCTIONNALITE}
          valeur={filtreFonctionnalite}
          onChange={setFiltreFonctionnalite}
        />
        <ChoixPuces etiquette="Statut" options={FILTRES_STATUT} valeur={filtreStatut} onChange={setFiltreStatut} />

        <BoutonSecondaire onPress={charger} disabled={chargement} style={{ marginBottom: 16 }}>
          {chargement ? 'Chargement…' : 'Actualiser'}
        </BoutonSecondaire>

        {chargement ? <ActivityIndicator color={couleurs.marque} style={{ marginVertical: 24 }} /> : null}
        {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}

        {onglet === 'avis'
          ? avisAffiches.map((a) => (
              <View key={a.id} style={styles.carte}>
                <View style={styles.carteHaut}>
                  <Text style={styles.carteTitre}>
                    {libelle(FONCTIONNALITES, a.fonctionnalite)} · {libelle(TYPES_AVIS, a.type)} · {a.note}/5
                  </Text>
                  <PuceStatut statut={a.statut} onPress={() => cycler(COLLECTION_AVIS, a.id, a.statut)} />
                </View>
                {a.commentaire ? <Text style={styles.carteTexte}>{a.commentaire}</Text> : null}
                <Text style={styles.carteMeta}>
                  {dateCourte(a.creeLe)} · v{a.versionApp} · {a.plateforme}
                  {a.modeleAppareil ? ` · ${a.modeleAppareil}` : ''}
                </Text>
              </View>
            ))
          : signalementsAffiches.map((s) => (
              <View key={s.id} style={styles.carte}>
                <View style={styles.carteHaut}>
                  <Text style={[styles.carteTitre, s.gravite === 'bloquant' && { color: couleurs.statutDanger }]}>
                    {libelle(FONCTIONNALITES, s.fonctionnalite)} · {libelle(GRAVITES, s.gravite)}
                  </Text>
                  <PuceStatut statut={s.statut} onPress={() => cycler(COLLECTION_SIGNALEMENTS, s.id, s.statut)} />
                </View>
                {s.action ? <Text style={styles.carteMeta}>Faisait : {s.action}</Text> : null}
                <Text style={styles.carteTexte}>{s.description}</Text>
                <Text style={styles.carteMeta}>
                  {dateCourte(s.creeLe)} · v{s.versionApp} · {s.plateforme}
                  {s.modeleAppareil ? ` · ${s.modeleAppareil}` : ''}
                </Text>
              </View>
            ))}

        {!chargement && (onglet === 'avis' ? avisAffiches.length : signalementsAffiches.length) === 0 ? (
          <Text style={styles.vide}>Aucun retour avec ces filtres.</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fondCarte },
  contenu: { paddingHorizontal: 16, paddingBottom: 32 },
  compteurs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  compteur: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 12,
    backgroundColor: couleurs.fondGris,
    borderRadius: rayon.md,
  },
  compteurValeur: { fontFamily: police.extraGras, fontSize: tailleTexte.xl2, color: couleurs.marqueFoncee },
  compteurTitre: { fontFamily: police.semiGras, fontSize: tailleTexte.xxs, color: couleurs.texteAttenue, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  action: { flex: 1 },
  aide: { fontFamily: police.normal, fontSize: tailleTexte.sm, color: couleurs.texteAttenue, marginBottom: 16 },
  carte: {
    gap: 6,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon.md,
    backgroundColor: couleurs.fondCarte,
  },
  carteHaut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  carteTitre: { flex: 1, fontFamily: police.extraGras, fontSize: tailleTexte.md, color: couleurs.texte },
  carteTexte: { fontFamily: police.normal, fontSize: tailleTexte.md, color: couleurs.texte },
  carteMeta: { fontFamily: police.normal, fontSize: tailleTexte.sm, color: couleurs.texteAttenue },
  statut: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1.5, borderRadius: rayon.rond },
  statutTexte: { fontFamily: police.extraGras, fontSize: tailleTexte.sm },
  erreur: { fontFamily: police.semiGras, fontSize: tailleTexte.md, color: couleurs.statutDanger, marginBottom: 12 },
  vide: { fontFamily: police.normal, fontSize: tailleTexte.md, color: couleurs.texteAttenue, textAlign: 'center', marginTop: 24 },
});
