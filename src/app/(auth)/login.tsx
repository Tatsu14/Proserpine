import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';
import { loginUser, resetPassword } from '@/services/auth';

const logo = require('../../../assets/images/logo.png');
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isValidPassword = (v: string) => v.length >= 6;

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailErr, setEmailErr] = useState(false);
  const [pwdErr, setPwdErr] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = isValidEmail(email) && isValidPassword(password);

  async function handleLogin() {
    setAuthError(null);
    setLoading(true);
    const res = await loginUser(email, password);
    setLoading(false);
    if (!res.success) setAuthError(res.error ?? 'Une erreur est survenue.');
  }

  async function handleReset() {
    setAuthError(null);
    setResetMsg(null);
    if (!email) {
      setAuthError('Veuillez entrer votre adresse e-mail puis cliquer sur Mot de passe oublié.');
      return;
    }
    const res = await resetPassword(email);
    if (res.success) {
      setResetMsg('Un e-mail de réinitialisation a été envoyé à votre adresse.');
    } else {
      setAuthError(res.error ?? 'Une erreur est survenue.');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Image source={logo} style={styles.logo} contentFit="contain" />
          <Text style={styles.title}>Bon retour</Text>
          <Text style={styles.subtitle}>Connectez-vous pour continuer</Text>

          <View style={styles.form}>
            {authError ? <Text style={styles.authError}>{authError}</Text> : null}
            {resetMsg ? <Text style={styles.successBanner}>{resetMsg}</Text> : null}

            <Text style={styles.label}>Adresse e-mail</Text>
            <TextInput
              style={[styles.input, emailErr && styles.inputInvalid]}
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (emailErr) setEmailErr(v.length > 0 && !isValidEmail(v));
                setAuthError(null);
                setResetMsg(null);
              }}
              onBlur={() => setEmailErr(email.length > 0 && !isValidEmail(email))}
              placeholder="vous@exemple.be"
              placeholderTextColor={Colors.textLight}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            {emailErr ? <Text style={styles.fieldErr}>Adresse e-mail invalide.</Text> : null}

            <Text style={styles.label}>Mot de passe</Text>
            <TextInput
              style={[styles.input, pwdErr && styles.inputInvalid]}
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                if (pwdErr) setPwdErr(v.length > 0 && !isValidPassword(v));
                setAuthError(null);
              }}
              onBlur={() => setPwdErr(password.length > 0 && !isValidPassword(password))}
              placeholder="••••••••"
              placeholderTextColor={Colors.textLight}
              secureTextEntry
              autoComplete="password"
            />
            {pwdErr ? (
              <Text style={styles.fieldErr}>Le mot de passe doit contenir au moins 6 caractères.</Text>
            ) : null}

            <TouchableOpacity onPress={handleReset}>
              <Text style={styles.forgot}>Mot de passe oublié ?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, (!canSubmit || loading) && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={!canSubmit || loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.textOnDark} />
              ) : (
                <Text style={styles.buttonText}>Se connecter</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Pas encore de compte ? </Text>
            <Link href="/(auth)/register" style={styles.footerLink}>
              S’inscrire
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgSurface },
  flex: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logo: { width: 64, height: 64, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.textDark, textAlign: 'center' },
  subtitle: { fontSize: 15, color: Colors.textMuted, textAlign: 'center', marginTop: 6, marginBottom: 28 },
  form: { gap: 4 },
  authError: {
    backgroundColor: 'rgba(231,76,60,0.10)',
    color: Colors.statusDanger,
    fontSize: 14,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    textAlign: 'center',
  },
  successBanner: {
    backgroundColor: 'rgba(0,204,102,0.12)',
    color: Colors.brandPrimaryDark,
    fontSize: 14,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    textAlign: 'center',
  },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textDark, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.textDark,
    backgroundColor: Colors.bgGray,
    marginTop: 4,
  },
  inputInvalid: { borderColor: Colors.statusDanger },
  fieldErr: { color: Colors.statusDanger, fontSize: 12.5, marginTop: 4 },
  forgot: { color: Colors.brandPrimaryDark, fontSize: 13, marginTop: 12, textAlign: 'right' },
  button: {
    backgroundColor: Colors.brandPrimary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: Colors.textOnDark, fontSize: 16, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
  footerText: { color: Colors.textMuted, fontSize: 14 },
  footerLink: { color: Colors.brandPrimaryDark, fontSize: 14, fontWeight: '700' },
});
