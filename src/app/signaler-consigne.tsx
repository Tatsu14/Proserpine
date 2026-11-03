/**
 * SIGNALER UNE CONSIGNE FAUSSE — ouvert depuis la fiche produit (lien sous « Où le jeter ? »).
 *
 * Le produit, la consigne affichée et son origine arrivent par les paramètres de la route :
 * l'utilisateur n'a rien à retaper. Il peut proposer le(s) bon(s) bac(s) et ajouter un commentaire
 * (tout est facultatif). Le signalement part dans Firestore sans donnée personnelle
 * (voir services/retours.ts) et apparaît dans l'écran Administration.
 */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BoutonPrimaire } from '@/components/ui/boutons';
import { Champ } from '@/components/ui/champ';
import { ChoixPucesMultiples } from '@/components/ui/choix-retour';
import { EnteteEcran } from '@/components/ui/menu';
import { Text } from '@/components/ui/texte';
import { useUi } from '@/components/ui/ui-provider';
import { couleurs, police, rayon, tailleTexte } from '@/design/tokens';
import {
  BACS,
  envoyerSignalementConsigne,
  LONGUEUR_MAX_COMMENTAIRE_CONSIGNE,
  ORIGINES_CONSIGNE,
  verifierConsigne,
  type Bac,
  type OrigineConsigne,
  type SaisieConsigne,
} from '@/services/retours';

const LIBELLE_ORIGINE: Record<OrigineConsigne, string> = {
  lu: 'Lue sur l’emballage',
  deduit: 'Déduite de la catégorie',
  choisi: 'Votre choix',
};

const titreBac = (id: string) => BACS.find((b) => b.id === id)?.libelle ?? id;

/** Lit un paramètre de route (texte) sans jamais planter sur une valeur inattendue. */
function lireParam(valeur: string | string[] | undefined): string {
  return Array.isArray(valeur) ? (valeur[0] ?? '') : (valeur ?? '');
}

export default function SignalerConsigneScreen() {
  const router = useRouter();
  const ui = useUi();
  const params = useLocalSearchParams<{
    ean?: string;
    nom?: string;
    bacs?: string; // ex. « pmc,paper »
    detail?: string; // ex. « Bouteille, Bouchon »
    origine?: string;
  }>();

  const ean = lireParam(params.ean);
  const nom = lireParam(params.nom);
  const detail = lireParam(params.detail);
  const triAffiche = lireParam(params.bacs)
    .split(',')
    .filter((b): b is Bac => BACS.some((x) => x.id === b));
  const origineParam = lireParam(params.origine) as OrigineConsigne;
  const origine: OrigineConsigne = ORIGINES_CONSIGNE.includes(origineParam) ? origineParam : 'lu';

  const [triSuggere, setTriSuggere] = useState<Bac[]>([]);
  const [commentaire, setCommentaire] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const saisie: SaisieConsigne = { ean, nom, triAffiche, detailAffiche: detail, origine, triSuggere, commentaire };
  const pret = verifierConsigne(saisie) === null && !envoi;

  async function envoyer() {
    if (!pret) return;
    setEnvoi(true);
    const resultat = await envoyerSignalementConsigne(saisie);
    setEnvoi(false);
    if (resultat.success) {
      ui.toast('Merci, votre signalement a bien été envoyé.', 'success');
      router.back();
    } else {
      ui.toast(resultat.error ?? "L'envoi a échoué.", 'error');
    }
  }

  return (
    <View style={styles.page}>
      <Stack.Screen options={{ headerShown: false }} />
      <EnteteEcran titre="Consigne fausse ?" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.contenu}
      >
        <Text style={styles.intro}>
          Cette consigne de tri ne correspond pas à ce que vous savez ? Dites-le-nous : nous la vérifierons.
        </Text>

        {/* Rappel de ce qui est contesté */}
        <View style={styles.recap}>
          <Text style={styles.recapProduit}>{nom || 'Produit'}</Text>
          <Text style={styles.recapMeta}>Code-barres : {ean || '—'}</Text>
          <Text style={styles.recapMeta}>
            Consigne affichée : {triAffiche.map(titreBac).join(', ') || '—'}
            {detail ? ` (${detail})` : ''}
          </Text>
          <Text style={styles.recapMeta}>Origine : {LIBELLE_ORIGINE[origine]}</Text>
        </View>

        <ChoixPucesMultiples
          etiquette="Où faut-il le jeter ? (facultatif)"
          options={BACS}
          valeur={triSuggere}
          onChange={setTriSuggere}
        />

        <Champ
          etiquette="Commentaire (facultatif)"
          multiligne
          value={commentaire}
          onChangeText={setCommentaire}
          maxLength={LONGUEUR_MAX_COMMENTAIRE_CONSIGNE}
          placeholder="Ex. : le bouchon va au PMC, pas aux résiduels."
        />
        <Text style={styles.compteur}>
          {commentaire.length} / {LONGUEUR_MAX_COMMENTAIRE_CONSIGNE}
        </Text>

        <Text style={styles.confidentialite}>
          Aucune information personnelle n'est envoyée : seulement le code du produit, la consigne affichée et votre
          proposition.
        </Text>
        <BoutonPrimaire onPress={envoyer} disabled={!pret}>
          {envoi ? 'Envoi…' : 'Envoyer le signalement'}
        </BoutonPrimaire>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fondCarte },
  contenu: { paddingHorizontal: 16, paddingBottom: 32 },
  intro: { fontFamily: police.normal, fontSize: tailleTexte.md, color: couleurs.texteAttenue, marginBottom: 16 },
  recap: {
    gap: 4,
    padding: 16,
    marginBottom: 16,
    backgroundColor: couleurs.fondGris,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon.md,
  },
  recapProduit: { fontFamily: police.extraGras, fontSize: tailleTexte.md, color: couleurs.texte },
  recapMeta: { fontFamily: police.normal, fontSize: tailleTexte.sm, color: couleurs.texteAttenue },
  compteur: {
    fontFamily: police.normal,
    fontSize: tailleTexte.xs,
    color: couleurs.texteAttenue,
    textAlign: 'right',
    marginTop: -12,
    marginBottom: 16,
  },
  confidentialite: { fontFamily: police.normal, fontSize: tailleTexte.sm, color: couleurs.texteAttenue, marginBottom: 12 },
});
