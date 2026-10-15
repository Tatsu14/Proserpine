/**
 * ÉCRAN DE DÉMARRAGE — reproduit `.splash-screen` : fond vert très foncé, logo rond
 * de 80 px, petit cercle qui tourne (32 px, trait de 3 px).
 */
import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { couleurs } from '@/design/tokens';

const logo = require('../../../assets/images/logo.png');

export function EcranSplash() {
  const rotation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const boucle = Animated.loop(
      Animated.timing(rotation, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true }),
    );
    boucle.start();
    return () => boucle.stop();
  }, [rotation]);

  return (
    <View style={styles.page}>
      <Image source={logo} style={styles.logo} contentFit="cover" />
      <Animated.View
        style={[styles.spinner, { transform: [{ rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.marqueSombre, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 80, height: 80, borderRadius: 40, marginBottom: 24 },
  spinner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: 'rgba(0, 204, 102, 0.2)',
    borderTopColor: couleurs.marque,
  },
});
