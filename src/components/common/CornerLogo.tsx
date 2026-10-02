import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Persistent brand watermark shown in the top-right corner of every screen.
// pointerEvents="none" on the container so it never blocks taps on the content underneath.
const CornerLogo: React.FC = () => {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="none"
      style={[styles.container, { top: insets.top + 6 }]}
    >
      <Image
        source={require('../../../assets/images/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
};

export default CornerLogo;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 8,
    zIndex: 999,
  },
  logo: {
    width: 68,
    height: 48,
    opacity: 1,
  },
});
