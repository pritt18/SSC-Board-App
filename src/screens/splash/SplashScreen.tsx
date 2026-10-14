import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  View,
} from 'react-native';

import { COLORS } from '../../constants/colors';

const isWeb = Platform.OS === 'web';

const SplashScreen = () => {
  const scaleAnim = useRef(new Animated.Value(0.2)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const textTranslateAnim = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    // 1. Pop-up spring bounce effect on logo entry
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 45,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // 2. Smooth fade and slide up for subtitles
      Animated.parallel([
        Animated.timing(textFadeAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [scaleAnim, opacityAnim, textFadeAnim, textTranslateAnim]);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require('../../../assets/images/logo.png')}
        style={[
          styles.logoImage,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
        resizeMode="contain"
      />

      <Animated.Text
        style={[
          styles.subtitle,
          {
            opacity: textFadeAnim,
            transform: [{ translateY: textTranslateAnim }],
          },
        ]}
      >
        Learn Anytime, Anywhere
      </Animated.Text>

      <Animated.Text
        style={[
          styles.offline,
          {
            opacity: textFadeAnim,
          },
        ]}
      >
        100% Offline Learning
      </Animated.Text>
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
    width: isWeb ? 500 : 260,
    height: isWeb ? 330 : 176,
    maxWidth: '90%',
    maxHeight: isWeb ? 360 : 200,
    marginBottom: isWeb ? 16 : 8,
  },

  subtitle: {
    color: COLORS.textSecondary,
    fontSize: isWeb ? 22 : 16,
    marginTop: isWeb ? 10 : 6,
    fontWeight: '600',
    letterSpacing: isWeb ? 0.6 : 0,
    textAlign: 'center',
  },

  offline: {
    position: 'absolute',
    bottom: isWeb ? 45 : 50,
    color: COLORS.textSecondary,
    fontSize: isWeb ? 16 : 14,
    fontWeight: '600',
    letterSpacing: isWeb ? 0.4 : 0,
    textAlign: 'center',
  },
});