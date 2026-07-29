// src/screens/admin/ManageClassesScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS } from '../../constants/colors';
import { executeQuery } from '../../database/database';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<AdminStackParamList, 'ManageClasses'>;

interface ClassData {
  id: number;
  class_number: number;
  name_english: string;
  name_marathi: string;
  student_count: number;
  subject_count: number;
  is_active: number;
}

const ManageClassesScreen: React.FC<Props> = ({ navigation }) => {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    class_number: '',
    name_english: '',
    name_marathi: '',
    description_english: '',
    description_marathi: '',
  });

  const loadClasses = async () => {
    try {
      setLoading(true);

      const classData = await executeQuery(
        `SELECT 
          c.id,
          c.class_number,
          c.name_english,
          c.name_marathi,
          c.is_active,
          (SELECT COUNT(*) FROM users WHERE class_id = c.id AND role = 'student') as student_count,
          (SELECT COUNT(*) FROM subjects WHERE class_id = c.id) as subject_count
        FROM classes c
        ORDER BY c.class_number ASC`,
        []
      );

      setClasses(classData as ClassData[]);
    } catch (error) {
      console.error('Error loading classes:', error);
      Alert.alert('Error', 'Failed to load classes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadClasses();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadClasses();
  };

  const handleAddClass = async () => {
    if (!formData.class_number || !formData.name_english) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      await executeQuery(
        `INSERT INTO classes (
          class_number,
          name_english,
          name_marathi,
          description_english,
          description_marathi,
          is_active
        ) VALUES (?, ?, ?, ?, ?, 1)`,
        [
          parseInt(formData.class_number),
          formData.name_english,
          formData.name_marathi || formData.name_english,
          formData.description_english || '',
          formData.description_marathi || '',
        ]
      );

      setShowModal(false);
      setFormData({
        class_number: '',
        name_english: '',
        name_marathi: '',
        description_english: '',
        description_marathi: '',
      });
      await loadClasses();
      Alert.alert('Success', 'Class added successfully');
    } catch (error) {
      console.error('Error adding class:', error);
      Alert.alert('Error', 'Failed to add class');
    }
  };

  const handleToggleActive = async (classItem: ClassData) => {
    Alert.alert(
      `${classItem.is_active ? 'Deactivate' : 'Activate'} Class`,
      `Are you sure you want to ${classItem.is_active ? 'deactivate' : 'activate'} ${classItem.name_english}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: classItem.is_active ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await executeQuery(
                `UPDATE classes SET is_active = ? WHERE id = ?`,
                [classItem.is_active ? 0 : 1, classItem.id]
              );
              await loadClasses();
              Alert.alert('Success', `Class ${classItem.is_active ? 'deactivated' : 'activated'} successfully`);
            } catch (error) {
              console.error('Error toggling class:', error);
              Alert.alert('Error', 'Failed to update class');
            }
          },
        },
      ]
    );
  };

  // ✅ Navigate to ManageSubjects with classId - NOT EditVideo
  const handleManageSubjects = (classId: number) => {
    navigation.navigate('ManageSubjects', { classId });
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading classes...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Classes</Text>
        <TouchableOpacity style={styles.addClassButton} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {classes.map((classItem) => (
          <View key={classItem.id} style={styles.classCard}>
            <View style={styles.classHeader}>
              <View style={styles.classTitle}>
                <Text style={styles.className}>{classItem.name_english}</Text>
                <Text style={styles.classSubtitle}>Class {classItem.class_number}</Text>
              </View>
              <View style={[styles.statusBadge, 
                classItem.is_active ? styles.activeBadge : styles.inactiveBadge
              ]}>
                <Text style={styles.statusText}>
                  {classItem.is_active ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>

            <View style={styles.classStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{classItem.student_count}</Text>
                <Text style={styles.statLabel}>Students</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{classItem.subject_count}</Text>
                <Text style={styles.statLabel}>Subjects</Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              {/* ✅ Navigate to ManageSubjects - CORRECT */}
              <TouchableOpacity
                style={[styles.actionButton, styles.subjectsButton]}
                onPress={() => handleManageSubjects(classItem.id)}
              >
                <Ionicons name="book-outline" size={16} color="#2563EB" />
                <Text style={styles.subjectsButtonText}>Manage Subjects</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.toggleClassButton]}
                onPress={() => handleToggleActive(classItem)}
              >
                <Ionicons 
                  name={classItem.is_active ? 'eye-off-outline' : 'eye-outline'} 
                  size={16} 
                  color={classItem.is_active ? '#D97706' : '#16A34A'} 
                />
                <Text style={[styles.toggleClassText, { color: classItem.is_active ? '#D97706' : '#16A34A' }]}>
                  {classItem.is_active ? 'Deactivate' : 'Activate'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Add Class Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Class</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Class Number *</Text>
              <TextInput
                style={styles.input}
                value={formData.class_number}
                onChangeText={(text) => setFormData({ ...formData, class_number: text })}
                keyboardType="numeric"
                placeholder="e.g., 1, 2, 3..."
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Class Name (English) *</Text>
              <TextInput
                style={styles.input}
                value={formData.name_english}
                onChangeText={(text) => setFormData({ ...formData, name_english: text })}
                placeholder="e.g., Class 1"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Class Name (Marathi)</Text>
              <TextInput
                style={styles.input}
                value={formData.name_marathi}
                onChangeText={(text) => setFormData({ ...formData, name_marathi: text })}
                placeholder="e.g., इयत्ता १"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description (English)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description_english}
                onChangeText={(text) => setFormData({ ...formData, description_english: text })}
                placeholder="Enter description in English..."
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description (Marathi)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description_marathi}
                onChangeText={(text) => setFormData({ ...formData, description_marathi: text })}
                placeholder="Enter description in Marathi..."
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleAddClass}
              >
                <Text style={styles.saveButtonText}>Add Class</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginLeft: 12,
  },
  addClassButton: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 20,
  },
  classCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  classTitle: {
    flex: 1,
  },
  className: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  classSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#DCFCE7',
  },
  inactiveBadge: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  classStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
    gap: 6,
  },
  subjectsButton: {
    backgroundColor: '#EEF2FF',
  },
  subjectsButtonText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 13,
  },
  toggleClassButton: {
    backgroundColor: '#F8FAFC',
  },
  toggleClassText: {
    fontWeight: '600',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    backgroundColor: COLORS.white,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.border,
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  saveButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
});

export default ManageClassesScreen;