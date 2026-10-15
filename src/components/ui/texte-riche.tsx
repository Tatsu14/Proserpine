/**
 * TEXTE RICHE — affiche un texte avec le petit balisage du guide :
 *   {{DANGEREUX}} → pastille rouge (`.badge-danger`)
 *   **gras**      → texte en gras (`<strong>`)
 */
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';

import { couleurs, police } from '@/design/tokens';

export function TexteRiche({ texte, style }: { texte: string; style?: StyleProp<TextStyle> }) {
  // On découpe en gardant les morceaux balisés : [..., '{{DANGEREUX}}', ..., '**gras**', ...]
  const morceaux = texte.split(/(\{\{DANGEREUX\}\}|\*\*[^*]+\*\*)/g).filter((m) => m !== '');
  return (
    <Text style={style}>
      {morceaux.map((m, i) => {
        if (m === '{{DANGEREUX}}') {
          return (
            <Text key={i}>
              {' '}
              <View style={styles.pastille}>
                <Text style={styles.pastilleTexte}>DANGEREUX</Text>
              </View>
            </Text>
          );
        }
        if (m.startsWith('**')) {
          return (
            <Text key={i} style={{ fontFamily: police.gras }}>
              {m.slice(2, -2)}
            </Text>
          );
        }
        return <Text key={i}>{m}</Text>;
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  // .badge-danger : fond rouge, texte blanc 10 px gras, coins 4, léger décalage
  pastille: { backgroundColor: couleurs.statutDanger, borderRadius: 4, paddingVertical: 2, paddingHorizontal: 6, marginLeft: 8 },
  pastilleTexte: { fontFamily: police.extraGras, fontSize: 10, color: '#FFFFFF' },
});
