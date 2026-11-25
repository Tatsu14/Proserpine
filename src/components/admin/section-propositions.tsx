/**
 * Administration — section PROPOSITIONS : les produits proposés par les utilisateurs.
 *
 * Pour chaque proposition en attente, « Examiner » ouvre un panneau où l'administrateur :
 *  - corrige si besoin le nom et la marque, puis ACCEPTE : le produit entre dans la base ;
 *  - peut importer les emballages proposés, mais seulement après les avoir relus (jamais d'office) ;
 *  - ou REFUSE avec un motif (obligatoire), choisi dans une liste et précisé si besoin.
 * Chaque décision est confirmée par une fenêtre avant d'être envoyée.
 */
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { BoutonPrimaire, BoutonSecondaire } from '@/components/ui/boutons';
import { Champ } from '@/components/ui/champ';
import { ChoixPuces, ChoixSegment } from '@/components/ui/choix-retour';
import { Text } from '@/components/ui/texte';
import { useUi } from '@/components/ui/ui-provider';
import { couleurs } from '@/design/tokens';
import {
  accepterProposition,
  listerPropositions,
  refuserProposition,
  type EmballageAdmin,
  type ListePropositions,
  type Proposition,
  type StatutProposition,
} from '@/services/admin-base';
import { messageErreur } from '@/services/api-proserpine';
import { libelleBac, libelleCouche } from '@/services/base-produits';

import { Compteur, dateCourte, EditeurEmballages, emballagesComplets, stylesAdmin } from './commun';

const STATUTS = [
  { id: 'en_attente', libelle: 'En attente' },
  { id: 'accepte', libelle: 'Acceptées' },
  { id: 'refuse', libelle: 'Refusées' },
] as const;

const MOTIFS = [
  { id: 'code', libelle: 'Code-barres incorrect' },
  { id: 'doublon', libelle: 'Doublon' },
  { id: 'incomplet', libelle: 'Informations insuffisantes' },
  { id: 'hors_sujet', libelle: 'Pas un produit emballé' },
  { id: 'autre', libelle: 'Autre' },
] as const;
type Motif = (typeof MOTIFS)[number]['id'];

export function SectionPropositions() {
  const [statut, setStatut] = useState<StatutProposition>('en_attente');
  const [donnees, setDonnees] = useState<ListePropositions | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [ouverte, setOuverte] = useState<number | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    const r = await listerPropositions(statut);
    if (r.ok) setDonnees(r.donnees);
    else setErreur(messageErreur(r.erreur));
    setChargement(false);
  }, [statut]);

  useEffect(() => {
    setOuverte(null);
    charger();
  }, [charger]);

  const compteurs = donnees?.compteurs;
  const liste = donnees?.propositions ?? [];

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={stylesAdmin.contenu}>
      <View style={stylesAdmin.compteurs}>
        <Compteur valeur={String(compteurs?.en_attente ?? '—')} titre="En attente" alerte={(compteurs?.en_attente ?? 0) > 0} />
        <Compteur valeur={String(compteurs?.accepte ?? '—')} titre="Acceptées" />
        <Compteur valeur={String(compteurs?.refuse ?? '—')} titre="Refusées" />
      </View>

      <ChoixSegment etiquette="Propositions" options={STATUTS} valeur={statut} onChange={setStatut} />
      <BoutonSecondaire onPress={charger} disabled={chargement} style={{ marginBottom: 16 }}>
        {chargement ? 'Chargement…' : 'Actualiser'}
      </BoutonSecondaire>

      {chargement ? <ActivityIndicator color={couleurs.marque} style={{ marginVertical: 24 }} /> : null}
      {erreur ? <Text style={stylesAdmin.erreur}>{erreur}</Text> : null}

      {!chargement &&
        liste.map((p) => (
          <CarteProposition
            key={p.id}
            p={p}
            ouverte={ouverte === p.id}
            onOuvrir={() => setOuverte(ouverte === p.id ? null : p.id)}
            onTraitee={() => {
              setOuverte(null);
              charger();
            }}
          />
        ))}

      {!chargement && !erreur && liste.length === 0 ? <Text style={stylesAdmin.vide}>Aucune proposition ici.</Text> : null}
    </ScrollView>
  );
}

function CarteProposition({
  p,
  ouverte,
  onOuvrir,
  onTraitee,
}: {
  p: Proposition;
  ouverte: boolean;
  onOuvrir: () => void;
  onTraitee: () => void;
}) {
  const proposes = p.emballages_proposes ?? [];
  return (
    <View style={stylesAdmin.carte}>
      <View style={stylesAdmin.carteHaut}>
        <Text style={stylesAdmin.carteTitre}>{p.nom}</Text>
      </View>
      <Text style={stylesAdmin.carteMeta}>
        {p.marque ? `${p.marque} · ` : ''}Code-barres : {p.ean}
      </Text>
      <Text style={stylesAdmin.carteMeta}>
        Proposé le {dateCourte(p.cree_le)}
        {p.traite_le ? ` · traité le ${dateCourte(p.traite_le)}` : ''}
        {p.utilisateur_id ? ` · compte ${p.utilisateur_id.slice(0, 6)}…` : ' · compte effacé'}
      </Text>
      {p.deja_connu ? <Text style={stylesAdmin.alerte}>Déjà dans la base : accepter ne créera pas de doublon.</Text> : null}
      {p.nb_meme_code > 1 ? <Text style={stylesAdmin.alerte}>Proposé {p.nb_meme_code} fois</Text> : null}

      {proposes.length > 0 ? (
        <View style={{ gap: 2, marginTop: 4 }}>
          <Text style={stylesAdmin.carteMeta}>Emballages proposés (non publiés) :</Text>
          {proposes.map((e, i) => (
            <Text key={i} style={stylesAdmin.carteTexte}>
              • {e.nom} — {libelleCouche(e.couche)} · {e.bac ? libelleBac(e.bac) : 'bac inconnu'}
              {e.niveau === 'pack' ? ' · lot' : ''}
            </Text>
          ))}
        </View>
      ) : (
        <Text style={stylesAdmin.carteMeta}>Aucun emballage proposé.</Text>
      )}

      {p.statut === 'refuse' && p.motif_refus ? <Text style={stylesAdmin.carteTexte}>Motif : {p.motif_refus}</Text> : null}

      {p.statut === 'en_attente' ? (
        <>
          <BoutonSecondaire onPress={onOuvrir} style={{ marginTop: 8 }}>
            {ouverte ? 'Fermer' : 'Examiner'}
          </BoutonSecondaire>
          {ouverte ? <Examen p={p} onTraitee={onTraitee} /> : null}
        </>
      ) : null}
    </View>
  );
}

function Examen({ p, onTraitee }: { p: Proposition; onTraitee: () => void }) {
  const ui = useUi();
  const [nom, setNom] = useState(p.nom);
  const [marque, setMarque] = useState(p.marque ?? '');
  const [importer, setImporter] = useState(false);
  const [emballages, setEmballages] = useState<EmballageAdmin[]>(
    (p.emballages_proposes ?? []).map((e) => ({ ...e, source: e.bac ? 'moi' : 'doute', commentaire: 'Proposé par un utilisateur' })),
  );
  const [motif, setMotif] = useState<Motif | null>(null);
  const [precision, setPrecision] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const nomValide = nom.trim().length >= 2;
  const peutAccepter = nomValide && (!importer || (emballages.length > 0 && emballagesComplets(emballages))) && !envoi;
  const texteMotif = motif
    ? [MOTIFS.find((m) => m.id === motif)?.libelle, precision.trim()].filter(Boolean).join(' : ')
    : precision.trim();
  const peutRefuser = texteMotif.length > 0 && !envoi;

  function accepter() {
    const avec = importer ? ` avec ${emballages.length} emballage${emballages.length > 1 ? 's' : ''}` : ', sans emballages';
    ui.confirmer({
      titre: 'Accepter la proposition ?',
      message: `« ${nom.trim()} » (${p.ean}) sera ajouté à la base${avec}. Il deviendra visible par tous les utilisateurs.`,
      confirmer: 'Accepter',
      annuler: 'Annuler',
      onConfirmer: async () => {
        setEnvoi(true);
        const r = await accepterProposition(p.id, { nom: nom.trim(), marque: marque.trim(), emballages: importer ? emballages : null });
        setEnvoi(false);
        if (r.ok) {
          ui.toast('Proposition acceptée : le produit est dans la base.', 'success');
          onTraitee();
        } else {
          ui.toast(messageErreur(r.erreur), 'error');
        }
      },
    });
  }

  function refuser() {
    ui.confirmer({
      titre: 'Refuser la proposition ?',
      message: `Motif : « ${texteMotif} ». Le produit ne sera pas ajouté.`,
      confirmer: 'Refuser',
      annuler: 'Annuler',
      danger: true,
      onConfirmer: async () => {
        setEnvoi(true);
        const r = await refuserProposition(p.id, texteMotif.slice(0, 300));
        setEnvoi(false);
        if (r.ok) {
          ui.toast('Proposition refusée.', 'success');
          onTraitee();
        } else {
          ui.toast(messageErreur(r.erreur), 'error');
        }
      },
    });
  }

  return (
    <View style={stylesAdmin.panneau}>
      <Text style={stylesAdmin.sousTitre}>Accepter</Text>
      <Champ
        etiquette="Nom (corrigez si besoin)"
        value={nom}
        onChangeText={setNom}
        maxLength={150}
        invalide={!nomValide}
        erreur="2 caractères au moins."
      />
      <Champ etiquette="Marque (facultatif)" value={marque} onChangeText={setMarque} maxLength={100} />

      {(p.emballages_proposes ?? []).length > 0 ? (
        <>
          <ChoixSegment
            etiquette="Emballages proposés"
            options={[
              { id: 'non', libelle: 'Ne pas importer' },
              { id: 'oui', libelle: 'Importer après relecture' },
            ]}
            valeur={importer ? 'oui' : 'non'}
            onChange={(v) => setImporter(v === 'oui')}
          />
          {importer ? (
            <>
              <Text style={stylesAdmin.aide}>
                Relisez chaque élément : il deviendra une consigne affichée à tous comme « Vérifié par Proserpine ».
              </Text>
              <EditeurEmballages valeur={emballages} onChange={setEmballages} />
            </>
          ) : null}
        </>
      ) : null}

      <BoutonPrimaire onPress={accepter} disabled={!peutAccepter} style={{ marginBottom: 16 }}>
        {envoi ? 'Envoi…' : 'Accepter'}
      </BoutonPrimaire>

      <Text style={stylesAdmin.sousTitre}>Ou refuser</Text>
      <ChoixPuces etiquette="Motif" options={MOTIFS} valeur={motif} onChange={setMotif} />
      <Champ
        etiquette="Précision (facultatif)"
        value={precision}
        onChangeText={setPrecision}
        maxLength={200}
        placeholder="Ex. : le code correspond à un autre produit"
      />
      <BoutonSecondaire onPress={refuser} disabled={!peutRefuser}>
        Refuser
      </BoutonSecondaire>
    </View>
  );
}
