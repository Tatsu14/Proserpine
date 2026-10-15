import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/auth';

/**
 * Écran d'entrée : aiguille vers la zone connectée ou vers la connexion,
 * selon l'état d'authentification. Affiche un loader pendant l'initialisation
 * de Firebase (le temps que la session soit restaurée depuis le stockage).
 */
export default function Index() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.brandPrimary} />
      </View>
    );
  }

  return <Redirect href={user ? '/(tabs)' : '/(auth)/login'} />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bgApp,
  },
});
