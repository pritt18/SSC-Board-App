import React, {
  useCallback,
  useState,
} from 'react';

import {
  ActivityIndicator,
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
import { executeQuery } from '../../../database/database';
import { UserModel } from '../../../database/models/User';

import {
  LearningStackParamList,
} from '../../../navigation/navigationTypes';

type Props = NativeStackScreenProps<
  LearningStackParamList,
  'ClassList'
>;

interface ClassItem {
  id: number;
  class_number: number;
  name_english: string;
  name_marathi: string;
  is_active: number | boolean;
}

const MyClassesScreen: React.FC<Props> = ({
  navigation,
}) => {
  const { user, updateUser } = useAuth();

  const [classes, setClasses] =
    useState<ClassItem[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const loadClasses = async () => {
    try {
      setIsLoading(true);

      const classData = await executeQuery(
        `SELECT *
         FROM classes
         WHERE is_active = ?
         ORDER BY class_number ASC`,
        [1],
      );

      setClasses(
        classData as ClassItem[],
      );

      // Get latest student data from database
      if (user?.id) {
        const latestUser =
          await UserModel.findById(user.id);

        if (latestUser) {
          await updateUser({
            class_id: latestUser.class_id,
          });

          console.log(
            'Student assigned class:',
            latestUser.class_id,
          );
        }
      }
    } catch (error) {
      console.error(
        'Error loading classes:',
        error,
      );
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadClasses();
    }, [user?.id]),
  );

  const handleClassPress = (
    classId: number,
    unlocked: boolean,
  ) => {
    if (!unlocked) {
      return;
    }

    navigation.navigate(
      'SubjectList',
      {
        classId,
      },
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={styles.loadingContainer}
      >
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />

        <Text style={styles.loadingText}>
          Loading classes...
        </Text>
      </SafeAreaView>
    );
  }

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

        {classes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>
              No Classes Available
            </Text>

            <Text style={styles.emptyText}>
              Classes will appear here when available.
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {classes.map(item => {
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
                      {item.class_number}
                    </Text>
                  </View>

                  <Text
                    style={styles.className}
                  >
                    {item.name_english}
                  </Text>

                  <Text
                    style={[
                      styles.status,

                      unlocked
                        ? styles.unlockedText
                        : styles.lockedText,
                    ]}
                  >
                    {unlocked
                      ? 'Unlocked'
                      : '🔒 Locked'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
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

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },

  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
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

  emptyContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 30,
    alignItems: 'center',
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 6,
    textAlign: 'center',
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