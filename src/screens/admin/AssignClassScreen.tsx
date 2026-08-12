import React, {
  useCallback,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import { COLORS } from '../../constants/colors';
import { executeQuery } from '../../database/database';

import {
  User,
  UserModel,
} from '../../database/models/User';

import {
  AdminStackParamList,
} from '../../navigation/AdminNavigator';

type Props = NativeStackScreenProps<
  AdminStackParamList,
  'AssignClass'
>;

interface ClassItem {
  id: number;
  class_number: number;
  name_english: string;
  name_marathi: string;
  is_active: number | boolean;
}

const AssignClassScreen: React.FC<Props> = ({
  navigation,
  route,
}) => {
  const { studentId } = route.params;

  const [student, setStudent] =
    useState<User | null>(null);

  const [classes, setClasses] =
    useState<ClassItem[]>([]);

  const [selectedClassId, setSelectedClassId] =
    useState<number | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);

      const studentData =
        await UserModel.findById(studentId);

      const classData = await executeQuery(
        `SELECT *
         FROM classes
         WHERE is_active = ?
         ORDER BY class_number ASC`,
        [1],
      );

      console.log(
        'Student loaded:',
        studentData,
      );

      console.log(
        'Classes loaded:',
        classData,
      );

      setStudent(studentData);

      setClasses(
        classData as ClassItem[],
      );

      if (studentData?.class_id) {
        setSelectedClassId(
          studentData.class_id,
        );
      } else {
        setSelectedClassId(null);
      }
    } catch (error) {
      console.error(
        'Error loading assign class data:',
        error,
      );
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [studentId]),
  );

  const handleClassSelect = (
    classId: number,
  ) => {
    console.log(
      'Selected class:',
      classId,
    );

    setSelectedClassId(classId);
  };

  const handleAssignClass = async () => {
    if (selectedClassId === null) {
      Alert.alert(
        'Select Class',
        'Please select a class first.',
      );

      return;
    }

    try {
      setIsSaving(true);

      console.log(
        'Assigning class:',
        {
          studentId,
          selectedClassId,
        },
      );

      await UserModel.update(
        studentId,
        {
          class_id: selectedClassId,
        },
      );

      console.log(
        'Class assigned successfully:',
        {
          studentId,
          classId: selectedClassId,
        },
      );

      navigation.goBack();
    } catch (error) {
      console.error(
        'Error assigning class:',
        error,
      );

      Alert.alert(
        'Error',
        'Could not assign class.',
      );
    } finally {
      setIsSaving(false);
    }
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
          <Pressable
            style={styles.backButton}
            onPress={() =>
              navigation.goBack()
            }
          >
            <Text style={styles.backText}>
              ‹
            </Text>
          </Pressable>

          <View style={styles.headerContent}>
            <Text style={styles.title}>
              Assign Class
            </Text>

            <Text style={styles.subtitle}>
              Select class access for this user
            </Text>
          </View>
        </View>

        {student && (
          <View style={styles.studentCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {student.full_name
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            </View>

            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>
                {student.full_name}
              </Text>

              <Text style={styles.studentEmail}>
                {student.email}
              </Text>

              <Text style={styles.currentClass}>
                {student.class_id
                  ? `Currently assigned: Class ${student.class_id}`
                  : 'No class currently assigned'}
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>
          Select Class
        </Text>

        {classes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No classes available.
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {classes.map(item => {
              const isSelected =
                selectedClassId === item.id;

              return (
                <Pressable
                  key={item.id}
                  onPress={() =>
                    handleClassSelect(
                      item.id,
                    )
                  }
                  style={({ pressed }) => [
                    styles.classCard,

                    isSelected &&
                      styles.selectedCard,

                    pressed &&
                      styles.pressedCard,
                  ]}
                >
                  <View
                    style={[
                      styles.classNumber,

                      isSelected &&
                        styles.selectedNumber,
                    ]}
                  >
                    <Text
                      style={[
                        styles.classNumberText,

                        isSelected &&
                          styles.selectedNumberText,
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
                      styles.selectText,

                      isSelected &&
                        styles.selectedText,
                    ]}
                  >
                    {isSelected
                      ? '✓ Selected'
                      : 'Select'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Pressable
          disabled={
            selectedClassId === null ||
            isSaving
          }
          onPress={handleAssignClass}
          style={({ pressed }) => [
            styles.assignButton,

            (selectedClassId === null ||
              isSaving) &&
              styles.disabledButton,

            pressed &&
              selectedClassId !== null &&
              !isSaving &&
              styles.pressedButton,
          ]}
        >
          {isSaving ? (
            <ActivityIndicator
              color={COLORS.white}
            />
          ) : (
            <Text
              style={styles.assignButtonText}
            >
              Assign Class
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AssignClassScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  backText: {
    fontSize: 30,
    color: COLORS.textPrimary,
    marginTop: -4,
  },

  headerContent: {
    flex: 1,
  },

  title: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 3,
  },

  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 30,
  },

  avatar: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: '800',
  },

  studentInfo: {
    flex: 1,
    marginLeft: 14,
  },

  studentName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  studentEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
  },

  currentClass: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 7,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 18,
  },

  emptyContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
  },

  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
  },

  classCard: {
    width: '47%',
    minHeight: 150,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
  },

  selectedCard: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },

  pressedCard: {
    opacity: 0.75,
  },

  classNumber: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedNumber: {
    backgroundColor: COLORS.primary,
  },

  classNumberText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },

  selectedNumberText: {
    color: COLORS.white,
  },

  className: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 10,
  },

  selectText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 5,
  },

  selectedText: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  assignButton: {
    backgroundColor: COLORS.primary,
    minHeight: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
  },

  disabledButton: {
    opacity: 0.5,
  },

  pressedButton: {
    opacity: 0.8,
  },

  assignButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});