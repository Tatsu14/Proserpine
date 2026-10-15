import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/contexts/auth';

/**
 * Zone publique (connexion / inscription). Si l'utilisateur est déjà connecté,
 * on le renvoie automatiquement vers la zone principale.
 */
export default function AuthLayout() {
  const { user, initializing } = useAuth();

  if (!initializing && user) {
    return <Redirect href="/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
