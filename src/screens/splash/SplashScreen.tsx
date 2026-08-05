import React from 'react';

import {
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '../../constants/colors';

const SplashScreen = () => {
  return (
    <View style={styles.container}>

      <Image
        source={require('../../../assets/images/logo.png')}
        style={styles.logoImage}
        resizeMode="contain"
      />

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
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  logoImage: {
    width: 260,
    height: 176,
    marginBottom: 8,
  },

  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 16,
    marginTop: 6,
    fontWeight: '600',
  },

  offline: {
    position: 'absolute',
    bottom: 50,
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});