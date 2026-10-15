import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { GUIDE } from '@/constants/guide';

function Ligne({ icon, color, text }: { icon: string; color: string; text: string }) {
  return (
    <View style={styles.ligne}>
      <Ionicons name={icon as any} size={20} color={color} style={{ marginTop: 1 }} />
      <Text style={styles.ligneText}>{text}</Text>
    </View>
  );
}

export default function GuideDetailScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const cat = type ? GUIDE[type] : undefined;

  if (!cat) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Guide', headerShown: true }} />
        <Text style={styles.unknown}>Catégorie inconnue.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <Stack.Screen
        options={{
          title: cat.title,
          headerShown: true,
          headerStyle: { backgroundColor: cat.color },
          headerTintColor: cat.textColor,
        }}
      />

      <View style={[styles.header, { backgroundColor: cat.color }]}>
        <MaterialIcons name={cat.icon as any} size={42} color={cat.textColor} />
        <Text style={[styles.headerTitle, { color: cat.textColor }]}>{cat.title}</Text>
        <Text style={[styles.headerDesc, { color: cat.textColor }]}>{cat.desc}</Text>
      </View>

      <Text style={[styles.sectionTitle, { color: Colors.statusGood }]}>Ce qui va ici</Text>
      {cat.accepted.map((t, i) => (
        <Ligne key={`a${i}`} icon="checkmark-circle" color={Colors.statusGood} text={t} />
      ))}

      <Text style={[styles.sectionTitle, { color: Colors.statusDanger }]}>Ce qui n’y va pas</Text>
      {cat.refused.map((t, i) => (
        <Ligne key={`r${i}`} icon="close-circle" color={Colors.statusDanger} text={t} />
      ))}

      {cat.warnings ? (
        <>
          <Text style={[styles.sectionTitle, { color: Colors.statusWarning }]}>Attention</Text>
          {cat.warnings.map((t, i) => (
            <Ligne key={`w${i}`} icon="warning" color={Colors.statusWarning} text={t} />
          ))}
        </>
      ) : null}

      {cat.tip ? (
        <View style={styles.tip}>
          <Ionicons name="bulb-outline" size={20} color={Colors.brandPrimaryDark} />
          <Text style={styles.tipText}>{cat.tip}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.bgApp },
  container: { paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgApp },
  unknown: { color: Colors.textMuted, fontSize: 15 },
  header: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20, gap: 8 },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  headerDesc: { fontSize: 14, textAlign: 'center', opacity: 0.95, lineHeight: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginTop: 22, marginBottom: 8, paddingHorizontal: 20 },
  ligne: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 6 },
  ligneText: { flex: 1, fontSize: 14.5, color: Colors.textDark, lineHeight: 20 },
  tip: {
    flexDirection: 'row',
    gap: 10,
    margin: 20,
    marginTop: 28,
    padding: 16,
    borderRadius: 14,
    backgroundColor: Colors.brandPrimaryLight,
  },
  tipText: { flex: 1, fontSize: 13.5, color: Colors.textDark, lineHeight: 20 },
});
