/**
 * BLOCS DE TRI de la fiche produit (variante B validée par Monsieur) :
 * le tri vient EN PREMIER, chaque bac est une carte horizontale, le NOM du bac
 * est plus grand (17 px) et la matière plus discrète (13 px) : on cherche d'abord
 * « où », puis « quoi ».
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { couleurs, ombre, police, rayon, tailleTexte } from '@/design/tokens';
import { Icone } from '@/design/icones';

// Titres affichés sur les cartes. Ils reprennent la maquette validée
// (« PMC » et non « Sac bleu (PMC) »). Les autres titres viennent de tri.js.
const TITRES_BAC: Record<string, string> = {
  pmc: 'PMC',
  paper: 'Papiers & cartons',
  glass: 'Verre',
  organic: 'Déchets organiques',
  residual: 'Déchets résiduels',
  danger: 'Recyparc',
};

// Icône de chaque bac (noms Material Symbols, convertis par <Icone>).
const ICONES_BAC: Record<string, string> = {
  pmc: 'recycling',
  paper: 'description',
  glass: 'liquor',
  organic: 'compost',
  residual: 'delete',
  danger: 'warning',
};

// Couleur de fond de chaque carte, depuis les tokens (couleurs des bacs du site).
const FOND_BAC: Record<string, string> = {
  pmc: couleurs.bacPmc,
  paper: couleurs.bacPapier,
  glass: couleurs.bacVerre,
  organic: couleurs.bacOrganique,
  residual: couleurs.bacResiduel,
  danger: couleurs.bacDanger,
};

/** Un bac et la liste de ses éléments (ex. « Film plastique », « Étui en carton »). */
export type Bac = { categorie: string; elements: string[] };

/**
 * Origine de la consigne :
 *  - 'lu'     : lue sur l'emballage (donnée d'Open Food Facts)
 *  - 'deduit' : déduite de la catégorie du produit (à vérifier)
 *  - 'choisi' : la matière a été choisie par l'utilisateur lui-même
 *  - 'aucune' : on ne sait pas
 */
export type Fiabilite = 'lu' | 'deduit' | 'choisi' | 'aucune';

// Apparence de l'étiquette selon l'origine (icône, texte, fond, couleur du texte).
const ETIQUETTES: Record<Exclude<Fiabilite, 'aucune'>, { icone: string; texte: string; fond: string; couleur: string }> = {
  lu: { icone: 'check_circle', texte: 'Lu sur l’emballage', fond: couleurs.statutBonFond, couleur: '#00663A' },
  deduit: { icone: 'info', texte: 'Déduit · à vérifier', fond: couleurs.statutAttentionFond, couleur: '#8A5300' },
  choisi: { icone: 'touch_app', texte: 'Votre choix', fond: couleurs.bordure, couleur: couleurs.texteAttenue },
};

/** Étiquette d'origine de la consigne, à droite du titre. */
export function EtiquetteFiabilite({ fiabilite }: { fiabilite: Fiabilite }) {
  if (fiabilite === 'aucune') return null;
  const e = ETIQUETTES[fiabilite];
  return (
    <View style={[styles.etiquette, { backgroundColor: e.fond }]}>
      <Icone nom={e.icone} taille={18} couleur={e.couleur} />
      <Text style={[styles.etiquetteTexte, { color: e.couleur }]}>{e.texte}</Text>
    </View>
  );
}

/** Une carte de bac horizontale. Un appui ouvre le guide de ce bac. */
export function CarteBac({ bac, onPress }: { bac: Bac; onPress?: () => void }) {
  // Le carton est sur fond jaune : le texte y est sombre pour rester lisible.
  const texte = bac.categorie === 'paper' ? couleurs.bacPapierTexte : couleurs.texteSurSombre;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${TITRES_BAC[bac.categorie] ?? bac.categorie} : ${bac.elements.join(', ')}`}
      style={({ pressed }) => [
        styles.carte,
        { backgroundColor: FOND_BAC[bac.categorie] ?? couleurs.texteAttenue, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Icone nom={ICONES_BAC[bac.categorie] ?? 'delete'} taille={34} couleur={texte} />
      <View style={styles.carteTextes}>
        <Text style={[styles.carteNom, { color: texte }]}>{TITRES_BAC[bac.categorie] ?? bac.categorie}</Text>
        <Text style={[styles.carteMatiere, { color: texte }]}>{bac.elements.join(', ')}</Text>
      </View>
    </Pressable>
  );
}

/** Section « Où le jeter ? » : titre, étiquette de fiabilité, puis les cartes de bac. */
export function SectionTri({
  bacs,
  fiabilite,
  consigneSecurite,
  separation,
  onChanger,
  onOuvrirGuide,
}: {
  bacs: Bac[];
  fiabilite: Fiabilite;
  /** Texte de sécurité (produit dangereux) : affiché sous les cartes quand il existe. */
  consigneSecurite?: string | null;
  /** Message précis « Retirez… » : seulement si une pièce collée va dans un autre bac. */
  separation?: string | null;
  /** Si fourni, affiche « Changer de matière » (cas où la matière a été choisie par l'utilisateur). */
  onChanger?: () => void;
  onOuvrirGuide: (categorie: string) => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.titreLigne}>
        <Text style={styles.titre}>Où le jeter ?</Text>
        <EtiquetteFiabilite fiabilite={fiabilite} />
      </View>

      {separation ? (
        <View style={styles.avis}>
          <Icone nom="content_cut" taille={22} couleur={couleurs.texteAttenue} />
          <Text style={styles.avisTexte}>{separation}</Text>
        </View>
      ) : null}

      {bacs.map((b) => (
        <CarteBac key={b.categorie} bac={b} onPress={() => onOuvrirGuide(b.categorie)} />
      ))}

      {onChanger ? (
        <Pressable accessibilityRole="button" onPress={onChanger} style={styles.lienChanger}>
          <Icone nom="edit" taille={18} couleur="#00663A" />
          <Text style={styles.lienChangerTexte}>Changer de matière</Text>
        </Pressable>
      ) : null}

      {consigneSecurite ? (
        <View style={styles.avis}>
          <Icone nom="warning" taille={22} couleur={couleurs.statutDanger} />
          <Text style={styles.avisTexte}>{consigneSecurite}</Text>
        </View>
      ) : null}

      {fiabilite === 'deduit' ? (
        <View style={styles.noteDeduit}>
          <Icone nom="info" taille={20} couleur="#6B4300" />
          <Text style={styles.noteDeduitTexte}>
            Cette consigne est <Text style={styles.gras}>déduite de la catégorie du produit</Text>. Vérifiez la
            matière sur l’emballage avant de jeter.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  titreLigne: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  titre: { fontFamily: police.extraGras, fontSize: tailleTexte.xl, color: couleurs.marqueSombre },
  etiquette: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: rayon.sm,
  },
  etiquetteTexte: { fontFamily: police.gras, fontSize: tailleTexte.base },
  carte: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: rayon.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    minHeight: 72,
    boxShadow: ombre.md,
  },
  carteTextes: { flex: 1 },
  // Nom du bac plus grand, matière plus petite (demande de Monsieur).
  carteNom: { fontFamily: police.extraGras, fontSize: 17, lineHeight: 20 },
  carteMatiere: { fontFamily: police.normal, fontSize: tailleTexte.base, lineHeight: 16, marginTop: 2, opacity: 0.95 },
  avis: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: couleurs.fondCarte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  avisTexte: { flex: 1, fontFamily: police.normal, fontSize: tailleTexte.base, color: couleurs.texteAttenue, lineHeight: 18 },
  noteDeduit: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: couleurs.statutAttentionFond,
    borderRadius: rayon.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 0,
  },
  noteDeduitTexte: { flex: 1, fontFamily: police.normal, fontSize: tailleTexte.base, color: '#6B4300', lineHeight: 18 },
  gras: { fontFamily: police.gras },
  lienChanger: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48, paddingHorizontal: 4 },
  lienChangerTexte: { fontFamily: police.extraGras, fontSize: tailleTexte.base, color: '#00663A' },
});
