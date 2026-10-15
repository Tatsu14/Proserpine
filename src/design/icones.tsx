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
 *
 * `contour` : version « vide » de l'icône (le site passe de contour à plein pour
 * marquer l'onglet actif). Quand une version contour existe dans MaterialCommunityIcons,
 * on l'utilise ; sinon on garde l'icône pleine.
 */
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type NomMaterial = ComponentProps<typeof MaterialIcons>['name'];
type NomCommunity = ComponentProps<typeof MaterialCommunityIcons>['name'];

type Props = {
  /** Nom de l'icône, en notation Material Symbols (ex. `check_circle`). */
  nom: string;
  taille?: number;
  couleur?: string;
  /** Version contour (non remplie) de l'icône, si elle existe. */
  contour?: boolean;
};

// Quelques icônes de Material Symbols n'existent pas sous le même nom dans MaterialIcons.
const EQUIVALENTS: Record<string, string> = {};

// Versions contour disponibles (MaterialCommunityIcons).
// Icônes qui n'existent que dans MaterialCommunityIcons (nom du site -> nom MDI).
const COMMUNAUTE: Record<string, string> = {
  package_2: 'package-variant-closed',
};

const CONTOURS: Record<string, string> = {
  home: 'home-outline',
  menu_book: 'book-open-page-variant-outline',
  account_circle: 'account-circle-outline',
};

export function Icone({ nom, taille = 24, couleur, contour }: Props) {
  if (COMMUNAUTE[nom]) {
    return <MaterialCommunityIcons name={COMMUNAUTE[nom] as NomCommunity} size={taille} color={couleur} />;
  }
  if (contour && CONTOURS[nom]) {
    return <MaterialCommunityIcons name={CONTOURS[nom] as NomCommunity} size={taille} color={couleur} />;
  }
  // Material Symbols écrit « check_circle », MaterialIcons attend « check-circle ».
  const nomMaterial = (EQUIVALENTS[nom] ?? nom).replace(/_/g, '-') as NomMaterial;
  return <MaterialIcons name={nomMaterial} size={taille} color={couleur} />;
}
