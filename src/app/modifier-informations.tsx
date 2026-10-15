/**
 * MES INFORMATIONS — repris de `pages/modifier-informations.html` + `.js` de ProserpineV2
 * (version locale validée). Permet de :
 *   - changer le nom d'utilisateur ;
 *   - changer le mot de passe (comptes e-mail uniquement) ;
 *   - exporter ses données (JSON) ;
 *   - supprimer son compte, en deux temps.
 * Chaque modification s'ouvre dans une feuille du bas. L'adresse e-mail est l'identifiant
 * unique du compte : elle est affichée mais jamais modifiable.
 */
import { Stack, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BoutonPrimaire, BoutonSecondaire } from '@/components/ui/boutons';
import { Champ } from '@/components/ui/champ';
import { FeuilleBas } from '@/components/ui/feuille-bas';
import { EnteteEcran, GroupeMenu, Indication, LigneMenu, TitreSection } from '@/components/ui/menu';
import { Text } from '@/components/ui/texte';
import { useUi } from '@/components/ui/ui-provider';
import { useAuth } from '@/contexts/auth';
import { couleurs, police, tailleTexte } from '@/design/tokens';
import {
  changerMotDePasse,
  changerNomUtilisateur,
  supprimerCompte,
  typeDeCompte,
  validerMotDePasse,
  validerNomUtilisateur,
} from '@/services/compte';
import { exporterMesDonnees } from '@/services/donnees-utilisateur';
import { db } from '@/services/firebase';

type Feuille = null | 'nom' | 'mdp' | 'suppression-1' | 'suppression-2';

export default function ModifierInformationsScreen() {
  const router = useRouter();
  const ui = useUi();
  const { user } = useAuth();

  const [nomActuel, setNomActuel] = useState('');
  const [feuille, setFeuille] = useState<Feuille>(null);
  const estGoogle = typeDeCompte() === 'google';
  const fermer = useCallback(() => setFeuille(null), []);

  // Nom d'utilisateur : Firestore en priorité, comme sur l'accueil et le profil.
  useEffect(() => {
    if (!user) return;
    let actif = true;
    (async () => {
      let nom = '';
      try {
        const d = await getDoc(doc(db, 'utilisateurs', user.uid));
        if (d.exists()) nom = (d.data() as any).username || '';
      } catch {
        // Firestore injoignable : on se rabat sur le nom du profil Auth.
      }
      if (actif) setNomActuel(nom || user.displayName || '');
    })();
    return () => {
      actif = false;
    };
  }, [user]);

  const [exportEnCours, setExportEnCours] = useState(false);
  const lancerExport = async () => {
    if (!user || exportEnCours) return;
    setExportEnCours(true);
    const r = await exporterMesDonnees({ uid: user.uid, email: user.email });
    setExportEnCours(false);
    if (r.success) ui.toast('Vos données sont prêtes');
    else ui.toast(r.error, 'error');
  };

  return (
    <View style={styles.page}>
      <Stack.Screen options={{ headerShown: false }} />
      <EnteteEcran titre="Mes informations" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <TitreSection>Profil</TitreSection>
        <GroupeMenu>
          <LigneMenu icone="person" libelle="Nom d'utilisateur" valeur={nomActuel || 'Non défini'} onPress={() => setFeuille('nom')} />
          {/* Adresse e-mail : identifiant unique du compte, non modifiable */}
          <LigneMenu icone="mail" libelle="Adresse e-mail" valeur={user?.email || 'Non renseignée'} />
          {estGoogle ? (
            <LigneMenu icone="lock" libelle="Connexion" valeur="Google" />
          ) : (
            <LigneMenu icone="lock" libelle="Mot de passe" onPress={() => setFeuille('mdp')} />
          )}
        </GroupeMenu>
        <Indication>L'adresse e-mail est l'identifiant unique de votre compte : elle ne peut pas être modifiée.</Indication>

        <TitreSection>Mes données</TitreSection>
        <GroupeMenu>
          <LigneMenu icone="ios_share" libelle="Exporter mes données" onPress={lancerExport} />
        </GroupeMenu>
        <Indication>Un fichier JSON avec votre profil et l'historique de vos produits scannés.</Indication>

        <TitreSection>Zone sensible</TitreSection>
        <GroupeMenu>
          <LigneMenu icone="delete_forever" libelle="Supprimer mon compte" danger onPress={() => setFeuille('suppression-1')} />
        </GroupeMenu>
      </ScrollView>

      {/* --- Nom d'utilisateur --- */}
      <FeuilleBas visible={feuille === 'nom'} titre="Nom d'utilisateur" onFermer={fermer}>
        <FormulaireNom nomActuel={nomActuel} onFini={(nom) => { setNomActuel(nom); ui.toast("Nom d'utilisateur mis à jour"); fermer(); }} onAnnuler={fermer} />
      </FeuilleBas>

      {/* --- Mot de passe --- */}
      <FeuilleBas visible={feuille === 'mdp'} titre="Mot de passe" onFermer={fermer}>
        <FormulaireMotDePasse onFini={() => { ui.toast('Mot de passe mis à jour'); fermer(); }} onAnnuler={fermer} />
      </FeuilleBas>

      {/* --- Suppression, temps 1 : avertissement --- */}
      <FeuilleBas visible={feuille === 'suppression-1'} titre="Supprimer mon compte" onFermer={fermer}>
        <Text style={styles.texte}>
          Cette action est <Text style={styles.gras}>définitive</Text>. Seront effacés :
        </Text>
        <View style={styles.liste}>
          {['votre profil', "l'historique de vos produits scannés", 'votre compte de connexion'].map((t) => (
            <Text key={t} style={styles.puce}>
              •  {t}
            </Text>
          ))}
        </View>
        <Text style={styles.texte}>Vous pouvez d'abord récupérer vos données.</Text>
        <View style={styles.actions}>
          <BoutonSecondaire onPress={lancerExport}>Exporter mes données d'abord</BoutonSecondaire>
          <BoutonPrimaire fond={couleurs.statutDanger} onPress={() => setFeuille('suppression-2')}>
            Continuer
          </BoutonPrimaire>
          <BoutonSecondaire onPress={fermer}>Annuler</BoutonSecondaire>
        </View>
      </FeuilleBas>

      {/* --- Suppression, temps 2 : confirmation par reconnexion --- */}
      <FeuilleBas visible={feuille === 'suppression-2'} titre="Confirmer la suppression" onFermer={fermer}>
        <FormulaireSuppression
          estGoogle={estGoogle}
          onFini={() => router.replace('/(auth)/login')}
          onAnnuler={fermer}
        />
      </FeuilleBas>
    </View>
  );
}

/** Formulaire du nom d'utilisateur : bouton actif seulement si le nom est valide ET différent de l'actuel. */
function FormulaireNom({ nomActuel, onFini, onAnnuler }: { nomActuel: string; onFini: (nom: string) => void; onAnnuler: () => void }) {
  const [valeur, setValeur] = useState(nomActuel);
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);
  useEffect(() => setValeur(nomActuel), [nomActuel]);

  const net = valeur.trim();
  const valide = validerNomUtilisateur(net);
  const afficherErreurChamp = net.length > 0 && !valide;

  const envoyer = async () => {
    if (!valide || net === nomActuel || enCours) return;
    setEnCours(true);
    const r = await changerNomUtilisateur(net);
    setEnCours(false);
    if (r.success) onFini(r.nom as string);
    else setErreur(r.error ?? '');
  };

  return (
    <View>
      <Champ
        etiquette="Nom d'utilisateur"
        value={valeur}
        onChangeText={(t) => {
          setValeur(t);
          setErreur('');
        }}
        maxLength={20}
        autoCapitalize="none"
        invalide={afficherErreurChamp}
        erreur="3 à 20 caractères (lettres, chiffres, _ ou -)"
        onSubmitEditing={envoyer}
      />
      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
      <View style={styles.actions}>
        <BoutonPrimaire disabled={!valide || net === nomActuel || enCours} onPress={envoyer}>
          {enCours ? 'Enregistrement…' : 'Enregistrer'}
        </BoutonPrimaire>
        <BoutonSecondaire onPress={onAnnuler}>Annuler</BoutonSecondaire>
      </View>
    </View>
  );
}

/** Formulaire du mot de passe : l'ancien est demandé (Firebase exige de le prouver). */
function FormulaireMotDePasse({ onFini, onAnnuler }: { onFini: () => void; onAnnuler: () => void }) {
  const [ancien, setAncien] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  const nouveauValide = validerMotDePasse(nouveau);
  const confirmationValide = confirmation === nouveau && confirmation.length > 0;
  const pret = ancien.length > 0 && nouveauValide && confirmationValide && !enCours;

  const envoyer = async () => {
    if (!pret) return;
    setEnCours(true);
    const r = await changerMotDePasse(ancien, nouveau);
    setEnCours(false);
    if (r.success) onFini();
    else setErreur(r.error ?? '');
  };
  const modifier = (f: (t: string) => void) => (t: string) => {
    f(t);
    setErreur('');
  };

  return (
    <View>
      <Champ etiquette="Mot de passe actuel" value={ancien} onChangeText={modifier(setAncien)} secureTextEntry autoCapitalize="none" autoComplete="current-password" />
      <Champ
        etiquette="Nouveau mot de passe"
        value={nouveau}
        onChangeText={modifier(setNouveau)}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        invalide={nouveau.length > 0 && !nouveauValide}
        erreur="8 caractères minimum, 1 majuscule, 1 chiffre, 1 spécial"
      />
      <Champ
        etiquette="Confirmation"
        value={confirmation}
        onChangeText={modifier(setConfirmation)}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        invalide={confirmation.length > 0 && !confirmationValide}
        erreur="Les mots de passe ne correspondent pas"
        onSubmitEditing={envoyer}
      />
      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
      <View style={styles.actions}>
        <BoutonPrimaire disabled={!pret} onPress={envoyer}>
          {enCours ? 'Enregistrement…' : 'Changer le mot de passe'}
        </BoutonPrimaire>
        <BoutonSecondaire onPress={onAnnuler}>Annuler</BoutonSecondaire>
      </View>
    </View>
  );
}

/** Confirmation de la suppression : mot de passe (compte e-mail) ou fenêtre Google (web). */
function FormulaireSuppression({ estGoogle, onFini, onAnnuler }: { estGoogle: boolean; onFini: () => void; onAnnuler: () => void }) {
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);
  const pret = !enCours && (estGoogle || motDePasse.length > 0);

  const envoyer = async () => {
    if (!pret) return;
    setEnCours(true);
    const r = await supprimerCompte(estGoogle ? null : motDePasse);
    setEnCours(false);
    if (r.success) onFini();
    else setErreur(r.error ?? '');
  };

  return (
    <View>
      {estGoogle ? (
        <Text style={styles.texte}>Google va vous demander de confirmer votre identité avant la suppression.</Text>
      ) : (
        <>
          <Text style={styles.texte}>Saisissez votre mot de passe pour confirmer.</Text>
          <Champ
            etiquette="Mot de passe"
            value={motDePasse}
            onChangeText={(t) => {
              setMotDePasse(t);
              setErreur('');
            }}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            onSubmitEditing={envoyer}
          />
        </>
      )}
      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
      <View style={styles.actions}>
        <BoutonPrimaire fond={couleurs.statutDanger} disabled={!pret} onPress={envoyer}>
          {enCours ? 'Suppression…' : 'Supprimer définitivement'}
        </BoutonPrimaire>
        <BoutonSecondaire onPress={onAnnuler}>Annuler</BoutonSecondaire>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fondCarte },
  texte: { fontFamily: police.normal, fontSize: tailleTexte.md, color: couleurs.texteAttenue, marginBottom: 16 },
  gras: { fontFamily: police.gras },
  liste: { marginBottom: 16, paddingLeft: 4, gap: 4 },
  puce: { fontFamily: police.normal, fontSize: tailleTexte.md, color: couleurs.texteAttenue },
  actions: { gap: 12, marginTop: 16 },
  erreur: { fontFamily: police.normal, fontSize: tailleTexte.xs, color: couleurs.statutDanger, marginBottom: 4 },
});
