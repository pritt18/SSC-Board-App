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
import { Ionicons } from '@expo/vector-icons';

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

  const [licensedClasses, setLicensedClasses] = useState<Record<number, boolean>>({});
  const [checkingLicense, setCheckingLicense] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const checkLicenses = async () => {
        if (!user?.id) {
          setCheckingLicense(false);
          return;
        }
        setCheckingLicense(true);
        try {
          const map: Record<number, boolean> = {};
          for (const c of classes) {
            const licensed = await LicenseService.isClassLicensed(user.id, c.id);
            map[c.id] = licensed;
          }
          setLicensedClasses(map);
        } catch (error) {
          console.error('Error checking licenses:', error);
        } finally {
          setCheckingLicense(false);
        }
      };

      checkLicenses();
    }, [user?.id, user?.class_id]),
  );

  const handleClassPress = (
    classId: number,
  ) => {
    const isLicensed = user?.role === 'admin' || Boolean(licensedClasses[classId]);

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
            const isAssigned = user?.class_id === item.id;
            const isLicensed = user?.role === 'admin' || Boolean(licensedClasses[item.id]);
            const unlocked = isAssigned || isLicensed;

            return (
              <Pressable
                key={item.id}
                onPress={() =>
                  handleClassPress(
                    item.id,
                  )
                }
                style={({ pressed }) => [
                  styles.classCard,

                  unlocked &&
                    styles.unlockedCard,

                  pressed &&
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

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
                  <Text
                    style={[
                      styles.status,

                      isLicensed
                        ? styles.unlockedText
                        : styles.lockedText,
                    ]}
                  >
                    {checkingLicense
                      ? 'Checking...'
                      : isLicensed
                      ? '✓ Unlocked'
                      : '🔑 Activate License'}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={isLicensed ? COLORS.success : COLORS.primary} style={{ marginLeft: 2 }} />
                </View>
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