import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/contexts/auth';
import { couleurs } from '@/design/tokens';

/**
 * Zone publique (connexion / inscription). Si l'utilisateur est déjà connecté,
 * on le renvoie vers la zone principale — SAUF pendant une inscription ou une
 * connexion Google : l'écran gère alors lui-même la suite (onboarding).
 */
export default function AuthLayout() {
  const { user, initializing, operationEnCours } = useAuth();

  if (!initializing && user && !operationEnCours) {
    return <Redirect href="/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: couleurs.fondCarte } }} />;
}
