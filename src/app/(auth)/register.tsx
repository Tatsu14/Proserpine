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
import { registerUser } from '@/services/auth';

const logo = require('../../../assets/images/logo.png');

// Validateurs identiques à la version web.
const vUsername = (v: string) => /^[a-zA-Z0-9_-]{3,20}$/.test(v);
const vEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const vPassword = (v: string) =>
  /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/.test(v);

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errs, setErrs] = useState({ username: false, email: false, password: false, confirm: false });
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const okUser = vUsername(username);
  const okEmail = vEmail(email);
  const okPwd = vPassword(password);
  const okConfirm = confirm === password && confirm.length > 0;
  const canSubmit = okUser && okEmail && okPwd && okConfirm;

  function setErr(field: keyof typeof errs, value: boolean) {
    setErrs((e) => ({ ...e, [field]: value }));
  }

  async function handleRegister() {
    setAuthError(null);
    setLoading(true);
    const res = await registerUser(email, password, username);
    setLoading(false);
    if (!res.success) setAuthError(res.error ?? 'Une erreur est survenue.');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Image source={logo} style={styles.logo} contentFit="contain" />
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>Rejoignez Proserpine et agissez pour la planète</Text>

          <View style={styles.form}>
            {authError ? <Text style={styles.authError}>{authError}</Text> : null}

            <Text style={styles.label}>Nom d’utilisateur</Text>
            <TextInput
              style={[styles.input, errs.username && styles.inputInvalid]}
              value={username}
              onChangeText={(v) => {
                setUsername(v);
                if (errs.username) setErr('username', v.length > 0 && !vUsername(v));
                setAuthError(null);
              }}
              onBlur={() => setErr('username', username.length > 0 && !okUser)}
              placeholder="Votre pseudo"
              placeholderTextColor={Colors.textLight}
              autoCapitalize="none"
            />
            {errs.username ? (
              <Text style={styles.fieldErr}>3-20 caractères (lettres, chiffres, _ ou -)</Text>
            ) : null}

            <Text style={styles.label}>Adresse e-mail</Text>
            <TextInput
              style={[styles.input, errs.email && styles.inputInvalid]}
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (errs.email) setErr('email', v.length > 0 && !vEmail(v));
                setAuthError(null);
              }}
              onBlur={() => setErr('email', email.length > 0 && !okEmail)}
              placeholder="vous@exemple.be"
              placeholderTextColor={Colors.textLight}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            {errs.email ? <Text style={styles.fieldErr}>Format d’e-mail invalide</Text> : null}

            <Text style={styles.label}>Mot de passe</Text>
            <TextInput
              style={[styles.input, errs.password && styles.inputInvalid]}
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                if (errs.password) setErr('password', v.length > 0 && !vPassword(v));
                if (confirm.length > 0) setErr('confirm', confirm !== v);
                setAuthError(null);
              }}
              onBlur={() => setErr('password', password.length > 0 && !okPwd)}
              placeholder="8+ car., 1 maj., 1 chiffre, 1 spécial"
              placeholderTextColor={Colors.textLight}
              secureTextEntry
            />
            {errs.password ? (
              <Text style={styles.fieldErr}>8+ car, 1 maj, 1 chiffre, 1 spécial</Text>
            ) : null}

            <Text style={styles.label}>Confirmation du mot de passe</Text>
            <TextInput
              style={[styles.input, errs.confirm && styles.inputInvalid]}
              value={confirm}
              onChangeText={(v) => {
                setConfirm(v);
                if (errs.confirm) setErr('confirm', !(v === password && v.length > 0));
                setAuthError(null);
              }}
              onBlur={() => setErr('confirm', confirm.length > 0 && !okConfirm)}
              placeholder="••••••••"
              placeholderTextColor={Colors.textLight}
              secureTextEntry
            />
            {errs.confirm ? <Text style={styles.fieldErr}>Les mots de passe ne correspondent pas</Text> : null}

            <TouchableOpacity
              style={[styles.button, (!canSubmit || loading) && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={!canSubmit || loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.textOnDark} />
              ) : (
                <Text style={styles.buttonText}>S’inscrire</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Déjà un compte ? </Text>
            <Link href="/(auth)/login" style={styles.footerLink}>
              Se connecter
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
  subtitle: { fontSize: 14.5, color: Colors.textMuted, textAlign: 'center', marginTop: 6, marginBottom: 24 },
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
  button: {
    backgroundColor: Colors.brandPrimary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: Colors.textOnDark, fontSize: 16, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: Colors.textMuted, fontSize: 14 },
  footerLink: { color: Colors.brandPrimaryDark, fontSize: 14, fontWeight: '700' },
});
