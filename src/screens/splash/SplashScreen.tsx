import React from 'react';

import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '../../constants/colors';

const SplashScreen = () => {
  return (
    <View style={styles.container}>

      <View style={styles.logo}>
        <Text style={styles.logoText}>
          SSC
        </Text>
      </View>

      <Text style={styles.title}>
        SSC Board Learning
      </Text>

      <Text style={styles.subtitle}>
        Learn Anytime, Anywhere
      </Text>

      <Text style={styles.offline}>
        100% Offline Learning
      </Text>

    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  logo: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },

  logoText: {
    color: COLORS.primary,
    fontSize: 34,
    fontWeight: '800',
  },

  title: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },

  subtitle: {
    color: COLORS.white,
    fontSize: 16,
    marginTop: 10,
    opacity: 0.9,
  },

  offline: {
    position: 'absolute',
    bottom: 50,
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
});