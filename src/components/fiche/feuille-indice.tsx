/**
 * FEUILLE « Pourquoi cette note ? » — les détails de l'indice d'impact quittent la
 * fiche et s'ouvrent À LA DEMANDE, dans une feuille qui monte du bas de l'écran
 * (composant commun <FeuilleBas>, sans fenêtre système : pas d'écran noir à l'ouverture).
 */
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { TexteMesure as Text } from '@/components/ui/texte';

import { FeuilleBas } from '@/components/ui/feuille-bas';
import { couleurs, police, tailleTexte } from '@/design/tokens';
import { Icone } from '@/design/icones';

/** Un point qui fait varier l'indice (forme renvoyée par ecoscore.js). */
export type Facteur = { label: string; impact: number; explication: string };

function LigneFacteur({ facteur }: { facteur: Facteur }) {
  const [ouvert, setOuvert] = useState(false);
  const negatif = facteur.impact < 0;
  // Le signe moins typographique « − » est plus lisible que le trait d'union.
  const impact = `${negatif ? '−' : '+'}${Math.abs(facteur.impact)}`;
  const teinte = negatif ? couleurs.statutDanger : couleurs.statutBon;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: ouvert }}
      onPress={() => setOuvert((o) => !o)}
      style={styles.facteur}
    >
      <View style={styles.facteurTete}>
        <View style={[styles.point, { backgroundColor: teinte }]} />
        <Text style={styles.facteurLabel}>{facteur.label}</Text>
        <Text style={[styles.facteurImpact, { color: teinte }]}>{impact}</Text>
        <Icone nom={ouvert ? 'expand_less' : 'expand_more'} taille={24} couleur={couleurs.texteDiscret} />
      </View>
      {ouvert ? <Text style={styles.facteurExplication}>{facteur.explication}</Text> : null}
    </Pressable>
  );
}

export function FeuilleIndice({
  visible,
  onFermer,
  facteurs,
  paysOrigine,
}: {
  visible: boolean;
  onFermer: () => void;
  facteurs: Facteur[];
  /** Pays de fabrication, s'il est connu : simple information, sans effet affiché sur la note. */
  paysOrigine?: string | null;
}) {
  return (
    <FeuilleBas
      visible={visible}
      onFermer={onFermer}
      titre="Pourquoi cette note ?"
      sousTitre="Les points qui font varier l’indice d’impact de ce produit."
    >
      {facteurs.length > 0 ? (
        facteurs.map((f) => <LigneFacteur key={f.label} facteur={f} />)
      ) : (
        // Aucun facteur propre à Proserpine : la note vient entièrement de la base de données.
        <Text style={styles.aucun}>
          Cette note vient de l’indice calculé par Open Food Facts (analyse du cycle de vie du produit). Aucun autre
          point n’a été relevé pour l’ajuster.
        </Text>
      )}

      {paysOrigine ? (
        <View style={styles.facteur}>
          <View style={styles.facteurTete}>
            <View style={[styles.point, { backgroundColor: couleurs.texteDiscret }]} />
            <Text style={[styles.facteurLabel, { color: couleurs.texteAttenue }]}>Pays de fabrication : {paysOrigine}</Text>
          </View>
        </View>
      ) : null}
    </FeuilleBas>
  );
}

const styles = StyleSheet.create({
  facteur: { borderBottomWidth: 1, borderBottomColor: couleurs.bordure, minHeight: 52, justifyContent: 'center', paddingVertical: 6 },
  facteurTete: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  point: { width: 10, height: 10, borderRadius: 5 },
  facteurLabel: { flex: 1, fontFamily: police.semiGras, fontSize: tailleTexte.md, color: couleurs.texte },
  facteurImpact: { fontFamily: police.extraGras, fontSize: tailleTexte.md },
  facteurExplication: {
    fontFamily: police.normal,
    fontSize: tailleTexte.base,
    color: couleurs.texteAttenue,
    lineHeight: 19,
    marginTop: 8,
    marginLeft: 20,
  },
  aucun: { fontFamily: police.normal, fontSize: tailleTexte.md, color: couleurs.texteAttenue, lineHeight: 20, paddingVertical: 8 },
});
