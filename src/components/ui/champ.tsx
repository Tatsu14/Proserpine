/**
 * CHAMP DE FORMULAIRE — reproduit `.input-group`, `.input-label`, `.input-field`
 * et `.input-error-msg` de la version en ligne.
 *
 *  - étiquette en capitales, 11 px, vert très foncé, espacée ;
 *  - champ gris clair, bordure 1,5 px, coins 12, 14 px ;
 *  - au focus : fond blanc, bordure verte, halo vert de 4 px ;
 *  - invalide : bordure rouge, fond rouge très léger, message d'erreur dessous.
 */
import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { Text } from '@/components/ui/texte';

import { couleurs, police, rayon, tailleTexte } from '@/design/tokens';

type Props = Pick<
  TextInputProps,
  'value' | 'onChangeText' | 'secureTextEntry' | 'keyboardType' | 'autoCapitalize' | 'autoComplete' | 'textContentType' | 'onSubmitEditing' | 'returnKeyType'
> & {
  etiquette: string;
  /** Message affiché sous le champ quand `invalide` est vrai. */
  erreur?: string;
  invalide?: boolean;
  /** Appelé quand l'utilisateur quitte le champ (la validation s'y déclenche, comme en ligne). */
  onBlur?: () => void;
};

export function Champ({ etiquette, erreur, invalide, onBlur, ...saisie }: Props) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={styles.groupe}>
      <Text style={styles.etiquette}>{etiquette.toUpperCase()}</Text>
      <TextInput
        {...saisie}
        accessibilityLabel={etiquette}
        onFocus={() => setFocus(true)}
        onBlur={() => {
          setFocus(false);
          onBlur?.();
        }}
        style={[
          styles.champ,
          focus && styles.champFocus,
          invalide && styles.champInvalide,
        ]}
        placeholderTextColor={couleurs.texteDiscret}
      />
      {invalide && erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  groupe: { marginBottom: 16, gap: 4 },
  etiquette: {
    fontFamily: police.semiGras,
    fontSize: tailleTexte.xs,
    color: couleurs.marqueSombre,
    letterSpacing: 0.55,
  },
  champ: {
    backgroundColor: couleurs.fondGris,
    borderWidth: 1.5,
    borderColor: couleurs.bordure,
    borderRadius: rayon.md,
    padding: 16,
    fontFamily: police.normal,
    fontSize: tailleTexte.md,
    color: couleurs.texte,
    // Le contour du navigateur est remplacé par notre halo vert.
    outlineStyle: 'none',
  } as any,
  champFocus: {
    backgroundColor: couleurs.fondCarte,
    borderColor: couleurs.marque,
    boxShadow: `0 0 0 4px ${couleurs.marqueLueur}`,
  } as any,
  champInvalide: {
    borderColor: couleurs.statutDanger,
    backgroundColor: 'rgba(231, 76, 60, 0.05)',
  },
  erreur: { fontFamily: police.normal, fontSize: tailleTexte.xs, color: couleurs.statutDanger, marginTop: 4 },
});
