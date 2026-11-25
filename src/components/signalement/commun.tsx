/**
 * Éléments partagés par les trois écrans « Signaler une erreur » (choix, consigne, produit) :
 * lecture des paramètres de route, rappel du produit, styles.
 */
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/texte';
import { couleurs, police, rayon, tailleTexte } from '@/design/tokens';
import { lireElements, type ElementAffiche, type OrigineSignalement } from '@/services/signalements';

const ORIGINES: readonly OrigineSignalement[] = ['verifie', 'lu', 'deduit', 'choisi'];

function lireParam(valeur: string | string[] | undefined): string {
  return Array.isArray(valeur) ? (valeur[0] ?? '') : (valeur ?? '');
}

export type ProduitSignale = {
  ean: string;
  nom: string;
  marque: string;
  origine: OrigineSignalement | null;
  elements: ElementAffiche[];
  /** Paramètres à retransmettre tels quels d'un écran à l'autre. */
  params: Record<string, string>;
};

/** Le produit et sa consigne arrivent de la fiche par les paramètres de route : l'utilisateur ne retape rien. */
export function useProduitSignale(): ProduitSignale {
  const p = useLocalSearchParams<{ ean?: string; nom?: string; marque?: string; origine?: string; elements?: string }>();
  const params = {
    ean: lireParam(p.ean).replace(/\D/g, '').slice(0, 14),
    nom: lireParam(p.nom).slice(0, 150),
    marque: lireParam(p.marque).slice(0, 100),
    origine: lireParam(p.origine),
    elements: lireParam(p.elements),
  };
  return {
    ean: params.ean,
    nom: params.nom,
    marque: params.marque,
    origine: (ORIGINES as readonly string[]).includes(params.origine) ? (params.origine as OrigineSignalement) : null,
    elements: lireElements(params.elements),
    params,
  };
}

export function RappelProduit({ produit }: { produit: ProduitSignale }) {
  return (
    <View style={stylesSignalement.recap}>
      <Text style={stylesSignalement.recapProduit}>{produit.nom || 'Produit'}</Text>
      <Text style={stylesSignalement.recapMeta}>
        {produit.marque ? `${produit.marque} · ` : ''}
        {produit.ean || '—'}
      </Text>
    </View>
  );
}

export const stylesSignalement = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fondCarte },
  contenu: { paddingHorizontal: 16, paddingBottom: 32 },
  intro: { fontFamily: police.normal, fontSize: tailleTexte.md, color: couleurs.texteAttenue, marginBottom: 16, lineHeight: 21 },
  recap: { gap: 2, padding: 14, marginBottom: 20, backgroundColor: couleurs.fondGris, borderRadius: rayon.md },
  recapProduit: { fontFamily: police.extraGras, fontSize: tailleTexte.md, color: couleurs.texte },
  recapMeta: { fontFamily: police.normal, fontSize: tailleTexte.sm, color: couleurs.texteAttenue },
  etiquette: {
    fontFamily: police.semiGras,
    fontSize: tailleTexte.xs,
    letterSpacing: 0.7,
    color: couleurs.marqueSombre,
    marginBottom: 8,
  },
  erreur: { fontFamily: police.semiGras, fontSize: tailleTexte.sm, color: couleurs.statutDanger, marginBottom: 12 },
  confidentialite: { fontFamily: police.normal, fontSize: tailleTexte.sm, color: couleurs.texteAttenue, marginBottom: 12 },
  compteur: {
    fontFamily: police.normal,
    fontSize: tailleTexte.xs,
    color: couleurs.texteAttenue,
    textAlign: 'right',
    marginTop: -12,
    marginBottom: 16,
  },
});
