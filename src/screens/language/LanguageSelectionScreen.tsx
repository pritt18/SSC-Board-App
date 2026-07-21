import React, { useState } from 'react';

import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Button from '../../components/ui/Button';
import { COLORS } from '../../constants/colors';
import { useLanguage } from '../../context/LanguageContext';

type Language = 'marathi' | 'english';

interface Props {
  onContinue: () => void;
}

const LanguageSelectionScreen: React.FC<Props> = ({
  onContinue,
}) => {
  const [selectedLanguage, setSelectedLanguage] =
    useState<Language | null>(null);

  const { setLanguage } = useLanguage();

  const handleContinue = async () => {
    if (!selectedLanguage) {
      return;
    }

    try {
      await setLanguage(selectedLanguage);

      console.log(
        'Selected Medium:',
        selectedLanguage,
      );

      onContinue();
    } catch (error) {
      console.error(
        'Error selecting medium:',
        error,
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        {/* Header */}
        <Text style={styles.title}>
          Choose Your Medium
        </Text>

        <Text style={styles.marathiTitle}>
          तुमचे माध्यम निवडा
        </Text>

        <Text style={styles.subtitle}>
          Select your preferred learning medium.
        </Text>

        {/* Medium Options */}
        <View style={styles.options}>

          {/* English Medium */}
          <Pressable
            onPress={() =>
              setSelectedLanguage('english')
            }
            style={({ pressed }) => [
              styles.languageCard,

              selectedLanguage === 'english' &&
                styles.selectedCard,

              pressed && styles.pressedCard,
            ]}
          >
            <View style={styles.languageIconContainer}>
              <Text style={styles.languageIcon}>
                A
              </Text>
            </View>

            <View style={styles.languageContent}>
              <Text style={styles.languageName}>
                English Medium
              </Text>

              <Text style={styles.description}>
                Learn in English language
              </Text>
            </View>

            <View
              style={[
                styles.radioButton,

                selectedLanguage === 'english' &&
                  styles.selectedRadioButton,
              ]}
            >
              {selectedLanguage === 'english' && (
                <View style={styles.radioDot} />
              )}
            </View>
          </Pressable>

          {/* Marathi Medium */}
          <Pressable
            onPress={() =>
              setSelectedLanguage('marathi')
            }
            style={({ pressed }) => [
              styles.languageCard,

              selectedLanguage === 'marathi' &&
                styles.selectedCard,

              pressed && styles.pressedCard,
            ]}
          >
            <View style={styles.languageIconContainer}>
              <Text style={styles.languageIcon}>
                म
              </Text>
            </View>

            <View style={styles.languageContent}>
              <Text style={styles.languageName}>
                Marathi Medium
              </Text>

              <Text style={styles.marathiName}>
                मराठी माध्यम
              </Text>
            </View>

            <View
              style={[
                styles.radioButton,

                selectedLanguage === 'marathi' &&
                  styles.selectedRadioButton,
              ]}
            >
              {selectedLanguage === 'marathi' && (
                <View style={styles.radioDot} />
              )}
            </View>
          </Pressable>

        </View>

        {/* Continue Button */}
        <Button
          title="Continue"
          onPress={handleContinue}
          disabled={!selectedLanguage}
        />

      </View>
    </SafeAreaView>
  );
};

export default LanguageSelectionScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },

  marathiTitle: {
    fontSize: 21,
    fontWeight: '600',
    color: COLORS.primary,
    textAlign: 'center',
    marginTop: 8,
  },

  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 40,
  },

  options: {
    gap: 16,
    marginBottom: 32,
  },

  languageCard: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 20,

    flexDirection: 'row',
    alignItems: 'center',

    gap: 16,
  },

  selectedCard: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },

  pressedCard: {
    opacity: 0.8,
  },

  languageIconContainer: {
    width: 55,
    height: 55,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,

    alignItems: 'center',
    justifyContent: 'center',
  },

  languageIcon: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
  },

  languageContent: {
    flex: 1,
  },

  languageName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  marathiName: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,

    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedRadioButton: {
    borderColor: COLORS.primary,
  },

  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
});