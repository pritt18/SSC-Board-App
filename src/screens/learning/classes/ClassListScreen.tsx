import React, { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import { COLORS } from '../../../constants/colors';
import { useAuth } from '../../../context/AuthContext';
import { LicenseService } from '../../../services/licenseService';

import {
  LearningStackParamList,
} from '../../../navigation/navigationTypes';

type Props = NativeStackScreenProps<
  LearningStackParamList,
  'ClassList'
>;

const classes = [
  { id: 1, name: 'Class 1' },
  { id: 2, name: 'Class 2' },
  { id: 3, name: 'Class 3' },
  { id: 4, name: 'Class 4' },
  { id: 5, name: 'Class 5' },
  { id: 6, name: 'Class 6' },
  { id: 7, name: 'Class 7' },
  { id: 8, name: 'Class 8' },
  { id: 9, name: 'Class 9' },
  { id: 10, name: 'Class 10' },
];

const MyClassesScreen: React.FC<Props> = ({
  navigation,
}) => {
  const { user } = useAuth();

  const [isLicensed, setIsLicensed] = useState<boolean | null>(null);
  const [checkingLicense, setCheckingLicense] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const checkLicense = async () => {
        if (!user?.id || !user?.class_id) {
          setIsLicensed(null);
          setCheckingLicense(false);
          return;
        }
        setCheckingLicense(true);
        try {
          const licensed = await LicenseService.isClassLicensed(
            user.id,
            user.class_id,
          );
          setIsLicensed(licensed);
        } catch (error) {
          console.error('Error checking license:', error);
          setIsLicensed(false);
        } finally {
          setCheckingLicense(false);
        }
      };

      checkLicense();
    }, [user?.id, user?.class_id]),
  );

  const handleClassPress = (
    classId: number,
    unlocked: boolean,
  ) => {
    if (!unlocked) {
      return;
    }

    if (isLicensed) {
      navigation.navigate('SubjectList', {
        classId,
      });
    } else {
      navigation.navigate('LicenseActivation', {
        classId,
      });
    }
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top']}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>
            My Classes
          </Text>

          <Text style={styles.subtitle}>
            Select your class to start learning
          </Text>
        </View>

        <View style={styles.grid}>
          {classes.map(item => {
            // Dynamically unlock the class assigned
            // to the currently logged-in user.
            const unlocked =
              user?.class_id === item.id;

            return (
              <Pressable
                key={item.id}
                onPress={() =>
                  handleClassPress(
                    item.id,
                    unlocked,
                  )
                }
                style={({ pressed }) => [
                  styles.classCard,

                  unlocked &&
                    styles.unlockedCard,

                  pressed &&
                    unlocked &&
                    styles.pressedCard,
                ]}
              >
                <View
                  style={[
                    styles.classNumber,

                    unlocked &&
                      styles.unlockedNumber,
                  ]}
                >
                  <Text
                    style={[
                      styles.classNumberText,

                      unlocked &&
                        styles.unlockedNumberText,
                    ]}
                  >
                    {item.id}
                  </Text>
                </View>

                <Text style={styles.className}>
                  {item.name}
                </Text>

                <Text
                  style={[
                    styles.status,

                    unlocked && isLicensed
                      ? styles.unlockedText
                      : styles.lockedText,
                  ]}
                >
                  {!unlocked
                    ? '🔒 Locked'
                    : checkingLicense
                    ? 'Checking...'
                    : isLicensed
                    ? '✓ Unlocked'
                    : '🔑 Activate License'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default MyClassesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    marginBottom: 30,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 5,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
  },

  classCard: {
    width: '47%',
    minHeight: 175,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    opacity: 0.65,
  },

  unlockedCard: {
    borderColor: COLORS.primary,
    opacity: 1,
  },

  pressedCard: {
    opacity: 0.8,
  },

  classNumber: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  unlockedNumber: {
    backgroundColor: COLORS.primary,
  },

  classNumberText: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },

  unlockedNumberText: {
    color: COLORS.white,
  },

  className: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 14,
  },

  status: {
    fontSize: 12,
    marginTop: 7,
    fontWeight: '600',
  },

  unlockedText: {
    color: COLORS.success,
  },

  lockedText: {
    color: COLORS.textSecondary,
  },
});