import React, { useState } from 'react';

import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

import { COLORS } from '../../constants/colors';

interface Props {
  onActivated: () => void;
}

const LicenseActivationScreen: React.FC<Props> = ({
  onActivated,
}) => {
  const [licenseKey, setLicenseKey] = useState('');

  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.content}>

        <View style={styles.iconContainer}>
          <Text style={styles.icon}>
            🔐
          </Text>
        </View>

        <Text style={styles.title}>
          Activate Your Learning
        </Text>

        <Text style={styles.subtitle}>
          Enter your activation code to unlock your
          purchased class content.
        </Text>

        <Input
          label="Activation Code"
          placeholder="Enter activation code"
          value={licenseKey}
          onChangeText={setLicenseKey}
          autoCapitalize="characters"
        />

        <Button
          title="Activate"
          disabled={!licenseKey.trim()}
          onPress={onActivated}
        />

        <Text style={styles.note}>
          Your license will be securely stored on this
          device for offline access.
        </Text>

      </View>

    </SafeAreaView>
  );
};

export default LicenseActivationScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },

  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },

  icon: {
    fontSize: 55,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },

  subtitle: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 12,
    marginBottom: 35,
  },

  note: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 25,
  },
});