/**
 * BLOCS D'INFORMATION de la fiche produit (variante B) : en-tête fin, bannière
 * hors-ligne, boîte « Conseil de tri », bloc compact « Indice d'impact », source.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { couleurs, ombre, police, rayon, tailleTexte } from '@/design/tokens';
import { Icone } from '@/design/icones';

/** Bouton « retour » carré, reconnaissable et assez grand pour le pouce (48 px). */
export function BoutonRetour({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Retour"
      style={({ pressed }) => [styles.retour, { opacity: pressed ? 0.7 : 1 }]}
    >
      <Icone nom="arrow_back" taille={24} couleur={couleurs.texte} />
    </Pressable>
  );
}

/** En-tête fin : retour + nom du produit + marque. Il respecte la zone du téléphone (encoche). */
export function EnteteFiche({ titre, sousTitre, onRetour }: { titre: string; sousTitre?: string; onRetour: () => void }) {
  const marges = useSafeAreaInsets();
  return (
    <View style={[styles.entete, { paddingTop: 10 + marges.top }]}>
      <BoutonRetour onPress={onRetour} />
      <View style={styles.enteteTextes}>
        <Text style={styles.nom} numberOfLines={2}>
          {titre}
        </Text>
        {sousTitre ? (
          <Text style={styles.marque} numberOfLines={1}>
            {sousTitre}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** Bannière affichée quand le réseau est coupé et que la fiche vient de la mémoire du téléphone. */
export function BandeauHorsLigne() {
  return (
    <View style={styles.bandeau}>
      <Icone nom="cloud_off" taille={22} couleur="#6B4300" />
      <View style={styles.bandeauTextes}>
        <Text style={styles.bandeauTitre}>Vous êtes hors connexion</Text>
        <Text style={styles.bandeauTexte}>Produit déjà consulté : les données affichées peuvent ne pas être à jour.</Text>
      </View>
    </View>
  );
}

/** Boîte « Conseil de tri ». */
export function BoiteConseil({ texte }: { texte: string }) {
  return (
    <View style={styles.conseil}>
      <Icone nom="lightbulb" taille={24} couleur={couleurs.marque} />
      <View style={styles.conseilTextes}>
        <Text style={styles.conseilEtiquette}>CONSEIL DE TRI</Text>
        <Text style={styles.conseilTexte}>{texte}</Text>
      </View>
    </View>
  );
}

// Anneau du score : 56 px, trait de 6, mêmes proportions que la maquette.
const TAILLE_ANNEAU = 56;
const TRAIT = 6;
const RAYON_ANNEAU = 22;
const CIRCONFERENCE = 2 * Math.PI * RAYON_ANNEAU;

function Anneau({ note, couleur }: { note: number | null; couleur: string }) {
  // Quand le produit n'est pas évalué, l'anneau reste vide : on ne montre jamais une note inventée.
  const part = note === null ? 0 : Math.max(0, Math.min(100, note)) / 100;
  return (
    <View style={styles.anneau}>
      <Svg width={TAILLE_ANNEAU} height={TAILLE_ANNEAU} style={styles.anneauSvg}>
        <Circle cx={28} cy={28} r={RAYON_ANNEAU} fill="none" stroke={couleurs.bordure} strokeWidth={TRAIT} />
        <Circle
          cx={28}
          cy={28}
          r={RAYON_ANNEAU}
          fill="none"
          stroke={couleur}
          strokeWidth={TRAIT}
          strokeLinecap="round"
          strokeDasharray={CIRCONFERENCE}
          strokeDashoffset={CIRCONFERENCE * (1 - part)}
          transform="rotate(-90 28 28)"
        />
      </Svg>
      <Text style={styles.anneauNombre}>{note === null ? '?' : note}</Text>
    </View>
  );
}

/**
 * Bloc compact « Indice d'impact », placé en bas : un plus, pas l'objet principal de la fiche.
 * `note` vaut null quand le produit n'est PAS évalué (jamais de valeur par défaut présentée comme un résultat).
 */
export function BlocIndice({
  note,
  palier,
  couleur,
  onPourquoi,
}: {
  note: number | null;
  palier: string;
  couleur: string;
  /** Ouvre la feuille « Pourquoi cette note ? ». Le lien n'existe que si le produit est évalué. */
  onPourquoi?: () => void;
}) {
  const evalue = note !== null;
  return (
    <>
      <View style={styles.indice}>
        <Anneau note={note} couleur={couleur} />
        <View style={styles.indiceTextes}>
          <Text style={styles.indiceTitre}>{evalue ? `Indice d’impact : ${palier}` : 'Non évalué'}</Text>
          <Text style={styles.indiceTexte}>
            {evalue ? '100 = impact le plus faible' : 'Pas assez de données pour estimer l’impact.'}
          </Text>
        </View>
      </View>
      {evalue && onPourquoi ? (
        <Pressable accessibilityRole="button" onPress={onPourquoi} style={styles.lienPourquoi}>
          <Text style={styles.lienPourquoiTexte}>Pourquoi cette note ?</Text>
          <Icone nom="chevron_right" taille={22} couleur="#00663A" />
        </Pressable>
      ) : null}
    </>
  );
}

/** Mention de la base de données d'où viennent les informations. */
export function Source({ nom }: { nom: string }) {
  return <Text style={styles.source}>Source : {nom}</Text>;
}

const styles = StyleSheet.create({
  retour: {
    width: 48,
    height: 48,
    borderRadius: rayon.sm,
    backgroundColor: couleurs.fondCarte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: ombre.sm,
  },
  entete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: couleurs.fondCarte,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  enteteTextes: { flex: 1 },
  nom: { fontFamily: police.extraGras, fontSize: tailleTexte.xl, lineHeight: 21, color: couleurs.marqueSombre },
  marque: { fontFamily: police.semiGras, fontSize: tailleTexte.base, color: couleurs.texteAttenue },

  bandeau: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: rayon.md,
    backgroundColor: couleurs.statutAttentionFond,
    borderWidth: 1,
    borderColor: '#F3D9A8',
  },
  bandeauTextes: { flex: 1 },
  bandeauTitre: { fontFamily: police.gras, fontSize: tailleTexte.base, color: '#5A3700' },
  bandeauTexte: { fontFamily: police.normal, fontSize: tailleTexte.base, color: '#6B4300', lineHeight: 18 },

  conseil: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 14,
    backgroundColor: couleurs.fondCarte,
    borderLeftWidth: 4,
    borderLeftColor: couleurs.marque,
    borderTopRightRadius: rayon.md,
    borderBottomRightRadius: rayon.md,
    boxShadow: ombre.sm,
  },
  conseilTextes: { flex: 1 },
  conseilEtiquette: {
    fontFamily: police.extraGras,
    fontSize: tailleTexte.xs,
    color: '#00663A',
    letterSpacing: 0.55,
    marginBottom: 3,
  },
  conseilTexte: { fontFamily: police.normal, fontSize: tailleTexte.md, color: couleurs.texte, lineHeight: 20 },

  indice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: couleurs.fondCarte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon.md,
  },
  anneau: { width: TAILLE_ANNEAU, height: TAILLE_ANNEAU, alignItems: 'center', justifyContent: 'center' },
  anneauSvg: { position: 'absolute' },
  anneauNombre: { fontFamily: police.noir, fontSize: 17, color: couleurs.texte },
  indiceTextes: { flex: 1 },
  indiceTitre: { fontFamily: police.extraGras, fontSize: tailleTexte.md, color: couleurs.texte },
  indiceTexte: { fontFamily: police.normal, fontSize: tailleTexte.base, color: couleurs.texteAttenue },

  lienPourquoi: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: 20,
  },
  lienPourquoiTexte: { fontFamily: police.extraGras, fontSize: tailleTexte.base, color: '#00663A' },

  source: {
    fontFamily: police.normal,
    textAlign: 'center',
    fontSize: tailleTexte.sm,
    color: couleurs.texteAttenue,
    paddingTop: 18,
    paddingBottom: 28,
    paddingHorizontal: 16,
  },
});
