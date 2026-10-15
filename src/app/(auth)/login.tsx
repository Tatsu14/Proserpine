/**
 * CONNEXION — reproduit `pages/connexion.html` + `js/pages/connexion.js` :
 * e-mail + mot de passe validés quand on quitte le champ, bouton désactivé tant que
 * le formulaire n'est pas valide, « Mot de passe oublié ? », connexion Google (web).
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BoutonGoogle, BoutonPrimaire, SeparateurOu } from '@/components/ui/boutons';
import { CarteAuth, ErreurAuth, LiensAuth } from '@/components/ui/carte-auth';
import { Champ } from '@/components/ui/champ';
import { useUi } from '@/components/ui/ui-provider';
import { useAuth } from '@/contexts/auth';
import { couleurs, police, tailleTexte } from '@/design/tokens';
import { googleDisponible, loginUser, loginWithGoogle, resetPassword } from '@/services/auth';

// Mêmes règles qu'en ligne.
const emailValide = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const motDePasseValide = (v: string) => v.length >= 6;

export default function ConnexionScreen() {
  const router = useRouter();
  const ui = useUi();
  const { setOperationEnCours } = useAuth();

  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  // Une erreur de champ n'apparaît qu'après avoir quitté le champ (comme en ligne).
  const [emailInvalide, setEmailInvalide] = useState(false);
  const [mdpInvalide, setMdpInvalide] = useState(false);
  const [erreur, setErreur] = useState('');

  const pret = emailValide(email) && motDePasseValide(motDePasse);

  const surEmail = (v: string) => {
    setEmail(v);
    if (emailInvalide) setEmailInvalide(v.length > 0 && !emailValide(v));
    setErreur('');
  };
  const surMdp = (v: string) => {
    setMotDePasse(v);
    if (mdpInvalide) setMdpInvalide(v.length > 0 && !motDePasseValide(v));
    setErreur('');
  };

  const seConnecter = async () => {
    if (!pret) return;
    setErreur('');
    ui.chargement('Connexion en cours...');
    const r = await loginUser(email, motDePasse);
    ui.chargement(null);
    // En cas de succès, la redirection vers l'accueil se fait toute seule (zone publique → connectée).
    if (!r.success && r.error) setErreur(r.error);
  };

  const motDePasseOublie = async () => {
    setErreur('');
    if (!email) {
      setErreur('Veuillez entrer votre adresse e-mail puis cliquer sur Mot de passe oublié.');
      return;
    }
    ui.chargement("Envoi de l'e-mail...");
    const r = await resetPassword(email);
    ui.chargement(null);
    if (r.success) ui.toast('Un e-mail de réinitialisation a été envoyé à votre adresse.', 'success');
    else if (r.error) setErreur(r.error);
  };

  const google = async () => {
    setErreur('');
    // On empêche la redirection automatique : un nouveau compte doit passer par l'onboarding.
    setOperationEnCours(true);
    ui.chargement('Connexion avec Google...');
    const r = await loginWithGoogle();
    ui.chargement(null);
    if (r.success) {
      router.replace(r.nouveau ? '/onboarding' : '/(tabs)');
      setOperationEnCours(false);
    } else {
      setOperationEnCours(false);
      if (r.error) setErreur(r.error);
    }
  };

  return (
    <CarteAuth titre="Bon retour" sousTitre="Connectez-vous pour continuer">
      <ErreurAuth message={erreur} />

      <Champ
        etiquette="Adresse e-mail"
        value={email}
        onChangeText={surEmail}
        onBlur={() => setEmailInvalide(email.length > 0 && !emailValide(email))}
        invalide={emailInvalide}
        erreur="Adresse e-mail invalide."
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <Champ
        etiquette="Mot de passe"
        value={motDePasse}
        onChangeText={surMdp}
        onBlur={() => setMdpInvalide(motDePasse.length > 0 && !motDePasseValide(motDePasse))}
        invalide={mdpInvalide}
        erreur="Le mot de passe doit contenir au moins 6 caractères."
        secureTextEntry
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={seConnecter}
      />

      {/* .forgot-pwd */}
      <View style={styles.oublie}>
        <Text accessibilityRole="link" onPress={motDePasseOublie} style={styles.oublieLien}>
          Mot de passe oublié ?
        </Text>
      </View>

      <BoutonPrimaire disabled={!pret} onPress={seConnecter}>
        Se connecter
      </BoutonPrimaire>

      {googleDisponible ? (
        <>
          <SeparateurOu />
          <BoutonGoogle onPress={google} />
        </>
      ) : null}

      <LiensAuth texte="Pas encore de compte ?" lien="S'inscrire" onPress={() => router.replace('/(auth)/register')} />
    </CarteAuth>
  );
}

const styles = StyleSheet.create({
  oublie: { alignItems: 'flex-end', marginBottom: 24 },
  oublieLien: { fontFamily: police.normal, fontSize: tailleTexte.xs, color: couleurs.marqueFoncee, textDecorationLine: 'underline' },
});
