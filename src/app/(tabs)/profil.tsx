import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/auth';
import { logoutUser } from '@/services/auth';
import { getUsername } from '@/services/user';

const logo = require('../../../assets/images/logo.png');

function MenuItem({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={22} color={Colors.textDark} />
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
    </TouchableOpacity>
  );
}

export default function ProfilScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [pseudo, setPseudo] = useState('…');

  useFocusEffect(
    useCallback(() => {
      let actif = true;
      if (user) getUsername(user.uid, user.displayName).then((n) => actif && setPseudo(n));
      return () => {
        actif = false;
      };
    }, [user]),
  );

  function confirmerDeconnexion() {
    Alert.alert('Déconnexion', 'Vous êtes sur le point de vous déconnecter. Confirmer ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: () => logoutUser() },
    ]);
  }

  function bientotDisponible() {
    Alert.alert('Bientôt disponible', 'Cette fonctionnalité sera ajoutée prochainement.');
  }

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.brandRow}>
          <Image source={logo} style={styles.brandLogo} contentFit="contain" />
          <Text style={styles.brandName}>PROSERPINE</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={styles.headerLogout}
            onPress={confirmerDeconnexion}
            accessibilityLabel="Se déconnecter"
          >
            <Ionicons name="log-out-outline" size={22} color={Colors.statusDanger} />
          </TouchableOpacity>
        </View>
        <Text style={styles.username}>{pseudo}</Text>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.sectionTitle}>Mon activité</Text>
        <View style={styles.menuGroup}>
          <MenuItem
            icon="time-outline"
            label="Historique de recherches"
            onPress={() => router.push('/historique')}
          />
        </View>

        <Text style={styles.sectionTitle}>Mon compte</Text>
        <View style={styles.menuGroup}>
          <MenuItem icon="create-outline" label="Modifier mes informations" onPress={bientotDisponible} />
          <MenuItem icon="options-outline" label="Paramètres" onPress={bientotDisponible} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgApp },
  header: { backgroundColor: Colors.brandDarkest, paddingHorizontal: 20, paddingBottom: 24 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  brandLogo: { width: 26, height: 26 },
  brandName: { color: Colors.textOnDark, fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  headerLogout: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(231,76,60,0.15)',
  },
  username: { color: Colors.textOnDark, fontSize: 24, fontWeight: '800', marginTop: 20 },
  body: { padding: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, marginTop: 18, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  menuGroup: { backgroundColor: Colors.bgSurface, borderRadius: 14, borderWidth: 1, borderColor: Colors.borderDefault, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 16 },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: Colors.textDark },
});
