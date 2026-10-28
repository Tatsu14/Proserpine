/**
 * DONNER MON AVIS — formulaire de feedback ciblé : sur quoi porte l'avis (fonctionnalité),
 * quel type de retour, une note de 1 à 5 et un commentaire facultatif.
 * Les avis partent dans Firestore sans aucune donnée personnelle (voir services/retours.ts).
 */
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BoutonPrimaire } from '@/components/ui/boutons';
import { Champ } from '@/components/ui/champ';
import { ChoixNote, ChoixPuces, ChoixSegment } from '@/components/ui/choix-retour';
import { EnteteEcran } from '@/components/ui/menu';
import { Text } from '@/components/ui/texte';
import { useUi } from '@/components/ui/ui-provider';
import { couleurs, police, tailleTexte } from '@/design/tokens';
import {
  envoyerAvis,
  FONCTIONNALITES,
  LONGUEUR_MAX_AVIS,
  TYPES_AVIS,
  verifierAvis,
  type Fonctionnalite,
  type TypeAvis,
} from '@/services/retours';

export default function AvisScreen() {
  const router = useRouter();
  const ui = useUi();

  const [fonctionnalite, setFonctionnalite] = useState<Fonctionnalite | null>(null);
  const [type, setType] = useState<TypeAvis | null>(null);
  const [note, setNote] = useState(0);
  const [commentaire, setCommentaire] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const saisie = { fonctionnalite, type, note, commentaire };
  const pret = verifierAvis(saisie) === null && !envoi;

  async function envoyer() {
    if (!pret) return;
    setEnvoi(true);
    const resultat = await envoyerAvis(saisie);
    setEnvoi(false);
    if (resultat.success) {
      ui.toast('Merci pour votre avis !', 'success');
      router.back();
    } else {
      ui.toast(resultat.error ?? "L'envoi a échoué.", 'error');
    }
  }

  return (
    <View style={styles.page}>
      <Stack.Screen options={{ headerShown: false }} />
      <EnteteEcran titre="Donner mon avis" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.contenu}
      >
        <Text style={styles.intro}>
          Votre retour nous aide à améliorer Proserpine. Choisissez ce qui est concerné, puis dites-nous en plus.
        </Text>

        <ChoixPuces
          etiquette="Sur quoi porte votre avis ?"
          options={FONCTIONNALITES}
          valeur={fonctionnalite}
          onChange={setFonctionnalite}
        />
        <ChoixSegment etiquette="Type de retour" options={TYPES_AVIS} valeur={type} onChange={setType} />
        <ChoixNote etiquette="Votre note" valeur={note} onChange={setNote} />

        <Champ
          etiquette="Votre commentaire (facultatif)"
          multiligne
          value={commentaire}
          onChangeText={setCommentaire}
          maxLength={LONGUEUR_MAX_AVIS}
          placeholder="Qu'est-ce qui vous plaît, ou ce qui pourrait être mieux ?"
        />
        <Text style={styles.compteur}>
          {commentaire.length} / {LONGUEUR_MAX_AVIS}
        </Text>

        <Text style={styles.confidentialite}>
          Aucune information personnelle n'est envoyée. Nous joignons seulement la version de l'app et le type d'appareil.
        </Text>
        <BoutonPrimaire onPress={envoyer} disabled={!pret}>
          {envoi ? 'Envoi…' : 'Envoyer mon avis'}
        </BoutonPrimaire>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fondCarte },
  contenu: { paddingHorizontal: 16, paddingBottom: 32 },
  intro: { fontFamily: police.normal, fontSize: tailleTexte.md, color: couleurs.texteAttenue, marginBottom: 16 },
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
