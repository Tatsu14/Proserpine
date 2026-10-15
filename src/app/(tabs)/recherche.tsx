import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/auth';
import { rechercherProduitParTexte } from '@/services/api';
import { chargerHistorique, type HistoriqueItem } from '@/services/historique';

export default function RechercheScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const inputRef = useRef<TextInput>(null);
  const reqId = useRef(0);

  const [terme, setTerme] = useState('');
  const [resultats, setResultats] = useState<any[]>([]);
  const [chargement, setChargement] = useState(false);
  const [recherchee, setRecherchee] = useState(false);
  const [montrerTout, setMontrerTout] = useState(false);
  const [recents, setRecents] = useState<HistoriqueItem[]>([]);

  // Focus auto + chargement des recherches récentes à l'arrivée sur l'onglet.
  useFocusEffect(
    useCallback(() => {
      const t = setTimeout(() => inputRef.current?.focus(), 250);
      let actif = true;
      if (user) {
        chargerHistorique(user.uid, 10).then((h) => actif && setRecents(h)).catch(() => {});
      }
      return () => {
        clearTimeout(t);
        actif = false;
      };
    }, [user]),
  );

  useEffect(() => {
    const t = terme.trim();
    setMontrerTout(false);
    if (t.length === 0) {
      setResultats([]);
      setRecherchee(false);
      setChargement(false);
      return;
    }
    setChargement(true);
    const timer = setTimeout(async () => {
      const monId = ++reqId.current;
      const r = await rechercherProduitParTexte(t);
      if (monId !== reqId.current) return;
      setResultats(Array.isArray(r) ? r : []);
      setChargement(false);
      setRecherchee(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [terme]);

  function ligneProduit(nom: string, sous: string, ean: string, icon: keyof typeof Ionicons.glyphMap) {
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => router.push(`/produit/${encodeURIComponent(ean)}`)}
        activeOpacity={0.7}
      >
        <View style={styles.icon}>
          <Ionicons name={icon} size={20} color={Colors.brandPrimaryDark} />
        </View>
        <View style={styles.rowTextWrap}>
          <Text style={styles.rowName} numberOfLines={1}>
            {nom}
          </Text>
          <Text style={styles.rowBrand} numberOfLines={1}>
            {sous}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
      </TouchableOpacity>
    );
  }

  const champVide = terme.trim().length === 0;
  const affichage = montrerTout ? resultats : resultats.slice(0, 5);

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <Text style={styles.title}>Rechercher</Text>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={Colors.textMuted} />
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={terme}
          onChangeText={setTerme}
          placeholder="Nom d’un produit, une marque…"
          placeholderTextColor={Colors.textLight}
          autoCorrect={false}
          returnKeyType="search"
        />
        {terme.length > 0 ? (
          <TouchableOpacity onPress={() => setTerme('')}>
            <Ionicons name="close-circle" size={20} color={Colors.textLight} />
          </TouchableOpacity>
        ) : null}
      </View>

      {champVide ? (
        <FlatList
          data={recents}
          keyExtractor={(item) => item.ean}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            recents.length > 0 ? <Text style={styles.recentTitle}>Recherches récentes</Text> : null
          }
          ListEmptyComponent={
            <Text style={styles.hint}>
              Aucune recherche pour l’instant. Scannez ou recherchez un produit pour commencer.
            </Text>
          }
          renderItem={({ item }) => ligneProduit(item.nom, item.marque, item.ean, 'time-outline')}
        />
      ) : chargement ? (
        <ActivityIndicator style={styles.loader} size="large" color={Colors.brandPrimary} />
      ) : recherchee && resultats.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="search-outline" size={48} color={Colors.textLight} />
          <Text style={styles.emptyText}>Aucun produit trouvé pour cette recherche.</Text>
          <TouchableOpacity style={styles.scanBtn} onPress={() => router.push('/(tabs)/scan')}>
            <Text style={styles.scanBtnText}>Scanner un produit</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={affichage}
          keyExtractor={(item, i) => `${item.ean || 'x'}-${i}`}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          renderItem={({ item }) => ligneProduit(item.nom, item.marque, item.ean, 'cube-outline')}
          ListFooterComponent={
            !montrerTout && resultats.length > 5 ? (
              <TouchableOpacity style={styles.voirTout} onPress={() => setMontrerTout(true)}>
                <Text style={styles.voirToutText}>Voir tous les résultats ({resultats.length})</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.bgApp },
  title: { fontSize: 26, fontWeight: '800', color: Colors.textDark, paddingHorizontal: 16, paddingTop: 12 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.bgSurface,
    margin: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
  },
  input: { flex: 1, fontSize: 16, color: Colors.textDark },
  recentTitle: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  hint: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: 24, paddingHorizontal: 20 },
  loader: { marginTop: 40 },
  empty: { alignItems: 'center', marginTop: 50, paddingHorizontal: 30, gap: 12 },
  emptyText: { color: Colors.textMuted, fontSize: 15, textAlign: 'center' },
  scanBtn: { backgroundColor: Colors.brandPrimary, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 22, marginTop: 8 },
  scanBtnText: { color: Colors.textOnDark, fontWeight: '700', fontSize: 15 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
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
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.brandPrimaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTextWrap: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600', color: Colors.textDark },
  rowBrand: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  voirTout: { paddingVertical: 14, alignItems: 'center' },
  voirToutText: { color: Colors.brandPrimaryDark, fontWeight: '700', fontSize: 14 },
});
