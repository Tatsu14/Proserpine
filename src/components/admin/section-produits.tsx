/**
 * Administration — section PRODUITS : chercher un produit de la base, corriger son identité,
 * et saisir ou corriger ses EMBALLAGES (c'est ce qui devient la consigne « Vérifié par Proserpine »).
 * On peut aussi ajouter un produit absent de la base.
 */
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { BoutonPrimaire, BoutonSecondaire } from '@/components/ui/boutons';
import { Champ } from '@/components/ui/champ';
import { Text } from '@/components/ui/texte';
import { useUi } from '@/components/ui/ui-provider';
import { Icone } from '@/design/icones';
import { couleurs } from '@/design/tokens';
import {
  chercherProduits,
  creerProduit,
  lireEmballages,
  modifierProduit,
  remplacerEmballages,
  type EmballageAdmin,
  type ProduitResume,
} from '@/services/admin-base';
import { messageErreur } from '@/services/api-proserpine';

import { EditeurEmballages, emballagesComplets, stylesAdmin } from './commun';

const ORIGINES: Record<string, string> = {
  off: 'Open Food Facts',
  obf: 'Open Beauty Facts',
  opf: 'Open Products Facts',
  proserpine: 'Ajouté par Proserpine',
};

export function SectionProduits() {
  const ui = useUi();
  const [terme, setTerme] = useState('');
  const [resultats, setResultats] = useState<ProduitResume[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [selection, setSelection] = useState<ProduitResume | null>(null);
  const [ajout, setAjout] = useState(false);

  const chercher = useCallback(async (t: string) => {
    setChargement(true);
    setErreur(null);
    const r = await chercherProduits(t.trim());
    if (r.ok) setResultats(r.donnees.produits);
    else setErreur(messageErreur(r.erreur));
    setChargement(false);
  }, []);

  useEffect(() => {
    chercher('');
  }, [chercher]);

  if (selection) {
    return (
      <EditeurProduit
        produit={selection}
        onRetour={() => {
          setSelection(null);
          chercher(terme);
        }}
      />
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={stylesAdmin.contenu}>
      <Champ
        etiquette="Chercher (code, nom ou marque)"
        value={terme}
        onChangeText={setTerme}
        onSubmitEditing={() => chercher(terme)}
        returnKeyType="search"
        maxLength={100}
        placeholder="Ex. : 5449 ou Coca"
      />
      <View style={stylesAdmin.actions}>
        <BoutonPrimaire onPress={() => chercher(terme)} disabled={chargement} style={stylesAdmin.action}>
          Chercher
        </BoutonPrimaire>
        <BoutonSecondaire onPress={() => setAjout(!ajout)} style={stylesAdmin.action}>
          {ajout ? 'Fermer' : 'Ajouter un produit'}
        </BoutonSecondaire>
      </View>
      <Text style={stylesAdmin.aide}>Les 30 premiers résultats, par ordre alphabétique.</Text>

      {ajout ? (
        <FormulaireAjout
          onCree={(p) => {
            setAjout(false);
            ui.toast('Produit ajouté. Saisissez maintenant ses emballages.', 'success');
            setSelection(p);
          }}
        />
      ) : null}

      {chargement ? <ActivityIndicator color={couleurs.marque} style={{ marginVertical: 24 }} /> : null}
      {erreur ? <Text style={stylesAdmin.erreur}>{erreur}</Text> : null}

      {!chargement &&
        resultats.map((p) => (
          <Pressable
            key={p.ean}
            accessibilityRole="button"
            accessibilityLabel={`Ouvrir ${p.nom ?? p.ean}`}
            onPress={() => setSelection(p)}
            style={({ pressed }) => [stylesAdmin.carte, pressed && { opacity: 0.7 }]}
          >
            <View style={stylesAdmin.carteHaut}>
              <Text style={stylesAdmin.carteTitre}>{p.nom ?? 'Produit sans nom'}</Text>
              <Icone nom="chevron_right" taille={24} couleur={couleurs.texteAttenue} />
            </View>
            <Text style={stylesAdmin.carteMeta}>
              {p.marque ? `${p.marque} · ` : ''}
              {p.ean}
            </Text>
            <Text style={stylesAdmin.carteMeta}>
              {ORIGINES[p.origine] ?? p.origine}
              {p.modifie_par_proserpine ? ' · corrigé' : ''} ·{' '}
              {p.nb_emballages === 0 ? 'aucun emballage' : `${p.nb_emballages} emballage${p.nb_emballages > 1 ? 's' : ''}`}
            </Text>
          </Pressable>
        ))}

      {!chargement && !erreur && resultats.length === 0 ? <Text style={stylesAdmin.vide}>Aucun produit trouvé.</Text> : null}
    </ScrollView>
  );
}

function FormulaireAjout({ onCree }: { onCree: (p: ProduitResume) => void }) {
  const ui = useUi();
  const [ean, setEan] = useState('');
  const [nom, setNom] = useState('');
  const [marque, setMarque] = useState('');
  const [quantite, setQuantite] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const pret = /^\d{8,14}$/.test(ean) && nom.trim().length >= 2 && !envoi;

  async function creer() {
    setEnvoi(true);
    const r = await creerProduit({ ean, nom: nom.trim(), marque: marque.trim(), quantite: quantite.trim() });
    setEnvoi(false);
    if (r.ok) {
      onCree({
        ean,
        origine: 'proserpine',
        nom: nom.trim(),
        marque: marque.trim() || null,
        quantite: quantite.trim() || null,
        modifie_par_proserpine: false,
        nb_emballages: 0,
      });
    } else {
      ui.toast(messageErreur(r.erreur), 'error');
    }
  }

  return (
    <View style={stylesAdmin.panneau}>
      <Text style={stylesAdmin.sousTitre}>Nouveau produit</Text>
      <Champ
        etiquette="Code-barres"
        value={ean}
        onChangeText={(v) => setEan(v.replace(/\D/g, '').slice(0, 14))}
        keyboardType="number-pad"
        maxLength={14}
        placeholder="8 à 14 chiffres"
      />
      <Champ etiquette="Nom" value={nom} onChangeText={setNom} maxLength={150} />
      <Champ etiquette="Marque (facultatif)" value={marque} onChangeText={setMarque} maxLength={100} />
      <Champ etiquette="Quantité (facultatif)" value={quantite} onChangeText={setQuantite} maxLength={60} placeholder="Ex. : 1 L" />
      <BoutonPrimaire onPress={creer} disabled={!pret}>
        {envoi ? 'Envoi…' : 'Ajouter le produit'}
      </BoutonPrimaire>
    </View>
  );
}

function EditeurProduit({ produit, onRetour }: { produit: ProduitResume; onRetour: () => void }) {
  const ui = useUi();
  const [nom, setNom] = useState(produit.nom ?? '');
  const [marque, setMarque] = useState(produit.marque ?? '');
  const [quantite, setQuantite] = useState(produit.quantite ?? '');
  const [emballages, setEmballages] = useState<EmballageAdmin[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    const r = await lireEmballages(produit.ean);
    if (r.ok) setEmballages(r.donnees.emballages.map(({ id: _id, ...e }) => e));
    else setErreur(messageErreur(r.erreur));
    setChargement(false);
  }, [produit.ean]);

  useEffect(() => {
    charger();
  }, [charger]);

  async function enregistrerIdentite() {
    setEnvoi(true);
    const r = await modifierProduit({ ean: produit.ean, nom: nom.trim(), marque: marque.trim(), quantite: quantite.trim() });
    setEnvoi(false);
    if (r.ok) ui.toast('Produit corrigé.', 'success');
    else ui.toast(messageErreur(r.erreur), 'error');
  }

  function enregistrerEmballages() {
    ui.confirmer({
      titre: 'Enregistrer les emballages ?',
      message:
        emballages.length === 0
          ? 'Tous les emballages de ce produit seront supprimés : la fiche reviendra au calcul d’Open Food Facts.'
          : `Les emballages actuels seront remplacés par ces ${emballages.length} élément${emballages.length > 1 ? 's' : ''}. Ils deviendront la consigne « Vérifié par Proserpine ».`,
      confirmer: 'Enregistrer',
      annuler: 'Annuler',
      onConfirmer: async () => {
        setEnvoi(true);
        const r = await remplacerEmballages(produit.ean, emballages);
        setEnvoi(false);
        if (r.ok) {
          ui.toast('Emballages enregistrés.', 'success');
          charger();
        } else {
          ui.toast(messageErreur(r.erreur), 'error');
        }
      },
    });
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={stylesAdmin.contenu}>
      <BoutonSecondaire onPress={onRetour} style={{ marginBottom: 16 }}>
        Retour à la liste
      </BoutonSecondaire>

      <Text style={stylesAdmin.carteMeta}>
        Code-barres : {produit.ean} · {ORIGINES[produit.origine] ?? produit.origine}
      </Text>

      <Text style={stylesAdmin.sousTitre}>Identité</Text>
      <Champ etiquette="Nom" value={nom} onChangeText={setNom} maxLength={150} invalide={nom.trim().length < 2} erreur="2 caractères au moins." />
      <Champ etiquette="Marque (facultatif)" value={marque} onChangeText={setMarque} maxLength={100} />
      <Champ etiquette="Quantité (facultatif)" value={quantite} onChangeText={setQuantite} maxLength={60} />
      <BoutonSecondaire onPress={enregistrerIdentite} disabled={envoi || nom.trim().length < 2} style={{ marginBottom: 16 }}>
        Enregistrer l’identité
      </BoutonSecondaire>

      <Text style={stylesAdmin.sousTitre}>Emballages (consigne de tri)</Text>
      <Text style={stylesAdmin.aide}>
        Un élément par partie d’emballage. Seuls les éléments avec un bac s’affichent dans l’app ; « Je ne sais pas »
        reste en attente.
      </Text>
      {chargement ? <ActivityIndicator color={couleurs.marque} style={{ marginVertical: 24 }} /> : null}
      {erreur ? <Text style={stylesAdmin.erreur}>{erreur}</Text> : null}
      {!chargement && !erreur ? (
        <>
          <EditeurEmballages valeur={emballages} onChange={setEmballages} />
          <BoutonPrimaire onPress={enregistrerEmballages} disabled={envoi || !emballagesComplets(emballages)}>
            {envoi ? 'Envoi…' : 'Enregistrer les emballages'}
          </BoutonPrimaire>
        </>
      ) : null}
    </ScrollView>
  );
}
