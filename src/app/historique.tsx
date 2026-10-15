import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/auth';
import { chargerHistorique, type HistoriqueItem } from '@/services/historique';

const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

function formatDate(ts?: Timestamp): string {
  if (!ts || typeof ts.toDate !== 'function') return '';
  const d = ts.toDate();
  return `${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function HistoriqueScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<HistoriqueItem[]>([]);
  const [loading, setLoading] = useState(false);

  const charger = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setItems(await chargerHistorique(user.uid, 100));
    } catch {
      // silencieux
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  return (
    <View style={styles.flex}>
      <Stack.Screen options={{ headerShown: true, title: 'Historique complet' }} />
      <FlatList
        data={items}
        keyExtractor={(item) => item.ean}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={charger} tintColor={Colors.brandPrimary} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="time-outline" size={48} color={Colors.textLight} />
              <Text style={styles.emptyText}>Votre historique est vide.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push(`/produit/${item.ean}`)}
            activeOpacity={0.7}
          >
            <View style={styles.icon}>
              <Ionicons name="cube-outline" size={22} color={Colors.brandPrimaryDark} />
            </View>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowName} numberOfLines={1}>
                {item.nom}
              </Text>
              <Text style={styles.rowDate} numberOfLines={1}>
                {formatDate(item.date)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.bgApp },
  list: { padding: 20, paddingBottom: 40 },
  empty: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText: { color: Colors.textMuted, fontSize: 15 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.bgSurface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: Colors.brandPrimaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTextWrap: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600', color: Colors.textDark },
  rowDate: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
});
