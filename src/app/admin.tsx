/**
 * ADMINISTRATION — réservé au compte administrateur (aussi accessible sur le site web, /admin).
 *
 * Trois sections :
 *  - Propositions : les produits proposés par les utilisateurs (accepter / refuser avec motif) ;
 *  - Produits : chercher un produit de la base, le corriger, saisir ses emballages (consigne « Vérifié par Proserpine ») ;
 *  - Retours : avis, signalements et consignes signalées (Firestore), avec l'export de rapport.
 *
 * L'entrée du Profil n'est qu'un raccourci : la vraie protection est côté serveur (fonction proserpine-api
 * pour la base, règles Firestore pour les retours). Un autre compte qui forcerait l'écran ne pourrait rien lire.
 */
import { Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SectionProduits } from '@/components/admin/section-produits';
import { SectionPropositions } from '@/components/admin/section-propositions';
import { SectionRetours } from '@/components/admin/section-retours';
import { ChoixSegment } from '@/components/ui/choix-retour';
import { EnteteEcran } from '@/components/ui/menu';
import { Text } from '@/components/ui/texte';
import { UID_ADMIN } from '@/constants/admin';
import { useAuth } from '@/contexts/auth';
import { couleurs, police, tailleTexte } from '@/design/tokens';

type Section = 'propositions' | 'produits' | 'retours';

const SECTIONS = [
  { id: 'propositions', libelle: 'Propositions' },
  { id: 'produits', libelle: 'Produits' },
  { id: 'retours', libelle: 'Retours' },
] as const;

export default function AdminScreen() {
  const { user } = useAuth();
  const [section, setSection] = useState<Section>('propositions');

  if (user?.uid !== UID_ADMIN) {
    return (
      <View style={styles.page}>
        <Stack.Screen options={{ headerShown: false }} />
        <EnteteEcran titre="Administration" />
        <Text style={styles.vide}>Accès réservé à l&apos;administrateur.</Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <Stack.Screen options={{ headerShown: false }} />
      <EnteteEcran titre="Administration" />
      {/* Sur ordinateur, la colonne reste lisible au lieu de s'étirer sur tout l'écran. */}
      <View style={styles.colonne}>
        <View style={styles.choix}>
          <ChoixSegment etiquette="Section" options={SECTIONS} valeur={section} onChange={setSection} />
        </View>
        <View style={styles.corps}>
          {section === 'propositions' ? <SectionPropositions /> : null}
          {section === 'produits' ? <SectionProduits /> : null}
          {section === 'retours' ? <SectionRetours /> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fondCarte },
  colonne: { flex: 1, width: '100%', maxWidth: 900, alignSelf: 'center' },
  choix: { paddingHorizontal: 16 },
  corps: { flex: 1 },
  vide: { fontFamily: police.normal, fontSize: tailleTexte.md, color: couleurs.texteAttenue, textAlign: 'center', marginTop: 24 },
});
