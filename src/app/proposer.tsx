/**
 * PROPOSER UN PRODUIT — ouvert depuis « Produit non trouvé » (scanner) ou l'écran « Produit introuvable ».
 *
 * Ce que l'utilisateur envoie :
 *  - le code-barres, PRÉ-REMPLI mais modifiable : la caméra a pu mal lire, d'où l'avertissement toujours
 *    visible « Assurez-vous que le code renseigné correspond bien à celui du produit » ; la clé du code est
 *    contrôlée tout de suite (une faute de frappe est signalée avant l'envoi) ;
 *  - le nom (obligatoire) et la marque (facultative) ;
 *  - les emballages, FACULTATIFS : pour chaque élément, son nom, sa partie et son bac (« Je ne sais pas » possible).
 *
 * L'envoi passe par la fonction serveur (services/api-proserpine.ts). Rien n'est publié directement :
 * l'équipe relit chaque proposition dans l'écran Administration avant d'ajouter le produit.
 */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BoutonPrimaire, BoutonSecondaire } from '@/components/ui/boutons';
import { Champ } from '@/components/ui/champ';
import { ChoixPuces } from '@/components/ui/choix-retour';
import { EnteteEcran } from '@/components/ui/menu';
import { Text } from '@/components/ui/texte';
import { useUi } from '@/components/ui/ui-provider';
import { Icone } from '@/design/icones';
import { couleurs, police, rayon, tailleTexte } from '@/design/tokens';
import { appelerApi, messageErreur } from '@/services/api-proserpine';
import { BACS_BASE, COUCHES, type BacBase, type Couche } from '@/services/base-produits';
import { cleEanValide } from '@/services/ean';

const MAX_EMBALLAGES = 8;

type ChoixBac = BacBase | 'inconnu';
type Ligne = { cle: number; nom: string; couche: Couche; bac: ChoixBac };

const OPTIONS_BACS = [...BACS_BASE.map((b) => ({ id: b.id, libelle: b.libelle })), { id: 'inconnu', libelle: 'Je ne sais pas' }] as const;

function lireParam(valeur: string | string[] | undefined): string {
  return Array.isArray(valeur) ? (valeur[0] ?? '') : (valeur ?? '');
}

export default function ProposerScreen() {
  const router = useRouter();
  const ui = useUi();
  const params = useLocalSearchParams<{ ean?: string }>();

  const [ean, setEan] = useState(lireParam(params.ean).replace(/\D/g, '').slice(0, 14));
  const [eanTouche, setEanTouche] = useState(false);
  const [nom, setNom] = useState('');
  const [nomTouche, setNomTouche] = useState(false);
  const [marque, setMarque] = useState('');
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [envoi, setEnvoi] = useState(false);
  const [essai, setEssai] = useState(false); // l'utilisateur a tenté d'envoyer : on montre ce qui manque
  const prochaineCle = useRef(1);

  const eanValide = cleEanValide(ean);
  const nomValide = nom.trim().length >= 2 && nom.trim().length <= 150;
  const lignesValides = lignes.every((l) => l.nom.trim().length >= 1);
  const pret = eanValide && nomValide && lignesValides && !envoi;

  const ajouterLigne = () => {
    if (lignes.length >= MAX_EMBALLAGES) return;
    setLignes((ls) => [...ls, { cle: prochaineCle.current++, nom: '', couche: ls.length === 0 ? 'contenant' : 'autre', bac: 'inconnu' }]);
  };
  const modifierLigne = (cle: number, modif: Partial<Ligne>) =>
    setLignes((ls) => ls.map((l) => (l.cle === cle ? { ...l, ...modif } : l)));
  const retirerLigne = (cle: number) => setLignes((ls) => ls.filter((l) => l.cle !== cle));

  async function envoyer() {
    setEssai(true);
    setEanTouche(true);
    setNomTouche(true);
    if (!pret) return;
    setEnvoi(true);
    const r = await appelerApi('proposer', {
      ean,
      nom: nom.trim(),
      marque: marque.trim() || null,
      emballages: lignes.length
        ? lignes.map((l) => ({ nom: l.nom.trim(), couche: l.couche, bac: l.bac === 'inconnu' ? null : l.bac }))
        : null,
    });
    setEnvoi(false);
    if (r.ok) {
      ui.informer({
        titre: 'Merci pour votre proposition',
        message: 'Elle a bien été envoyée. Nous la vérifierons avant d’ajouter le produit à Proserpine.',
        bouton: 'Retour au scanner',
        onFermer: () => router.replace('/(tabs)/scan'),
      });
    } else {
      ui.toast(messageErreur(r.erreur), 'error');
    }
  }

  return (
    <View style={styles.page}>
      <Stack.Screen options={{ headerShown: false }} />
      <EnteteEcran titre="Proposer un produit" />

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.contenu}>
        <Text style={styles.intro}>
          {'Ce produit n’est pas encore dans Proserpine. Proposez-le : nous le vérifierons avant de l’ajouter pour tout le monde.'}
        </Text>

        <Champ
          etiquette="Code-barres"
          value={ean}
          onChangeText={(v) => setEan(v.replace(/\D/g, '').slice(0, 14))}
          onBlur={() => setEanTouche(true)}
          keyboardType="number-pad"
          maxLength={14}
          invalide={eanTouche && !eanValide}
          erreur="Ce numéro ne semble pas correct : vérifiez les chiffres imprimés sous le code-barres."
          placeholder="Ex. : 5410000000000"
        />
        <View style={styles.avertissement} accessibilityRole="alert">
          <Icone nom="warning" taille={20} couleur="#8A5300" />
          <Text style={styles.avertissementTexte}>
            Assurez-vous que le code renseigné correspond bien à celui du produit.
          </Text>
        </View>

        <Champ
          etiquette="Nom du produit"
          value={nom}
          onChangeText={setNom}
          onBlur={() => setNomTouche(true)}
          maxLength={150}
          invalide={nomTouche && !nomValide}
          erreur="Indiquez le nom du produit (2 caractères au moins)."
          placeholder="Ex. : Biscuits au beurre"
        />
        <Champ
          etiquette="Marque (facultatif)"
          value={marque}
          onChangeText={setMarque}
          maxLength={100}
          placeholder="Ex. : Maison Dupont"
        />

        <Text style={styles.sousTitre}>Emballages (facultatif)</Text>
        <Text style={styles.aide}>
          Indiquez les éléments de l’emballage (bouteille, bouchon, film…) et, si vous le savez, leur bac.
        </Text>

        {lignes.map((l, i) => (
          <View key={l.cle} style={styles.ligne}>
            <View style={styles.ligneHaut}>
              <Text style={styles.ligneTitre}>Élément {i + 1}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Retirer l’élément ${i + 1}`}
                onPress={() => retirerLigne(l.cle)}
                style={styles.retirer}
              >
                <Icone nom="delete_outline" taille={22} couleur={couleurs.statutDanger} />
                <Text style={styles.retirerTexte}>Retirer</Text>
              </Pressable>
            </View>
            <Champ
              etiquette="Élément"
              value={l.nom}
              onChangeText={(v) => modifierLigne(l.cle, { nom: v })}
              maxLength={100}
              invalide={essai && l.nom.trim().length === 0}
              erreur="Décrivez l’élément, ou retirez-le."
              placeholder="Ex. : bouteille en plastique"
            />
            <ChoixPuces etiquette="Partie" options={COUCHES} valeur={l.couche} onChange={(c) => modifierLigne(l.cle, { couche: c })} />
            <ChoixPuces etiquette="Bac" options={OPTIONS_BACS} valeur={l.bac} onChange={(b) => modifierLigne(l.cle, { bac: b })} />
          </View>
        ))}

        {lignes.length < MAX_EMBALLAGES ? (
          <BoutonSecondaire onPress={ajouterLigne} style={{ marginBottom: 16 }}>
            {lignes.length === 0 ? 'Ajouter un élément d’emballage' : 'Ajouter un autre élément'}
          </BoutonSecondaire>
        ) : (
          <Text style={styles.aide}>{MAX_EMBALLAGES} éléments au plus.</Text>
        )}

        <Text style={styles.confidentialite}>
          Pour éviter les abus, votre proposition est liée à votre compte par un identifiant technique (ni nom ni
          e-mail), effacé 12 mois après l’examen de la proposition, ou dès la suppression de votre compte.
        </Text>
        <BoutonPrimaire onPress={envoyer} disabled={envoi}>
          {envoi ? 'Envoi…' : 'Envoyer la proposition'}
        </BoutonPrimaire>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fondCarte },
  contenu: { paddingHorizontal: 16, paddingBottom: 32 },
  intro: { fontFamily: police.normal, fontSize: tailleTexte.md, color: couleurs.texteAttenue, marginBottom: 16 },
  avertissement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    marginTop: -4,
    marginBottom: 16,
    backgroundColor: couleurs.statutAttentionFond,
    borderRadius: rayon.md,
  },
  avertissementTexte: { flex: 1, fontFamily: police.semiGras, fontSize: tailleTexte.sm, color: '#8A5300' },
  sousTitre: { fontFamily: police.extraGras, fontSize: tailleTexte.lg, color: couleurs.texte, marginTop: 8, marginBottom: 4 },
  aide: { fontFamily: police.normal, fontSize: tailleTexte.sm, color: couleurs.texteAttenue, marginBottom: 12 },
  ligne: {
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon.md,
    backgroundColor: couleurs.fondGris,
  },
  ligneHaut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  ligneTitre: { fontFamily: police.extraGras, fontSize: tailleTexte.md, color: couleurs.texte },
  retirer: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingHorizontal: 8 },
  retirerTexte: { fontFamily: police.semiGras, fontSize: tailleTexte.sm, color: couleurs.statutDanger },
  confidentialite: { fontFamily: police.normal, fontSize: tailleTexte.sm, color: couleurs.texteAttenue, marginBottom: 12 },
});
