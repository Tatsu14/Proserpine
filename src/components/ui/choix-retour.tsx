/**
 * CHOIX DES FORMULAIRES DE RETOUR (avis et signalement) :
 *   - ChoixPuces    : une seule réponse parmi plusieurs « puces » (fonctionnalité concernée) ;
 *   - ChoixSegment  : une seule réponse dans un bandeau segmenté (même style que les Paramètres) ;
 *   - ChoixNote     : note de 1 à 5 étoiles ;
 *   - ChoixCartes   : une seule réponse parmi des cartes avec explication (gravité).
 * Chaque bloc porte son étiquette en capitales, comme `Champ`.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/texte';
import { Icone } from '@/design/icones';
import { couleurs, ombre, police, rayon, tailleTexte } from '@/design/tokens';

type Option<T extends string> = { id: T; libelle: string; description?: string };

type PropsChoix<T extends string> = {
  etiquette: string;
  options: readonly Option<T>[];
  valeur: T | null;
  onChange: (id: T) => void;
};

function Etiquette({ children }: { children: string }) {
  return <Text style={styles.etiquette}>{children.toUpperCase()}</Text>;
}

export function ChoixPuces<T extends string>({ etiquette, options, valeur, onChange }: PropsChoix<T>) {
  return (
    <View style={styles.bloc}>
      <Etiquette>{etiquette}</Etiquette>
      <View style={styles.puces}>
        {options.map((o) => {
          const actif = o.id === valeur;
          return (
            <Pressable
              key={o.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: actif }}
              onPress={() => onChange(o.id)}
              style={[styles.puce, actif && styles.puceActive]}
            >
              <Text style={[styles.puceTexte, actif && styles.puceTexteActif]}>{o.libelle}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function ChoixSegment<T extends string>({ etiquette, options, valeur, onChange }: PropsChoix<T>) {
  return (
    <View style={styles.bloc}>
      <Etiquette>{etiquette}</Etiquette>
      <View style={styles.segment} accessibilityRole="radiogroup">
        {options.map((o) => {
          const actif = o.id === valeur;
          return (
            <Pressable
              key={o.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: actif }}
              onPress={() => onChange(o.id)}
              style={[styles.segmentBouton, actif && styles.segmentBoutonActif]}
            >
              <Text style={[styles.segmentTexte, actif && { color: couleurs.marqueFoncee }]}>{o.libelle}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function ChoixNote({ etiquette, valeur, onChange }: { etiquette: string; valeur: number; onChange: (n: number) => void }) {
  return (
    <View style={styles.bloc}>
      <Etiquette>{etiquette}</Etiquette>
      <View style={styles.etoiles} accessibilityRole="radiogroup">
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            accessibilityRole="radio"
            accessibilityLabel={n === 1 ? '1 étoile' : `${n} étoiles`}
            accessibilityState={{ selected: n === valeur }}
            onPress={() => onChange(n)}
            style={styles.etoile}
          >
            <Icone
              nom={n <= valeur ? 'star' : 'star_border'}
              taille={36}
              couleur={n <= valeur ? couleurs.marque : couleurs.texteDiscret}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function ChoixCartes<T extends string>({ etiquette, options, valeur, onChange }: PropsChoix<T>) {
  return (
    <View style={styles.bloc}>
      <Etiquette>{etiquette}</Etiquette>
      <View style={styles.cartes} accessibilityRole="radiogroup">
        {options.map((o) => {
          const actif = o.id === valeur;
          const danger = o.id === 'bloquant';
          return (
            <Pressable
              key={o.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: actif }}
              onPress={() => onChange(o.id)}
              style={[
                styles.carte,
                actif && (danger ? styles.carteDanger : styles.carteActive),
              ]}
            >
              <Text
                style={[
                  styles.carteTitre,
                  actif && { color: danger ? couleurs.statutDanger : couleurs.marqueFoncee },
                ]}
              >
                {o.libelle}
              </Text>
              {o.description ? <Text style={styles.carteDescription}>{o.description}</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bloc: { marginBottom: 16, gap: 8 },
  etiquette: { fontFamily: police.semiGras, fontSize: tailleTexte.xs, color: couleurs.marqueSombre, letterSpacing: 0.55 },

  puces: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  puce: {
    minHeight: 44,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: couleurs.bordure,
    backgroundColor: couleurs.fondGris,
    borderRadius: rayon.rond,
  },
  puceActive: { borderColor: couleurs.marque, backgroundColor: couleurs.marqueClaire },
  puceTexte: { fontFamily: police.semiGras, fontSize: tailleTexte.md, color: couleurs.texteAttenue },
  puceTexteActif: { fontFamily: police.extraGras, color: couleurs.marqueFoncee },

  segment: { flexDirection: 'row', gap: 4, padding: 4, backgroundColor: couleurs.fondGris, borderRadius: rayon.sm },
  segmentBouton: { flex: 1, minHeight: 44, justifyContent: 'center', paddingHorizontal: 4, borderRadius: rayon.xs, alignItems: 'center' },
  segmentBoutonActif: { backgroundColor: couleurs.fondCarte, boxShadow: ombre.sm },
  segmentTexte: { fontFamily: police.semiGras, fontSize: tailleTexte.sm, color: couleurs.texteAttenue },

  etoiles: { flexDirection: 'row', gap: 8 },
  etoile: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  cartes: { flexDirection: 'row', gap: 8 },
  carte: {
    flex: 1,
    minHeight: 44,
    gap: 2,
    padding: 12,
    borderWidth: 1.5,
    borderColor: couleurs.bordure,
    backgroundColor: couleurs.fondGris,
    borderRadius: rayon.md,
  },
  carteActive: { borderColor: couleurs.marque, backgroundColor: couleurs.marqueClaire },
  carteDanger: { borderColor: couleurs.statutDanger, backgroundColor: 'rgba(231, 76, 60, 0.05)' },
  carteTitre: { fontFamily: police.extraGras, fontSize: tailleTexte.md, color: couleurs.texteAttenue },
  carteDescription: { fontFamily: police.normal, fontSize: tailleTexte.sm, color: couleurs.texteAttenue },
});
