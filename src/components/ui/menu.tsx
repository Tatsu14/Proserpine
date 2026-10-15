/**
 * BRIQUES DE MENU — reprennent `.profile-section-title`, `.profile-menu`, `.menu-item`
 * et `.settings-hint` de la version en ligne (écrans Profil, Paramètres, Mes informations),
 * ainsi que l'en-tête d'écran `.history-header` (retour + titre).
 */
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/texte';
import { Icone } from '@/design/icones';
import { couleurs, police, rayon, tailleTexte } from '@/design/tokens';

/** En-tête d'écran : bouton retour + titre (`.history-header`). */
export function EnteteEcran({ titre, onRetour }: { titre: string; onRetour?: () => void }) {
  const router = useRouter();
  const marges = useSafeAreaInsets();
  const retour = onRetour ?? (() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profil')));
  return (
    <View style={[styles.entete, { paddingTop: 16 + marges.top }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={retour} style={styles.retour}>
        <Icone nom="arrow_back" taille={24} couleur={couleurs.texte} />
      </Pressable>
      <Text style={styles.titreEntete}>{titre}</Text>
    </View>
  );
}

/** Titre de section en capitales grises (`.profile-section-title`). */
export function TitreSection({ children }: { children: string }) {
  return <Text style={styles.titreSection}>{children}</Text>;
}

/** Groupe de lignes (`.profile-menu`). */
export function GroupeMenu({ children }: { children: ReactNode }) {
  return <View style={styles.groupe}>{children}</View>;
}

/** Phrase d'explication sous un groupe (`.settings-hint`). */
export function Indication({ children }: { children: string }) {
  return <Text style={styles.indication}>{children}</Text>;
}

type LigneProps = {
  icone: string;
  libelle: string;
  /** Valeur affichée à droite (ex. le nom d'utilisateur). */
  valeur?: string;
  /** Sans `onPress`, la ligne est une simple information (non cliquable, sans chevron). */
  onPress?: () => void;
  danger?: boolean;
  /** Contenu libre à droite (interrupteur). */
  droite?: ReactNode;
  /** Contenu empilé sous le libellé (sélecteur de taille). */
  dessous?: ReactNode;
};

/** Une ligne de menu (`.menu-item`). */
export function LigneMenu({ icone, libelle, valeur, onPress, danger, droite, dessous }: LigneProps) {
  const couleur = danger ? couleurs.statutDanger : couleurs.texte;
  const contenu = (
    <>
      <View style={styles.haut}>
        <View style={styles.gauche}>
          <Icone nom={icone} taille={24} couleur={danger ? couleurs.statutDanger : couleurs.marque} />
          <Text style={[styles.libelle, { color: couleur }]}>{libelle}</Text>
        </View>
        {droite ?? (
          <View style={styles.droite}>
            {valeur ? (
              <Text style={styles.valeur} numberOfLines={1}>
                {valeur}
              </Text>
            ) : null}
            {onPress ? <Icone nom="chevron_right" taille={24} couleur={couleurs.texteDiscret} /> : null}
          </View>
        )}
      </View>
      {dessous}
    </>
  );
  if (!onPress) return <View style={styles.ligne}>{contenu}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.ligne, pressed && { backgroundColor: couleurs.fondGris }]}
    >
      {contenu}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  entete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: couleurs.fondCarte,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
    marginBottom: 24,
  },
  retour: { width: 40, height: 40, borderRadius: rayon.sm, backgroundColor: couleurs.fondApp, alignItems: 'center', justifyContent: 'center' },
  titreEntete: { fontFamily: police.noir, fontSize: tailleTexte.xl2, lineHeight: 24, color: couleurs.texte },
  titreSection: {
    fontFamily: police.extraGras,
    fontSize: tailleTexte.md,
    color: couleurs.texteAttenue,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  groupe: { marginHorizontal: 16, marginBottom: 24, gap: 12 },
  indication: {
    fontFamily: police.normal,
    fontSize: tailleTexte.sm,
    color: couleurs.texteDiscret,
    lineHeight: 18,
    marginTop: -16,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  ligne: {
    backgroundColor: couleurs.fondCarte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon.md,
    padding: 16,
    gap: 12,
  },
  haut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  gauche: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  libelle: { fontFamily: police.semiGras, fontSize: tailleTexte.md },
  droite: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  // .select-value : valeur grise, tronquée si elle est longue (adresse e-mail)
  valeur: { fontFamily: police.semiGras, fontSize: tailleTexte.sm, color: couleurs.texteAttenue, maxWidth: 192 },
});
