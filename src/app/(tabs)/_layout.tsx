import { Redirect, Tabs } from 'expo-router';

import { EcranSplash } from '@/components/ui/ecran-splash';
import { NavBasse } from '@/components/ui/nav-basse';
import { useAuth } from '@/contexts/auth';
import { couleurs } from '@/design/tokens';

/**
 * Zone principale (connectée), en onglets — mêmes 5 entrées que la barre du bas en
 * ligne : Accueil · Recherche · Scan · Guide · Profil. Garde d'accès : sans
 * utilisateur, on renvoie vers la connexion.
 */
export default function TabsLayout() {
  const { user, initializing } = useAuth();

  if (initializing) return <EcranSplash />;
  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      // La barre du bas est dessinée par NavBasse (copie de `.bottom-nav` de la version en ligne).
      tabBar={(props) => <NavBasse {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: couleurs.fondCarte } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Accueil' }} />
      <Tabs.Screen name="recherche" options={{ title: 'Recherche' }} />
      <Tabs.Screen name="scan" options={{ title: 'Scanner' }} />
      <Tabs.Screen name="guide" options={{ title: 'Guide' }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil' }} />
    </Tabs>
  );
}
