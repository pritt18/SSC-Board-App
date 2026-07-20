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

type Language = 'marathi' | 'english';

interface Props {
  onContinue: () => void;
}

const LanguageSelectionScreen: React.FC<Props> = ({
  onContinue,
}) => {
  const [selectedLanguage, setSelectedLanguage] =
    useState<Language | null>(null);

  const handleContinue = () => {
    if (!selectedLanguage) {
      return;
    }

    console.log(
      'Selected Language:',
      selectedLanguage,
    );

    onContinue();
  };

  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.content}>

        <Text style={styles.title}>
          Choose Your Language
        </Text>

        <Text style={styles.marathiTitle}>
          तुमची भाषा निवडा
        </Text>

        <Text style={styles.subtitle}>
          You can change this later from settings.
        </Text>

        <View style={styles.options}>

          <Pressable
            onPress={() =>
              setSelectedLanguage('marathi')
            }
            style={[
              styles.languageCard,

              selectedLanguage === 'marathi' &&
                styles.selectedCard,
            ]}
          >

            <Text style={styles.languageIcon}>
              म
            </Text>

            <View>

              <Text style={styles.languageName}>
                मराठी
              </Text>

              <Text style={styles.description}>
                Marathi Medium
              </Text>

            </View>

          </Pressable>

          <Pressable
            onPress={() =>
              setSelectedLanguage('english')
            }
            style={[
              styles.languageCard,

              selectedLanguage === 'english' &&
                styles.selectedCard,
            ]}
          >

            <Text style={styles.languageIcon}>
              A
            </Text>

            <View>

              <Text style={styles.languageName}>
                English
              </Text>

              <Text style={styles.description}>
                English Medium
              </Text>

            </View>

          </Pressable>

        </View>

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
    fontSize: 22,
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

    gap: 20,
  },

  selectedCard: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },

  languageIcon: {
    width: 55,
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
  },

  languageName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
});