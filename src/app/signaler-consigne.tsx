/**
 * SIGNALER UNE CONSIGNE FAUSSE — élément par élément (option A validée le 25/11/2026).
 *
 * Chaque élément affiché sur la fiche apparaît avec son bac : l'utilisateur laisse « C'est juste » ou choisit
 * le bon bac (ou « Je ne sais pas »). Il peut ajouter un élément manquant et un commentaire.
 * Un signalement sans aucune correction ni commentaire n'est pas envoyé : un message dit ce qu'il manque.
 * Envoi par la fonction serveur (services/signalements.ts).
 */
import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { RappelProduit, stylesSignalement, useProduitSignale } from '@/components/signalement/commun';
import { BoutonPrimaire } from '@/components/ui/boutons';
import { Champ } from '@/components/ui/champ';
import { ChoixPuces } from '@/components/ui/choix-retour';
import { EnteteEcran } from '@/components/ui/menu';
import { Text } from '@/components/ui/texte';
import { useUi } from '@/components/ui/ui-provider';
import { Icone } from '@/design/icones';
import { couleurs, police, rayon, tailleTexte } from '@/design/tokens';
import { messageErreur } from '@/services/api-proserpine';
import { majuscule } from '@/services/base-produits';
import {
  BACS_SIGNALEMENT,
  envoyerSignalementConsigne,
  libelleBacSignalement,
  LONGUEUR_MAX_TEXTE,
  MAX_ELEMENTS,
  type BacSignalement,
  type ElementSignale,
} from '@/services/signalements';

type Choix = 'ok' | 'inconnu' | BacSignalement;
type Ajout = { cle: number; nom: string; bac: 'inconnu' | BacSignalement };

const COULEUR_BAC: Record<BacSignalement, string> = {
  pmc: couleurs.bacPmc,
  paper: couleurs.bacPapier,
  glass: couleurs.bacVerre,
  organic: couleurs.bacOrganique,
  residual: couleurs.bacResiduel,
  danger: couleurs.bacDanger,
};

const OPTIONS_AJOUT = [...BACS_SIGNALEMENT, { id: 'inconnu', libelle: 'Je ne sais pas' }] as const;

export default function SignalerConsigneScreen() {
  const router = useRouter();
  const ui = useUi();
  const produit = useProduitSignale();

  const [choix, setChoix] = useState<Choix[]>(() => produit.elements.map(() => 'ok'));
  const [ajouts, setAjouts] = useState<Ajout[]>([]);
  const [commentaire, setCommentaire] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  // Le message d'erreur disparaît dès que l'utilisateur modifie son signalement.
  useEffect(() => setErreur(null), [choix, ajouts, commentaire]);
  const prochaineCle = useRef(1);

  const peutAjouter = produit.elements.length + ajouts.length < MAX_ELEMENTS;

  async function envoyer() {
    setErreur(null);
    if (ajouts.some((a) => a.nom.trim() === '')) {
      setErreur('Donnez un nom à l’élément ajouté, ou retirez-le.');
      return;
    }
    const elements: ElementSignale[] = [
      ...produit.elements.flatMap((e, i): ElementSignale[] =>
        choix[i] === 'ok'
          ? []
          : [{ nom: e.nom, bac_affiche: e.bac, bac_propose: choix[i] === 'inconnu' ? null : (choix[i] as BacSignalement), ajoute: false }],
      ),
      ...ajouts.map((a): ElementSignale => ({
        nom: majuscule(a.nom).slice(0, 100),
        bac_affiche: null,
        bac_propose: a.bac === 'inconnu' ? null : a.bac,
        ajoute: true,
      })),
    ];
    if (elements.length === 0 && commentaire.trim() === '') {
      setErreur(
        produit.elements.length > 0
          ? 'Votre signalement est vide : choisissez le bon bac pour au moins un élément, ajoutez un élément manquant ou écrivez un commentaire.'
          : 'Votre signalement est vide : ajoutez un élément manquant ou écrivez un commentaire.',
      );
      return;
    }
    setEnvoi(true);
    const r = await envoyerSignalementConsigne({
      ean: produit.ean,
      nomProduit: produit.nom,
      origine: produit.origine,
      elements,
      commentaire,
    });
    setEnvoi(false);
    if (r.ok) {
      ui.informer({
        titre: 'Merci pour votre signalement',
        message: 'Nous allons le vérifier et corriger la consigne si besoin.',
        bouton: 'Retour à la fiche',
        onFermer: () => (produit.ean ? router.dismissTo(`/produit/${produit.ean}`) : router.back()),
      });
    } else {
      setErreur(messageErreur(r.erreur));
    }
  }

  return (
    <View style={stylesSignalement.page}>
      <Stack.Screen options={{ headerShown: false }} />
      <EnteteEcran titre="Consigne fausse ?" />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={stylesSignalement.contenu}>
        <RappelProduit produit={produit} />
        <Text style={stylesSignalement.intro}>
          {produit.elements.length > 0
            ? 'Pour chaque élément, indiquez le bon bac si celui affiché est faux. Laissez « C’est juste » pour ceux qui sont corrects.'
            : 'Aucun élément n’est affiché pour ce produit. Ajoutez ceux que vous connaissez, avec leur bac.'}
        </Text>

        {produit.elements.map((e, i) => (
          <View key={`${e.nom}-${i}`} style={styles.element}>
            <View style={styles.elementHaut}>
              <View style={[styles.carre, { backgroundColor: COULEUR_BAC[e.bac] }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.elementNom}>{e.nom}</Text>
                <Text style={styles.elementMeta}>Affiché : {libelleBacSignalement(e.bac)}</Text>
              </View>
            </View>
            <ChoixPuces
              etiquette="Bon bac"
              options={[
                { id: 'ok', libelle: 'C’est juste' },
                ...BACS_SIGNALEMENT.filter((b) => b.id !== e.bac),
                { id: 'inconnu', libelle: 'Je ne sais pas' },
              ]}
              valeur={choix[i]}
              onChange={(c) => setChoix((cs) => cs.map((x, j) => (j === i ? (c as Choix) : x)))}
            />
          </View>
        ))}

        {ajouts.map((a, i) => (
          <View key={a.cle} style={styles.element}>
            <View style={styles.elementHaut}>
              <Text style={[styles.elementNom, { flex: 1 }]}>Élément manquant {ajouts.length > 1 ? i + 1 : ''}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retirer cet élément"
                onPress={() => setAjouts((as) => as.filter((x) => x.cle !== a.cle))}
                style={styles.retirer}
              >
                <Icone nom="delete_outline" taille={22} couleur={couleurs.statutDanger} />
                <Text style={styles.retirerTexte}>Retirer</Text>
              </Pressable>
            </View>
            <Champ
              etiquette="Élément"
              value={a.nom}
              onChangeText={(v) => setAjouts((as) => as.map((x) => (x.cle === a.cle ? { ...x, nom: v } : x)))}
              maxLength={100}
              placeholder="Ex. : opercule en aluminium"
            />
            <ChoixPuces
              etiquette="Bac"
              options={OPTIONS_AJOUT}
              valeur={a.bac}
              onChange={(b) => setAjouts((as) => as.map((x) => (x.cle === a.cle ? { ...x, bac: b } : x)))}
            />
          </View>
        ))}

        {peutAjouter ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setAjouts((as) => [...as, { cle: prochaineCle.current++, nom: '', bac: 'inconnu' }])}
            style={({ pressed }) => [styles.ajout, pressed && { opacity: 0.7 }]}
          >
            <Icone nom="add" taille={20} couleur={couleurs.texteAttenue} />
            <Text style={styles.ajoutTexte}>Il manque un élément</Text>
          </Pressable>
        ) : null}

        <Champ
          etiquette="Commentaire (facultatif)"
          multiligne
          value={commentaire}
          onChangeText={setCommentaire}
          maxLength={LONGUEUR_MAX_TEXTE}
          placeholder="Ex. : la boîte est en carton, elle va aux papiers."
        />
        <Text style={stylesSignalement.compteur}>
          {commentaire.length} / {LONGUEUR_MAX_TEXTE}
        </Text>

        {erreur ? (
          <Text style={stylesSignalement.erreur} accessibilityRole="alert">
            {erreur}
          </Text>
        ) : null}
        <Text style={stylesSignalement.confidentialite}>
          Votre signalement est lié à votre compte par un identifiant technique (ni nom ni e-mail), effacé 12 mois après
          son traitement, ou dès la suppression de votre compte.
        </Text>
        <BoutonPrimaire onPress={envoyer} disabled={envoi}>
          {envoi ? 'Envoi…' : 'Envoyer le signalement'}
        </BoutonPrimaire>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  element: {
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon.md,
    backgroundColor: couleurs.fondGris,
  },
  elementHaut: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  carre: { width: 12, height: 12, borderRadius: 3 },
  elementNom: { fontFamily: police.extraGras, fontSize: tailleTexte.md, color: couleurs.texte },
  elementMeta: { fontFamily: police.normal, fontSize: tailleTexte.sm, color: couleurs.texteAttenue },
  retirer: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingHorizontal: 8 },
  retirerTexte: { fontFamily: police.semiGras, fontSize: tailleTexte.sm, color: couleurs.statutDanger },
  ajout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 48,
    marginBottom: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: couleurs.fondPointille,
    borderRadius: rayon.md,
  },
  ajoutTexte: { fontFamily: police.gras, fontSize: tailleTexte.md, color: couleurs.texteAttenue },
});
