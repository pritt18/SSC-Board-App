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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS } from '../../constants/colors';
import { executeQuery } from '../../database/database';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<
  AdminStackParamList,
  'ManageClasses'
>;

interface ClassData {
  id: number;
  class_number: number;
  name_english: string;
  name_marathi: string;
  description_english?: string;
  description_marathi?: string;
  student_count: number;
  subject_count: number;
  is_active: number;
}

interface FormData {
  class_number: string;
  name_english: string;
  name_marathi: string;
  description_english: string;
  description_marathi: string;
}

const emptyForm: FormData = {
  class_number: '',
  name_english: '',
  name_marathi: '',
  description_english: '',
  description_marathi: '',
};

const ManageClassesScreen: React.FC<Props> = ({ navigation }) => {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassData | null>(null);

  const [formData, setFormData] =
    useState<FormData>(emptyForm);

  const [saving, setSaving] = useState(false);

  // ---------------------------------------------------------
  // LOAD CLASSES
  // ---------------------------------------------------------

  const loadClasses = async () => {
    try {
      setLoading(true);

      const classData = await executeQuery(
        `SELECT
          c.id,
          c.class_number,
          c.name_english,
          c.name_marathi,
          c.description_english,
          c.description_marathi,
          c.is_active,

          (
            SELECT COUNT(*)
            FROM users
            WHERE class_id = c.id
            AND role = 'student'
          ) AS student_count,

          (
            SELECT COUNT(*)
            FROM subjects
            WHERE class_id = c.id
          ) AS subject_count

        FROM classes c
        ORDER BY c.class_number ASC`,
        []
      );

      console.log('Classes loaded:', classData);

      setClasses(classData as ClassData[]);
    } catch (error) {
      console.error('Error loading classes:', error);

      if (Platform.OS === 'web') {
        window.alert('Failed to load classes');
      } else {
        Alert.alert('Error', 'Failed to load classes');
      }
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

  // ---------------------------------------------------------
  // FORM
  // ---------------------------------------------------------

  const openAddModal = () => {
    setEditingClass(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (classItem: ClassData) => {
    setEditingClass(classItem);

    setFormData({
      class_number: String(classItem.class_number),
      name_english: classItem.name_english || '',
      name_marathi: classItem.name_marathi || '',
      description_english:
        classItem.description_english || '',
      description_marathi:
        classItem.description_marathi || '',
    });

    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingClass(null);
    setFormData(emptyForm);
  };

  // ---------------------------------------------------------
  // VALIDATION
  // ---------------------------------------------------------

  const validateForm = async (): Promise<boolean> => {
    const classNumber =
      Number(formData.class_number.trim());

    const englishName =
      formData.name_english.trim();

    if (!formData.class_number.trim()) {
      showMessage(
        'Error',
        'Please enter class number.'
      );
      return false;
    }

    if (!Number.isInteger(classNumber)) {
      showMessage(
        'Error',
        'Class number must be a valid number.'
      );
      return false;
    }

    if (classNumber <= 0) {
      showMessage(
        'Error',
        'Class number must be greater than 0.'
      );
      return false;
    }

    if (!englishName) {
      showMessage(
        'Error',
        'Please enter class name in English.'
      );
      return false;
    }

    // Check duplicate class number
    const duplicate = await executeQuery(
      `SELECT id
       FROM classes
       WHERE class_number = ?
       AND id != ?`,
      [
        classNumber,
        editingClass?.id ?? -1,
      ]
    );

    if (duplicate.length > 0) {
      showMessage(
        'Duplicate Class',
        `Class ${classNumber} already exists.`
      );
      return false;
    }

    return true;
  };

  // ---------------------------------------------------------
  // CREATE / UPDATE
  // ---------------------------------------------------------

  const handleSaveClass = async () => {
    if (saving) return;

    try {
      const isValid = await validateForm();

      if (!isValid) return;

      setSaving(true);

      const classNumber =
        Number(formData.class_number.trim());

      const englishName =
        formData.name_english.trim();

      const marathiName =
        formData.name_marathi.trim() ||
        englishName;

      const descriptionEnglish =
        formData.description_english.trim();

      const descriptionMarathi =
        formData.description_marathi.trim();

      // UPDATE
      if (editingClass) {
        console.log(
          'Updating class:',
          editingClass.id
        );

        await executeQuery(
          `UPDATE classes
           SET
             class_number = ?,
             name_english = ?,
             name_marathi = ?,
             description_english = ?,
             description_marathi = ?
           WHERE id = ?`,
          [
            classNumber,
            englishName,
            marathiName,
            descriptionEnglish,
            descriptionMarathi,
            editingClass.id,
          ]
        );

        console.log(
          'Class updated successfully:',
          editingClass.id
        );

        closeModal();

        await loadClasses();

        showMessage(
          'Success',
          'Class updated successfully.'
        );

        return;
      }

      // CREATE
      console.log(
        'Creating class:',
        classNumber
      );

      await executeQuery(
        `INSERT INTO classes (
          class_number,
          name_english,
          name_marathi,
          description_english,
          description_marathi,
          is_active
        )
        VALUES (?, ?, ?, ?, ?, 1)`,
        [
          classNumber,
          englishName,
          marathiName,
          descriptionEnglish,
          descriptionMarathi,
        ]
      );

      console.log(
        'Class created successfully:',
        classNumber
      );

      closeModal();

      await loadClasses();

      showMessage(
        'Success',
        'Class added successfully.'
      );
    } catch (error) {
      console.error(
        'Error saving class:',
        error
      );

      showMessage(
        'Error',
        `Failed to ${
          editingClass ? 'update' : 'add'
        } class.`
      );
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------
  // TOGGLE ACTIVE
  // ---------------------------------------------------------

  const handleToggleActive = (
    classItem: ClassData
  ) => {
    const action = classItem.is_active
      ? 'deactivate'
      : 'activate';

    const message =
      `Are you sure you want to ${action} ` +
      `${classItem.name_english}?`;

    const confirmToggle = async () => {
      try {
        await executeQuery(
          `UPDATE classes
           SET is_active = ?
           WHERE id = ?`,
          [
            classItem.is_active ? 0 : 1,
            classItem.id,
          ]
        );

        console.log(
          'Class status updated:',
          classItem.id
        );

        await loadClasses();

        showMessage(
          'Success',
          `Class ${
            classItem.is_active
              ? 'deactivated'
              : 'activated'
          } successfully.`
        );
      } catch (error) {
        console.error(
          'Error toggling class:',
          error
        );

        showMessage(
          'Error',
          'Failed to update class status.'
        );
      }
    };

    confirmAction(
      `${classItem.is_active ? 'Deactivate' : 'Activate'} Class`,
      message,
      confirmToggle,
      classItem.is_active
        ? 'Deactivate'
        : 'Activate'
    );
  };

  // ---------------------------------------------------------
  // DELETE
  // ---------------------------------------------------------

  const handleDeleteClass = (
    classItem: ClassData
  ) => {
    const confirmDelete = async () => {
      try {
        console.log(
          'Checking related data for class:',
          classItem.id
        );

        const relatedStudents =
          await executeQuery(
            `SELECT COUNT(*) AS count
             FROM users
             WHERE class_id = ?
             AND role = 'student'`,
            [classItem.id]
          );

        const relatedSubjects =
          await executeQuery(
            `SELECT COUNT(*) AS count
             FROM subjects
             WHERE class_id = ?`,
            [classItem.id]
          );

        const studentCount =
          Number(relatedStudents[0]?.count || 0);

        const subjectCount =
          Number(relatedSubjects[0]?.count || 0);

        console.log(
          'Related data:',
          {
            students: studentCount,
            subjects: subjectCount,
          }
        );

        // Don't hard delete if related data exists
        if (
          studentCount > 0 ||
          subjectCount > 0
        ) {
          const details: string[] = [];

          if (studentCount > 0) {
            details.push(
              `${studentCount} student(s)`
            );
          }

          if (subjectCount > 0) {
            details.push(
              `${subjectCount} subject(s)`
            );
          }

          showMessage(
            'Cannot Delete Class',
            `${classItem.name_english} has related ${details.join(
              ' and '
            )}. Please deactivate the class instead.`
          );

          return;
        }

        console.log(
          'Deleting class:',
          classItem.id,
          classItem.name_english
        );

        await executeQuery(
          `DELETE FROM classes
           WHERE id = ?`,
          [classItem.id]
        );

        console.log(
          'Class deleted successfully:',
          classItem.id
        );

        await loadClasses();

        showMessage(
          'Success',
          'Class deleted successfully.'
        );
      } catch (error) {
        console.error(
          'Error deleting class:',
          error
        );

        showMessage(
          'Error',
          `Failed to delete class: ${
            error instanceof Error
              ? error.message
              : String(error)
          }`
        );
      }
    };

    confirmAction(
      'Delete Class',
      `Are you sure you want to delete "${classItem.name_english}"?`,
      confirmDelete,
      'Delete'
    );
  };

  // ---------------------------------------------------------
  // MANAGE SUBJECTS
  // ---------------------------------------------------------

  const handleManageSubjects = (
    classId: number
  ) => {
    navigation.navigate(
      'ManageSubjects',
      { classId }
    );
  };

  // ---------------------------------------------------------
  // MESSAGE / CONFIRM HELPERS
  // ---------------------------------------------------------

  const showMessage = (
    title: string,
    message: string
  ) => {
    if (Platform.OS === 'web') {
      window.alert(
        `${title}\n\n${message}`
      );
    } else {
      Alert.alert(
        title,
        message
      );
    }
  };

  const confirmAction = (
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>,
    confirmLabel: string
  ) => {
    if (Platform.OS === 'web') {
      const confirmed =
        window.confirm(
          `${title}\n\n${message}`
        );

      if (confirmed) {
        onConfirm();
      }

      return;
    }

    Alert.alert(
      title,
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: confirmLabel,
          style:
            confirmLabel === 'Delete' ||
            confirmLabel === 'Deactivate'
              ? 'destructive'
              : 'default',
          onPress: onConfirm,
        },
      ]
    );
  };

  // ---------------------------------------------------------
  // LOADING
  // ---------------------------------------------------------

  if (loading && !refreshing) {
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

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top']}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            navigation.goBack()
          }
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={COLORS.textPrimary}
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Manage Classes
        </Text>

        <TouchableOpacity
          style={styles.addClassButton}
          onPress={openAddModal}
        >
          <Ionicons
            name="add"
            size={24}
            color={COLORS.white}
          />
        </TouchableOpacity>
      </View>

      {/* CONTENT */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        {classes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="school-outline"
              size={60}
              color={COLORS.textSecondary}
            />

            <Text style={styles.emptyTitle}>
              No Classes Found
            </Text>

            <Text style={styles.emptyText}>
              Add your first class using the +
              button.
            </Text>
          </View>
        ) : (
          classes.map((classItem) => (
            <View
              key={classItem.id}
              style={styles.classCard}
            >
              {/* CLASS HEADER */}
              <View style={styles.classHeader}>
                <View style={styles.classTitle}>
                  <Text style={styles.className}>
                    {classItem.name_english}
                  </Text>

                  <Text
                    style={styles.classSubtitle}
                  >
                    Class {classItem.class_number}
                  </Text>

                  {classItem.name_marathi && (
                    <Text
                      style={
                        styles.marathiName
                      }
                    >
                      {classItem.name_marathi}
                    </Text>
                  )}
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    classItem.is_active
                      ? styles.activeBadge
                      : styles.inactiveBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          classItem.is_active
                            ? '#16A34A'
                            : '#DC2626',
                      },
                    ]}
                  >
                    {classItem.is_active
                      ? 'Active'
                      : 'Inactive'}
                  </Text>
                </View>
              </View>

              {/* STATS */}
              <View style={styles.classStats}>
                <View style={styles.statItem}>
                  <Ionicons
                    name="people-outline"
                    size={18}
                    color={COLORS.primary}
                  />

                  <Text
                    style={styles.statNumber}
                  >
                    {classItem.student_count}
                  </Text>

                  <Text
                    style={styles.statLabel}
                  >
                    Students
                  </Text>
                </View>

                <View
                  style={styles.statDivider}
                />

                <View style={styles.statItem}>
                  <Ionicons
                    name="book-outline"
                    size={18}
                    color={COLORS.primary}
                  />

                  <Text
                    style={styles.statNumber}
                  >
                    {classItem.subject_count}
                  </Text>

                  <Text
                    style={styles.statLabel}
                  >
                    Subjects
                  </Text>
                </View>
              </View>

              {/* ACTIONS */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.subjectsButton,
                  ]}
                  onPress={() =>
                    handleManageSubjects(
                      classItem.id
                    )
                  }
                >
                  <Ionicons
                    name="book-outline"
                    size={16}
                    color="#2563EB"
                  />

                  <Text
                    style={
                      styles.subjectsButtonText
                    }
                  >
                    Subjects
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.editButton,
                  ]}
                  onPress={() =>
                    openEditModal(classItem)
                  }
                >
                  <Ionicons
                    name="create-outline"
                    size={16}
                    color="#7C3AED"
                  />

                  <Text
                    style={styles.editButtonText}
                  >
                    Edit
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.toggleClassButton,
                  ]}
                  onPress={() =>
                    handleToggleActive(
                      classItem
                    )
                  }
                >
                  <Ionicons
                    name={
                      classItem.is_active
                        ? 'eye-off-outline'
                        : 'eye-outline'
                    }
                    size={16}
                    color={
                      classItem.is_active
                        ? '#D97706'
                        : '#16A34A'
                    }
                  />

                  <Text
                    style={[
                      styles.toggleClassText,
                      {
                        color:
                          classItem.is_active
                            ? '#D97706'
                            : '#16A34A',
                      },
                    ]}
                  >
                    {classItem.is_active
                      ? 'Deactivate'
                      : 'Activate'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* ADD / EDIT MODAL */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View
          style={styles.modalOverlay}
        >
          <View
            style={styles.modalContent}
          >
            <ScrollView
              showsVerticalScrollIndicator={
                false
              }
            >
              {/* MODAL HEADER */}
              <View
                style={styles.modalHeader}
              >
                <Text
                  style={styles.modalTitle}
                >
                  {editingClass
                    ? 'Edit Class'
                    : 'Add New Class'}
                </Text>

                <TouchableOpacity
                  onPress={closeModal}
                  disabled={saving}
                >
                  <Ionicons
                    name="close"
                    size={26}
                    color={
                      COLORS.textSecondary
                    }
                  />
                </TouchableOpacity>
              </View>

              {/* CLASS NUMBER */}
              <View
                style={styles.formGroup}
              >
                <Text style={styles.label}>
                  Class Number *
                </Text>

                <TextInput
                  style={styles.input}
                  value={
                    formData.class_number
                  }
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      class_number:
                        text.replace(
                          /[^0-9]/g,
                          ''
                        ),
                    })
                  }
                  keyboardType="numeric"
                  placeholder="e.g. 1, 2, 3..."
                  editable={!saving}
                />
              </View>

              {/* ENGLISH NAME */}
              <View
                style={styles.formGroup}
              >
                <Text style={styles.label}>
                  Class Name (English) *
                </Text>

                <TextInput
                  style={styles.input}
                  value={
                    formData.name_english
                  }
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      name_english: text,
                    })
                  }
                  placeholder="e.g. Class 1"
                  editable={!saving}
                />
              </View>

              {/* MARATHI NAME */}
              <View
                style={styles.formGroup}
              >
                <Text style={styles.label}>
                  Class Name (Marathi)
                </Text>

                <TextInput
                  style={styles.input}
                  value={
                    formData.name_marathi
                  }
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      name_marathi: text,
                    })
                  }
                  placeholder="e.g. इयत्ता १"
                  editable={!saving}
                />
              </View>

              {/* ENGLISH DESCRIPTION */}
              <View
                style={styles.formGroup}
              >
                <Text style={styles.label}>
                  Description (English)
                </Text>

                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                  ]}
                  value={
                    formData.description_english
                  }
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      description_english:
                        text,
                    })
                  }
                  placeholder="Enter description in English..."
                  multiline
                  numberOfLines={3}
                  editable={!saving}
                />
              </View>

              {/* MARATHI DESCRIPTION */}
              <View
                style={styles.formGroup}
              >
                <Text style={styles.label}>
                  Description (Marathi)
                </Text>

                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                  ]}
                  value={
                    formData.description_marathi
                  }
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      description_marathi:
                        text,
                    })
                  }
                  placeholder="Enter description in Marathi..."
                  multiline
                  numberOfLines={3}
                  editable={!saving}
                />
              </View>

              {/* BUTTONS */}
              <View
                style={styles.modalButtons}
              >
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.cancelButton,
                  ]}
                  onPress={closeModal}
                  disabled={saving}
                >
                  <Text
                    style={
                      styles.cancelButtonText
                    }
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.saveButton,
                    saving &&
                      styles.disabledButton,
                  ]}
                  onPress={handleSaveClass}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator
                      color={COLORS.white}
                    />
                  ) : (
                    <Text
                      style={
                        styles.saveButtonText
                      }
                    >
                      {editingClass
                        ? 'Update Class'
                        : 'Add Class'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ============================================================
// STYLES
// ============================================================

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

  marathiName: {
    fontSize: 13,
    color: COLORS.primary,
    marginTop: 3,
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
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
  },

  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 3,
  },

  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },

  statDivider: {
    width: 1,
    height: 35,
    backgroundColor: COLORS.border,
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 9,
    borderRadius: 8,
    gap: 5,
  },

  subjectsButton: {
    backgroundColor: '#EEF2FF',
    flex: 1.2,
  },

  subjectsButtonText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 12,
  },

  editButton: {
    backgroundColor: '#F3E8FF',
    flex: 0.7,
  },

  editButtonText: {
    color: '#7C3AED',
    fontWeight: '600',
    fontSize: 12,
  },

  toggleClassButton: {
    backgroundColor: '#F8FAFC',
    flex: 1.2,
  },

  toggleClassText: {
    fontWeight: '600',
    fontSize: 11,
  },

  emptyContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: 60,
    alignItems: 'center',
    marginTop: 10,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 15,
  },

  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 600,
    maxHeight: '90%',
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
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
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    backgroundColor: COLORS.white,
    color: COLORS.textPrimary,
  },

  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 5,
  },

  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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

  disabledButton: {
    opacity: 0.6,
  },
});

export default ManageClassesScreen;