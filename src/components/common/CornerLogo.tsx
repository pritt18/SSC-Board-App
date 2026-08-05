import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Persistent brand watermark shown in the top-right corner of every screen.
// pointerEvents="none" so it never blocks taps on the content underneath.
const CornerLogo: React.FC = () => {
  const insets = useSafeAreaInsets();

  return (
    <Image
      source={require('../../../assets/images/logo.png')}
      style={[styles.logo, { top: insets.top + 6 }]}
      resizeMode="contain"
      pointerEvents="none"
    />
  );
};

export default CornerLogo;

const styles = StyleSheet.create({
  logo: {
    position: 'absolute',
    right: 8,
    width: 68,
    height: 48,
    opacity: 1,
    zIndex: 999,
  },
});
