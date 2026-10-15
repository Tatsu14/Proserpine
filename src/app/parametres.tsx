/**
 * PARAMÈTRES — repris de `pages/parametres.html` + `js/pages/parametres.js` de ProserpineV2
 * (version locale validée) : deux réglages d'affichage, mémorisés sur l'appareil.
 *   - la taille du texte (3 choix exclusifs) ;
 *   - l'affichage de l'indice d'impact (interrupteur).
 * Le changement s'applique immédiatement, on le voit sur cette page même.
 *
 * Pas de thème sombre : décision de Monsieur.
 */
import { Stack } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { EnteteEcran, GroupeMenu, Indication, LigneMenu, TitreSection } from '@/components/ui/menu';
import { Text } from '@/components/ui/texte';
import { TAILLES_TEXTE, useReglages } from '@/contexts/reglages';
import { couleurs, ombre, police, rayon, tailleTexte } from '@/design/tokens';

export default function ParametresScreen() {
  const { tailleTexte: tailleActive, definirTailleTexte, indiceActif, definirIndiceActif } = useReglages();

  return (
    <View style={styles.page}>
      <Stack.Screen options={{ headerShown: false }} />
      <EnteteEcran titre="Paramètres" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <TitreSection>Affichage</TitreSection>
        <GroupeMenu>
          {/* Taille du texte : trois choix exclusifs (.choix-segment) */}
          <LigneMenu
            icone="text_fields"
            libelle="Taille du texte"
            droite={<View />}
            dessous={
              <View style={styles.segment} accessibilityRole="radiogroup">
                {TAILLES_TEXTE.map((t) => {
                  const actif = t.id === tailleActive;
                  return (
                    <Pressable
                      key={t.id}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: actif }}
                      onPress={() => definirTailleTexte(t.id)}
                      style={[styles.segmentBouton, actif && styles.segmentBoutonActif]}
                    >
                      <Text style={[styles.segmentTexte, actif && { color: couleurs.marqueFoncee }]}>{t.libelle}</Text>
                    </Pressable>
                  );
                })}
              </View>
            }
          />

          {/* Indice d'impact : interrupteur */}
          <LigneMenu
            icone="insights"
            libelle="Afficher l'indice d'impact"
            droite={
              <Switch
                value={indiceActif}
                onValueChange={definirIndiceActif}
                accessibilityLabel="Afficher l'indice d'impact"
                trackColor={{ false: couleurs.bordure, true: couleurs.marque }}
                thumbColor="#FFFFFF"
                // Sur le web, la couleur du rond actif se règle avec cette propriété (absente des types natifs).
                {...({ activeThumbColor: "#FFFFFF" } as object)}
              />
            }
          />
        </GroupeMenu>
        <Indication>
          Vos produits restent enregistrés, l'indice est simplement masqué. Les consignes de tri restent toujours
          affichées.
        </Indication>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fondCarte },
  // .choix-segment : fond gris, bouton actif en blanc avec une ombre légère
  segment: { flexDirection: 'row', gap: 4, padding: 4, backgroundColor: couleurs.fondGris, borderRadius: rayon.sm },
  segmentBouton: { flex: 1, paddingVertical: 8, paddingHorizontal: 4, borderRadius: rayon.xs, alignItems: 'center' },
  segmentBoutonActif: { backgroundColor: couleurs.fondCarte, boxShadow: ombre.sm },
  segmentTexte: { fontFamily: police.semiGras, fontSize: tailleTexte.sm, color: couleurs.texteAttenue },
});
