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
import {
  useFocusEffect,
} from '@react-navigation/native';
import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import { COLORS } from '../../constants/colors';
import {
  User,
  UserModel,
} from '../../database/models/User';
import {
  AdminStackParamList,
} from '../../navigation/AdminNavigator';

type Props = NativeStackScreenProps<
  AdminStackParamList,
  'ManageStudents'
>;

const ManageStudentsScreen: React.FC<Props> = ({
  navigation,
}) => {
  const [students, setStudents] =
    useState<User[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const loadStudents = async () => {
    try {
      setIsLoading(true);

      const studentData =
        await UserModel.findByRole('student');

      setStudents(studentData);
    } catch (error) {
      console.error(
        'Error loading students:',
        error,
      );
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadStudents();
    }, []),
  );

  const handleStudentPress = (
    student: User,
  ) => {
    if (!student.id) {
      return;
    }

    navigation.navigate('AssignClass', {
      studentId: student.id,
    });
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
          Loading students...
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
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>
              ‹
            </Text>
          </Pressable>

          <View style={styles.headerContent}>
            <Text style={styles.title}>
              Manage Students
            </Text>

            <Text style={styles.subtitle}>
              View and manage registered students
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>
            {students.length}
          </Text>

          <Text style={styles.summaryText}>
            Total Students
          </Text>
        </View>

        {students.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>
              🎓
            </Text>

            <Text style={styles.emptyTitle}>
              No Students Found
            </Text>

            <Text style={styles.emptyText}>
              Registered students will appear here.
            </Text>
          </View>
        ) : (
          <View style={styles.studentList}>
            {students.map(student => (
              <Pressable
                key={student.id}
                onPress={() =>
                  handleStudentPress(student)
                }
                style={({ pressed }) => [
                  styles.studentCard,
                  pressed &&
                    styles.pressedCard,
                ]}
              >
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

                  <View style={styles.detailsRow}>
                    <Text style={styles.mediumText}>
                      {student.medium ===
                      'marathi'
                        ? 'Marathi Medium'
                        : 'English Medium'}
                    </Text>

                    <Text
                      style={[
                        styles.classText,
                        !student.class_id &&
                          styles.noClassText,
                      ]}
                    >
                      {student.class_id
                        ? `Class ${student.class_id}`
                        : 'No Class Assigned'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.arrow}>
                  ›
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ManageStudentsScreen;

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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
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
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 5,
  },

  summaryCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    padding: 20,
    marginBottom: 25,
  },

  summaryNumber: {
    color: COLORS.white,
    fontSize: 30,
    fontWeight: '800',
  },

  summaryText: {
    color: COLORS.white,
    fontSize: 14,
    marginTop: 4,
    opacity: 0.9,
  },

  studentList: {
    gap: 14,
  },

  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  pressedCard: {
    opacity: 0.75,
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    color: COLORS.primary,
    fontSize: 21,
    fontWeight: '800',
  },

  studentInfo: {
    flex: 1,
    marginLeft: 14,
  },

  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  studentEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
  },

  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },

  mediumText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },

  classText: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: '600',
  },

  noClassText: {
    color: COLORS.textSecondary,
  },

  arrow: {
    fontSize: 28,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },

  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },

  emptyIcon: {
    fontSize: 50,
  },

  emptyTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 15,
  },

  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
});