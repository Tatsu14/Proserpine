/**
 * Briques communes de l'écran Administration : styles des cartes, compteurs, et éditeur d'emballages
 * (utilisé pour relire les emballages d'une proposition et pour corriger ceux d'un produit).
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { BoutonSecondaire } from '@/components/ui/boutons';
import { Champ } from '@/components/ui/champ';
import { ChoixPuces, ChoixSegment } from '@/components/ui/choix-retour';
import { Text } from '@/components/ui/texte';
import { Icone } from '@/design/icones';
import { couleurs, police, rayon, tailleTexte } from '@/design/tokens';
import { SOURCES_EMBALLAGE, type EmballageAdmin } from '@/services/admin-base';
import { BACS_BASE, COUCHES, type BacBase } from '@/services/base-produits';

export const MAX_EMBALLAGES_ADMIN = 20;

const NIVEAUX = [
  { id: 'unite', libelle: 'Unité' },
  { id: 'pack', libelle: 'Lot (pack)' },
] as const;

const OPTIONS_BACS = [...BACS_BASE.map((b) => ({ id: b.id, libelle: b.libelle })), { id: 'inconnu', libelle: 'Je ne sais pas' }] as const;
type ChoixBac = BacBase | 'inconnu';

export const dateCourte = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('fr-FR') : '—');

export function Compteur({ valeur, titre, alerte }: { valeur: string; titre: string; alerte?: boolean }) {
  return (
    <View style={stylesAdmin.compteur}>
      <Text style={[stylesAdmin.compteurValeur, alerte && { color: couleurs.statutDanger }]}>{valeur}</Text>
      <Text style={stylesAdmin.compteurTitre}>{titre}</Text>
    </View>
  );
}

/** Un emballage vide, prêt à être rempli. */
export const emballageVide = (premier: boolean): EmballageAdmin => ({
  niveau: 'unite',
  couche: premier ? 'contenant' : 'autre',
  nom: '',
  bac: null,
  source: 'moi',
  commentaire: null,
});

/** Liste d'emballages modifiable : ajout, retrait, et pour chacun niveau, partie, nom, bac, source, commentaire. */
export function EditeurEmballages({
  valeur,
  onChange,
}: {
  valeur: EmballageAdmin[];
  onChange: (liste: EmballageAdmin[]) => void;
}) {
  const modifier = (i: number, modif: Partial<EmballageAdmin>) =>
    onChange(valeur.map((e, j) => (j === i ? { ...e, ...modif } : e)));

  return (
    <View>
      {valeur.map((e, i) => (
        <View key={i} style={stylesAdmin.ligne}>
          <View style={stylesAdmin.ligneHaut}>
            <Text style={stylesAdmin.ligneTitre}>Élément {i + 1}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Retirer l’élément ${i + 1}`}
              onPress={() => onChange(valeur.filter((_, j) => j !== i))}
              style={stylesAdmin.retirer}
            >
              <Icone nom="delete_outline" taille={22} couleur={couleurs.statutDanger} />
              <Text style={stylesAdmin.retirerTexte}>Retirer</Text>
            </Pressable>
          </View>
          <Champ
            etiquette="Nom de l’élément"
            value={e.nom}
            onChangeText={(v) => modifier(i, { nom: v })}
            maxLength={100}
            invalide={e.nom.trim().length === 0}
            erreur="Nom obligatoire (ou retirez l’élément)."
            placeholder="Ex. : Bouteille en verre transparent"
          />
          <ChoixSegment etiquette="Niveau" options={NIVEAUX} valeur={e.niveau} onChange={(n) => modifier(i, { niveau: n })} />
          <ChoixPuces etiquette="Partie" options={COUCHES} valeur={e.couche} onChange={(c) => modifier(i, { couche: c })} />
          <ChoixPuces<ChoixBac>
            etiquette="Bac"
            options={OPTIONS_BACS}
            valeur={e.bac ?? 'inconnu'}
            onChange={(b) => modifier(i, { bac: b === 'inconnu' ? null : b, source: b === 'inconnu' ? 'doute' : e.source === 'doute' ? 'moi' : e.source })}
          />
          <ChoixPuces etiquette="Source" options={SOURCES_EMBALLAGE} valeur={e.source} onChange={(s) => modifier(i, { source: s })} />
          <Champ
            etiquette="Commentaire (facultatif)"
            value={e.commentaire ?? ''}
            onChangeText={(v) => modifier(i, { commentaire: v || null })}
            maxLength={300}
            placeholder="Ex. : vérifié sur trionsmieux.be"
          />
        </View>
      ))}
      {valeur.length < MAX_EMBALLAGES_ADMIN ? (
        <BoutonSecondaire onPress={() => onChange([...valeur, emballageVide(valeur.length === 0)])} style={{ marginBottom: 12 }}>
          {valeur.length === 0 ? 'Ajouter un élément' : 'Ajouter un autre élément'}
        </BoutonSecondaire>
      ) : null}
    </View>
  );
}

/** Vrai si chaque emballage a un nom (le serveur refait tous les contrôles). */
export const emballagesComplets = (liste: EmballageAdmin[]) => liste.every((e) => e.nom.trim().length > 0);

export const stylesAdmin = StyleSheet.create({
  contenu: { paddingHorizontal: 16, paddingBottom: 32 },
  compteurs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  compteur: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 12,
    backgroundColor: couleurs.fondGris,
    borderRadius: rayon.md,
  },
  compteurValeur: { fontFamily: police.extraGras, fontSize: tailleTexte.xl2, color: couleurs.marqueFoncee },
  compteurTitre: { fontFamily: police.semiGras, fontSize: tailleTexte.xxs, color: couleurs.texteAttenue, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  action: { flex: 1 },
  aide: { fontFamily: police.normal, fontSize: tailleTexte.sm, color: couleurs.texteAttenue, marginBottom: 16 },
  carte: {
    gap: 6,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon.md,
    backgroundColor: couleurs.fondCarte,
  },
  carteHaut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  carteTitre: { flex: 1, fontFamily: police.extraGras, fontSize: tailleTexte.md, color: couleurs.texte },
  carteTexte: { fontFamily: police.normal, fontSize: tailleTexte.md, color: couleurs.texte },
  carteMeta: { fontFamily: police.normal, fontSize: tailleTexte.sm, color: couleurs.texteAttenue },
  alerte: {
    fontFamily: police.semiGras,
    fontSize: tailleTexte.sm,
    color: '#8A5300',
    backgroundColor: couleurs.statutAttentionFond,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: rayon.xs,
    alignSelf: 'flex-start',
  },
  sousTitre: { fontFamily: police.extraGras, fontSize: tailleTexte.md, color: couleurs.texte, marginTop: 8, marginBottom: 8 },
  panneau: {
    marginTop: 8,
    padding: 12,
    gap: 4,
    borderRadius: rayon.md,
    backgroundColor: couleurs.fondGris,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  ligne: {
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon.md,
    backgroundColor: couleurs.fondCarte,
  },
  ligneHaut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  ligneTitre: { fontFamily: police.extraGras, fontSize: tailleTexte.md, color: couleurs.texte },
  retirer: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingHorizontal: 8 },
  retirerTexte: { fontFamily: police.semiGras, fontSize: tailleTexte.sm, color: couleurs.statutDanger },
  erreur: { fontFamily: police.semiGras, fontSize: tailleTexte.md, color: couleurs.statutDanger, marginBottom: 12 },
  vide: { fontFamily: police.normal, fontSize: tailleTexte.md, color: couleurs.texteAttenue, textAlign: 'center', marginTop: 24 },
});
