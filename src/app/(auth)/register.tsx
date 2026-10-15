/**
 * INSCRIPTION — reproduit `pages/inscription.html` + `js/pages/inscription.js` :
 * quatre champs validés quand on les quitte, bouton désactivé tant que tout n'est pas
 * valide, inscription Google (web). Un compte créé mène à l'onboarding.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { BoutonGoogle, BoutonPrimaire, SeparateurOu } from '@/components/ui/boutons';
import { CarteAuth, ErreurAuth, LiensAuth } from '@/components/ui/carte-auth';
import { Champ } from '@/components/ui/champ';
import { useUi } from '@/components/ui/ui-provider';
import { useAuth } from '@/contexts/auth';
import { googleDisponible, loginWithGoogle, registerUser } from '@/services/auth';

type Champs = 'username' | 'email' | 'password' | 'confirm';

export default function InscriptionScreen() {
  const router = useRouter();
  const ui = useUi();
  const { setOperationEnCours } = useAuth();

  const [valeurs, setValeurs] = useState<Record<Champs, string>>({ username: '', email: '', password: '', confirm: '' });
  const [invalides, setInvalides] = useState<Record<Champs, boolean>>({ username: false, email: false, password: false, confirm: false });
  const [erreur, setErreur] = useState('');

  // Mêmes règles qu'en ligne (`validators` de inscription.js).
  const valide = (champ: Champs, v: Record<Champs, string>) => {
    switch (champ) {
      case 'username':
        return /^[a-zA-Z0-9_-]{3,20}$/.test(v.username);
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email);
      case 'password':
        return /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/.test(v.password);
      case 'confirm':
        return v.confirm === v.password && v.confirm.length > 0;
    }
  };

  const toutValide = (['username', 'email', 'password', 'confirm'] as Champs[]).every((c) => valide(c, valeurs));

  // Vérifie un champ : l'erreur s'affiche s'il est non vide et invalide.
  const verifier = (champ: Champs, v: Record<Champs, string>) =>
    setInvalides((i) => ({ ...i, [champ]: !valide(champ, v) && v[champ].length > 0 }));

  const modifier = (champ: Champs, texte: string) => {
    const v = { ...valeurs, [champ]: texte };
    setValeurs(v);
    // Comme en ligne : on re-vérifie en direct seulement un champ déjà marqué invalide…
    if (invalides[champ]) verifier(champ, v);
    // …et la confirmation quand le mot de passe change.
    if (champ === 'password' && v.confirm) verifier('confirm', v);
  };

  const sInscrire = async () => {
    if (!toutValide) return;
    setErreur('');
    // Pendant l'inscription, Firebase connecte déjà l'utilisateur : on bloque la redirection automatique.
    setOperationEnCours(true);
    ui.chargement('Création du compte...');
    const r = await registerUser(valeurs.email, valeurs.password, valeurs.username);
    ui.chargement(null);
    if (r.success) {
      router.replace('/onboarding');
    } else if (r.error) {
      setErreur(r.error);
    }
    setOperationEnCours(false);
  };

  const google = async () => {
    setErreur('');
    setOperationEnCours(true);
    ui.chargement('Connexion avec Google...');
    const r = await loginWithGoogle();
    ui.chargement(null);
    if (r.success) router.replace(r.nouveau ? '/onboarding' : '/(tabs)');
    else if (r.error) setErreur(r.error);
    setOperationEnCours(false);
  };

  return (
    <CarteAuth titre="Créer un compte" sousTitre="Rejoignez Proserpine et agissez pour la planète">
      <ErreurAuth message={erreur} />

      <Champ
        etiquette="Nom d'utilisateur"
        value={valeurs.username}
        onChangeText={(t) => modifier('username', t)}
        onBlur={() => verifier('username', valeurs)}
        invalide={invalides.username}
        erreur="3-20 caractères (lettres, chiffres, _ ou -)"
        autoCapitalize="none"
      />
      <Champ
        etiquette="Adresse e-mail"
        value={valeurs.email}
        onChangeText={(t) => modifier('email', t)}
        onBlur={() => verifier('email', valeurs)}
        invalide={invalides.email}
        erreur="Format d'e-mail invalide"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <Champ
        etiquette="Mot de passe"
        value={valeurs.password}
        onChangeText={(t) => modifier('password', t)}
        onBlur={() => verifier('password', valeurs)}
        invalide={invalides.password}
        erreur="8+ car, 1 maj, 1 chiffre, 1 spécial"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
      />
      <Champ
        etiquette="Confirmation du mot de passe"
        value={valeurs.confirm}
        onChangeText={(t) => modifier('confirm', t)}
        onBlur={() => verifier('confirm', valeurs)}
        invalide={invalides.confirm}
        erreur="Les mots de passe ne correspondent pas"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
      />

      <BoutonPrimaire style={{ marginTop: 16 }} disabled={!toutValide} onPress={sInscrire}>
        S'inscrire
      </BoutonPrimaire>

      {googleDisponible ? (
        <>
          <SeparateurOu />
          <BoutonGoogle onPress={google} />
        </>
      ) : null}

      <LiensAuth texte="Déjà un compte ?" lien="Se connecter" onPress={() => router.replace('/(auth)/login')} />
    </CarteAuth>
  );
}
