/**
 * SIGNALER DES INFORMATIONS FAUSSES SUR LE PRODUIT (option A validée le 25/11/2026) :
 * nom, marque, quantité, ou le code-barres correspond à un autre produit. L'utilisateur coche ce qui est faux et
 * peut écrire la bonne information. Un signalement vide n'est pas envoyé : un message dit ce qu'il manque.
 */
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { RappelProduit, stylesSignalement, useProduitSignale } from '@/components/signalement/commun';
import { BoutonPrimaire } from '@/components/ui/boutons';
import { Champ } from '@/components/ui/champ';
import { EnteteEcran } from '@/components/ui/menu';
import { Text } from '@/components/ui/texte';
import { useUi } from '@/components/ui/ui-provider';
import { Icone } from '@/design/icones';
import { couleurs, police, rayon, tailleTexte } from '@/design/tokens';
import { messageErreur } from '@/services/api-proserpine';
import { CHAMPS_PRODUIT, envoyerSignalementProduit, LONGUEUR_MAX_TEXTE, type ChampProduit } from '@/services/signalements';

export default function SignalerProduitScreen() {
  const router = useRouter();
  const ui = useUi();
  const produit = useProduitSignale();

  const [champs, setChamps] = useState<ChampProduit[]>([]);
  const [correction, setCorrection] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  // Le message d'erreur disparaît dès que l'utilisateur modifie son signalement.
  useEffect(() => setErreur(null), [champs, correction]);

  const basculer = (id: ChampProduit) => setChamps((cs) => (cs.includes(id) ? cs.filter((c) => c !== id) : [...cs, id]));

  async function envoyer() {
    setErreur(null);
    if (champs.length === 0 && correction.trim() === '') {
      setErreur('Votre signalement est vide : cochez ce qui est faux, ou écrivez la bonne information.');
      return;
    }
    setEnvoi(true);
    const r = await envoyerSignalementProduit({ ean: produit.ean, nomProduit: produit.nom, champs, correction });
    setEnvoi(false);
    if (r.ok) {
      ui.informer({
        titre: 'Merci pour votre signalement',
        message: 'Nous allons le vérifier et corriger la fiche si besoin.',
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
      <EnteteEcran titre="Produit incorrect ?" />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={stylesSignalement.contenu}>
        <RappelProduit produit={produit} />
        <Text style={stylesSignalement.etiquette}>{'QU’EST-CE QUI EST FAUX ?'}</Text>
        <View style={{ marginBottom: 20 }}>
          {CHAMPS_PRODUIT.map((c) => {
            const coche = champs.includes(c.id);
            return (
              <Pressable
                key={c.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: coche }}
                onPress={() => basculer(c.id)}
                style={styles.ligne}
              >
                <View style={[styles.case, coche && styles.caseCochee]}>
                  {coche ? <Icone nom="check" taille={16} couleur={couleurs.texteSurSombre} /> : null}
                </View>
                <Text style={styles.libelle}>{c.libelle}</Text>
              </Pressable>
            );
          })}
        </View>

        <Champ
          etiquette="La bonne information (facultatif)"
          multiligne
          value={correction}
          onChangeText={setCorrection}
          maxLength={LONGUEUR_MAX_TEXTE}
          placeholder="Ex. : Smacks 375 g, de Kellogg’s"
        />
        <Text style={stylesSignalement.compteur}>
          {correction.length} / {LONGUEUR_MAX_TEXTE}
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
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  case: {
    width: 22,
    height: 22,
    borderRadius: rayon.sm - 2,
    borderWidth: 2,
    borderColor: couleurs.texteDiscret,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caseCochee: { backgroundColor: couleurs.marque, borderColor: couleurs.marque },
  libelle: { flex: 1, fontFamily: police.semiGras, fontSize: tailleTexte.md, color: couleurs.texte },
});
