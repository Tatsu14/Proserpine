import { Redirect } from 'expo-router';

import { EcranSplash } from '@/components/ui/ecran-splash';
import { useAuth } from '@/contexts/auth';

/**
 * Écran d'entrée : aiguille vers la zone connectée ou vers la connexion, selon
 * l'état d'authentification. Pendant l'initialisation de Firebase (restauration de
 * la session), on montre l'écran de démarrage, comme la version en ligne.
 */
export default function Index() {
  const { user, initializing } = useAuth();
  if (initializing) return <EcranSplash />;
  return <Redirect href={user ? '/(tabs)' : '/(auth)/login'} />;
}
