/**
 * CHOIX DE LA MATIÈRE — remplace le message sans issue « Pas assez de données ».
 *
 * Quand l'application ne sait rien de l'emballage, elle ne se contente plus de le
 * dire : elle laisse l'utilisateur choisir la matière en une touche, et lui donne
 * le bac correspondant. La consigne est alors étiquetée « Votre choix » (jamais
 * présentée comme lue sur l'emballage).
 *
 * Textes PROVISOIRES, à travailler avec Monsieur (et avec l'aide de trionsmieux.be
 * si Fost Plus l'accepte).
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { couleurs, ombre, police, rayon, tailleTexte } from '@/design/tokens';
import { Icone } from '@/design/icones';

/** Une matière proposée, avec le bac où elle va. */
export type Matiere = {
  id: string;
  nom: string;
  exemples: string;
  icone: string;
  /** Clé du bac (celles de tri.js : pmc, paper, glass…). */
  categorie: string;
};

// Liste de la maquette validée. Plastique, métal et briques vont tous au sac PMC.
export const MATIERES: Matiere[] = [
  { id: 'plastique', nom: 'Plastique', exemples: 'sachet, bouteille, pot', icone: 'inventory_2', categorie: 'pmc' },
  { id: 'carton', nom: 'Carton, papier', exemples: 'boîte, étui', icone: 'description', categorie: 'paper' },
  { id: 'metal', nom: 'Métal', exemples: 'canette, conserve', icone: 'settings', categorie: 'pmc' },
  { id: 'verre', nom: 'Verre', exemples: 'bocal, bouteille', icone: 'liquor', categorie: 'glass' },
  { id: 'brique', nom: 'Brique de boisson', exemples: 'lait, jus', icone: 'local_drink', categorie: 'pmc' },
];

export function ChoixMatiere({
  indetermine,
  onChoisir,
  onGuide,
}: {
  /** Texte de tri.js quand plusieurs emballages sont possibles (affiché au-dessus). */
  indetermine?: string | null;
  onChoisir: (matiere: Matiere) => void;
  /** « Je ne sais pas » : ouvre le guide du tri. */
  onGuide: () => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.titre}>Quelle est la matière ?</Text>
      <Text style={styles.intro}>
        {indetermine ??
          'Nous n’avons pas assez d’informations sur cet emballage. Choisissez la matière pour savoir où le jeter.'}
      </Text>

      <View style={styles.grille}>
        {MATIERES.map((m) => (
          <Pressable
            key={m.id}
            accessibilityRole="button"
            accessibilityLabel={`${m.nom} : ${m.exemples}`}
            onPress={() => onChoisir(m)}
            style={({ pressed }) => [styles.matiere, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Icone nom={m.icone} taille={28} couleur={couleurs.marque} />
            <Text style={styles.matiereNom}>{m.nom}</Text>
            <Text style={styles.matiereExemples}>{m.exemples}</Text>
          </Pressable>
        ))}

        <Pressable
          accessibilityRole="button"
          onPress={onGuide}
          style={({ pressed }) => [styles.matiere, styles.autre, { opacity: pressed ? 0.8 : 1 }]}
        >
          <Icone nom="help" taille={28} couleur={couleurs.marque} />
          <Text style={styles.matiereNom}>
            Je ne sais pas <Text style={styles.matiereExemples}>· voir le guide du tri</Text>
          </Text>
        </Pressable>
      </View>

      <View style={styles.astuce}>
        <Icone nom="lightbulb" taille={20} couleur={couleurs.marque} />
        <Text style={styles.astuceTexte}>
          Un paquet de chips ? C’est du <Text style={styles.gras}>plastique</Text>, pas de l’aluminium.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  titre: { fontFamily: police.extraGras, fontSize: tailleTexte.xl, color: couleurs.marqueSombre, marginBottom: 10 },
  intro: { fontFamily: police.normal, fontSize: tailleTexte.md, color: couleurs.texteAttenue, lineHeight: 20, marginBottom: 12 },
  grille: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  // Deux cartes par ligne : chacune prend un peu moins de la moitié de la largeur.
  matiere: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 84,
    padding: 12,
    gap: 4,
    backgroundColor: couleurs.fondCarte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon.md,
    boxShadow: ombre.sm,
  },
  matiereNom: { fontFamily: police.extraGras, fontSize: tailleTexte.md, color: couleurs.texte },
  matiereExemples: { fontFamily: police.normal, fontSize: tailleTexte.sm, color: couleurs.texteAttenue },
  autre: { flexBasis: '100%', minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10 },
  astuce: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 10 },
  astuceTexte: { flex: 1, fontFamily: police.normal, fontSize: tailleTexte.base, color: couleurs.texteAttenue, lineHeight: 18 },
  gras: { fontFamily: police.gras },
});
