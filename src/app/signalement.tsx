/**
 * SIGNALER UN PROBLÈME — où le problème est apparu, sa gravité, ce que l'utilisateur faisait
 * et une description. Les signalements partent dans Firestore sans aucune donnée personnelle,
 * avec les informations techniques utiles pour reproduire le problème (voir services/retours.ts).
 */
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BoutonPrimaire } from '@/components/ui/boutons';
import { Champ } from '@/components/ui/champ';
import { ChoixCartes, ChoixPuces } from '@/components/ui/choix-retour';
import { EnteteEcran } from '@/components/ui/menu';
import { Text } from '@/components/ui/texte';
import { useUi } from '@/components/ui/ui-provider';
import { couleurs, police, tailleTexte } from '@/design/tokens';
import {
  envoyerSignalement,
  FONCTIONNALITES,
  GRAVITES,
  LONGUEUR_MAX_ACTION,
  LONGUEUR_MAX_DESCRIPTION,
  verifierSignalement,
  type Fonctionnalite,
  type Gravite,
} from '@/services/retours';

export default function SignalementScreen() {
  const router = useRouter();
  const ui = useUi();

  const [fonctionnalite, setFonctionnalite] = useState<Fonctionnalite | null>(null);
  const [gravite, setGravite] = useState<Gravite | null>(null);
  const [action, setAction] = useState('');
  const [description, setDescription] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const saisie = { fonctionnalite, gravite, action, description };
  const pret = verifierSignalement(saisie) === null && !envoi;

  async function envoyer() {
    if (!pret) return;
    setEnvoi(true);
    const resultat = await envoyerSignalement(saisie);
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
      <EnteteEcran titre="Signaler un problème" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.contenu}
      >
        <Text style={styles.intro}>
          Quelque chose ne fonctionne pas comme prévu ? Décrivez-le, nous le corrigerons.
        </Text>

        <ChoixPuces
          etiquette="Où le problème est-il apparu ?"
          options={FONCTIONNALITES}
          valeur={fonctionnalite}
          onChange={setFonctionnalite}
        />
        <ChoixCartes etiquette="Gravité" options={GRAVITES} valeur={gravite} onChange={setGravite} />

        <Champ
          etiquette="Que faisiez-vous ? (facultatif)"
          value={action}
          onChangeText={setAction}
          maxLength={LONGUEUR_MAX_ACTION}
          placeholder="Ex. : je cherchais un produit par son nom"
        />
        <Champ
          etiquette="Que s'est-il passé ?"
          multiligne
          value={description}
          onChangeText={setDescription}
          maxLength={LONGUEUR_MAX_DESCRIPTION}
          placeholder="Décrivez le problème : ce que vous attendiez et ce que vous avez vu."
        />
        <Text style={styles.compteur}>
          {description.length} / {LONGUEUR_MAX_DESCRIPTION}
        </Text>

        <Text style={styles.confidentialite}>
          Aucune information personnelle n'est envoyée. Nous joignons la version de l'app, le système et le modèle de
          l'appareil pour reproduire le problème.
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
