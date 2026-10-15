/**
 * CHOIX DE LA MATIÈRE — remplace le message sans issue « Pas assez de données ».
 *
 * Quand l'application ne sait rien de l'emballage, elle laisse l'utilisateur répondre en
 * DEUX temps : 1) la matière, 2) une question précise sur son état ou son type (un carton
 * gras ne va pas au papier, le verre se trie par couleur…). Les règles sont dans
 * `services/matieres.ts`. La consigne obtenue est étiquetée « Votre choix » (jamais présentée
 * comme lue sur l'emballage).
 *
 * Textes PROVISOIRES, à valider avec Monsieur.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { TexteMesure as Text } from '@/components/ui/texte';

import { couleurs, ombre, police, rayon, tailleTexte } from '@/design/tokens';
import { Icone } from '@/design/icones';
import { MATIERES, type Matiere, type ResultatMatiere } from '@/services/matieres';

export function ChoixMatiere({
  indetermine,
  onChoisir,
  onGuide,
}: {
  /** Texte de tri.js quand plusieurs emballages sont possibles (affiché au-dessus). */
  indetermine?: string | null;
  onChoisir: (resultat: ResultatMatiere) => void;
  /** « Je ne sais pas » : ouvre le guide du tri. */
  onGuide: () => void;
}) {
  // Matière choisie au premier temps (null = on est encore au premier temps).
  const [matiere, setMatiere] = useState<Matiere | null>(null);

  const choisirMatiere = (m: Matiere) => {
    // Pas de deuxième question : la matière donne toujours le même bac (ex. brique de boisson).
    if (!m.question) onChoisir(m.options[0].resultat);
    else setMatiere(m);
  };

  // ---------- Deuxième temps : la question précise ----------
  if (matiere) {
    return (
      <View style={styles.section}>
        <Pressable accessibilityRole="button" onPress={() => setMatiere(null)} style={styles.retour}>
          <Icone nom="arrow_back" taille={20} couleur="#00663A" />
          <Text style={styles.retourTexte}>Changer de matière</Text>
        </Pressable>
        <Text style={styles.titre}>{matiere.question}</Text>
        <Text style={styles.intro}>{matiere.nom}</Text>

        {matiere.options.map((o) => (
          <Pressable
            key={o.id}
            accessibilityRole="button"
            accessibilityLabel={o.detail ? `${o.libelle} : ${o.detail}` : o.libelle}
            onPress={() => onChoisir(o.resultat)}
            style={({ pressed }) => [styles.option, { opacity: pressed ? 0.8 : 1 }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.matiereNom}>{o.libelle}</Text>
              {o.detail ? <Text style={styles.matiereExemples}>{o.detail}</Text> : null}
            </View>
            <Icone nom="chevron_right" taille={24} couleur={couleurs.texteDiscret} />
          </Pressable>
        ))}
      </View>
    );
  }

  // ---------- Premier temps : la matière ----------
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
            onPress={() => choisirMatiere(m)}
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
  // Réponses du deuxième temps : une ligne pleine largeur chacune.
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 64,
    padding: 14,
    marginBottom: 10,
    backgroundColor: couleurs.fondCarte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon.md,
    boxShadow: ombre.sm,
  },
  retour: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, marginBottom: 4 },
  retourTexte: { fontFamily: police.extraGras, fontSize: tailleTexte.base, color: '#00663A' },
  astuce: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 10 },
  astuceTexte: { flex: 1, fontFamily: police.normal, fontSize: tailleTexte.base, color: couleurs.texteAttenue, lineHeight: 18 },
  gras: { fontFamily: police.gras },
});
