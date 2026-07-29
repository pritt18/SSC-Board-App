import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS } from '../../constants/colors';
import { executeQuery } from '../../database/database';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { UserModel } from '../../database/models/User';

type Props = NativeStackScreenProps<AdminStackParamList, 'ManageStudents'>;

interface Student {
  id: number;
  full_name: string;
  email: string;
  class_id: number | null;
  class_name: string | null;
  class_number: number | null;
  medium: string;
  is_active: boolean;
}

const ManageStudentsScreen: React.FC<Props> = ({ navigation }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadStudents = async () => {
    try {
      setIsLoading(true);

      const studentData = await executeQuery(
        `SELECT 
          u.id,
          u.full_name,
          u.email,
          u.class_id,
          u.medium,
          u.is_active,
          c.name_english as class_name,
          c.class_number
        FROM users u
        LEFT JOIN classes c ON u.class_id = c.id
        WHERE u.role = 'student'
        ORDER BY u.full_name ASC`,
        []
      );

      setStudents(studentData as Student[]);
      setFilteredStudents(studentData as Student[]);
    } catch (error) {
      console.error('Error loading students:', error);
      Alert.alert('Error', 'Failed to load students');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadStudents();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadStudents();
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim() === '') {
      setFilteredStudents(students);
    } else {
      const filtered = students.filter(
        (student) =>
          student.full_name.toLowerCase().includes(text.toLowerCase()) ||
          student.email.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredStudents(filtered);
    }
  };

  const handleStudentPress = (student: Student) => {
    navigation.navigate('AssignClass', { studentId: student.id });
  };

  const handleToggleActive = async (student: Student) => {
    Alert.alert(
      `${student.is_active ? 'Deactivate' : 'Activate'} Student`,
      `Are you sure you want to ${student.is_active ? 'deactivate' : 'activate'} ${student.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: student.is_active ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await UserModel.update(student.id, {
                is_active: student.is_active ? 0 : 1,
              } as any);
              await loadStudents();
              Alert.alert('Success', `Student ${student.is_active ? 'deactivated' : 'activated'} successfully`);
            } catch (error) {
              console.error('Error toggling student status:', error);
              Alert.alert('Error', 'Failed to update student status');
            }
          },
        },
      ]
    );
  };

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading students...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Manage Students</Text>
          <Text style={styles.subtitle}>View and manage registered students</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search students..."
          value={searchQuery}
          onChangeText={handleSearch}
        />
        <View style={styles.summaryBadge}>
          <Text style={styles.summaryText}>{filteredStudents.length} students</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredStudents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎓</Text>
            <Text style={styles.emptyTitle}>No Students Found</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Try a different search' : 'Registered students will appear here'}
            </Text>
          </View>
        ) : (
          <View style={styles.studentList}>
            {filteredStudents.map((student) => (
              <Pressable
                key={student.id}
                onPress={() => handleStudentPress(student)}
                style={({ pressed }) => [
                  styles.studentCard,
                  pressed && styles.pressedCard,
                ]}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {student.full_name.charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.studentInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.studentName}>{student.full_name}</Text>
                    <View style={[
                      styles.statusBadge,
                      student.is_active ? styles.activeBadge : styles.inactiveBadge
                    ]}>
                      <Text style={styles.statusText}>
                        {student.is_active ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.studentEmail}>{student.email}</Text>

                  <View style={styles.detailsRow}>
                    <Text style={styles.mediumText}>
                      {student.medium === 'marathi' ? 'Marathi Medium' : 'English Medium'}
                    </Text>
                    {student.class_number && (
                      <Text style={styles.classText}>
                        Class {student.class_number}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  <Pressable
                    style={styles.assignButton}
                    onPress={() => handleStudentPress(student)}
                  >
                    <Text style={styles.assignButtonText}>Assign</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.toggleButton,
                      student.is_active ? styles.deactivateButton : styles.activateButton
                    ]}
                    onPress={() => handleToggleActive(student)}
                  >
                    <Text style={styles.toggleButtonText}>
                      {student.is_active ? '✕' : '✓'}
                    </Text>
                  </Pressable>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.background,
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
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
  },
  summaryBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  summaryText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 12,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  studentList: {
    gap: 12,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pressedCard: {
    opacity: 0.7,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: '800',
  },
  studentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeBadge: {
    backgroundColor: '#DCFCE7',
  },
  inactiveBadge: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '600',
  },
  studentEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
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
  actionButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  assignButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  assignButtonText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
  },
  toggleButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activateButton: {
    backgroundColor: '#DCFCE7',
  },
  deactivateButton: {
    backgroundColor: '#FEE2E2',
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: '700',
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

export default ManageStudentsScreen;