/**
 * ICÔNES — point d'entrée UNIQUE pour toutes les icônes de Proserpine.
 *
 * Le site (ProserpineV2) utilise « Material Symbols Rounded ». Ici on utilise la
 * famille MaterialIcons d'Expo (`@expo/vector-icons`), très proche mais pas
 * identique. Choix provisoire validé par Monsieur : commencer avec les icônes Expo.
 *
 * Tous les écrans appellent <Icone nom="..." /> et JAMAIS la bibliothèque
 * directement. Pour changer de famille d'icônes plus tard, on ne modifie que ce
 * fichier.
 *
 * Les noms s'écrivent comme dans Material Symbols (avec des « _ », ex. `arrow_back`) :
 * le composant les convertit vers le format de MaterialIcons (« arrow-back »).
 */
import { MaterialIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type NomMaterial = ComponentProps<typeof MaterialIcons>['name'];

type Props = {
  /** Nom de l'icône, en notation Material Symbols (ex. `check_circle`). */
  nom: string;
  taille?: number;
  couleur?: string;
};

export function Icone({ nom, taille = 24, couleur }: Props) {
  // Material Symbols écrit « check_circle », MaterialIcons attend « check-circle ».
  const nomMaterial = nom.replace(/_/g, '-') as NomMaterial;
  return <MaterialIcons name={nomMaterial} size={taille} color={couleur} />;
}
