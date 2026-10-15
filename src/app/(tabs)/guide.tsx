import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';
import { GUIDE, GUIDE_ORDER } from '@/constants/guide';

export default function GuideScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Guide de tri</Text>
        <Text style={styles.subtitle}>Province de Liège</Text>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {GUIDE_ORDER.map((key) => {
          const cat = GUIDE[key];
          return (
            <TouchableOpacity
              key={key}
              style={[styles.card, { backgroundColor: cat.color }]}
              onPress={() => router.push(`/guide/${key}`)}
              activeOpacity={0.85}
            >
              <MaterialIcons name={cat.icon as any} size={34} color={cat.textColor} />
              <Text style={[styles.cardTitle, { color: cat.textColor }]}>{cat.title}</Text>
              <Text style={[styles.cardDesc, { color: cat.textColor }]} numberOfLines={2}>
                {cat.cardDesc}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgApp },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.textDark },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginTop: 4 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 16,
  },
  card: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    minHeight: 130,
    justifyContent: 'space-between',
  },
  cardTitle: { fontSize: 16, fontWeight: '800', marginTop: 10 },
  cardDesc: { fontSize: 12, marginTop: 4, opacity: 0.95 },
});
