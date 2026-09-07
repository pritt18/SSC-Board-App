import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { executeQuery } from '../../database/database';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<
  AdminStackParamList,
  'ManageSubjects'
>;

interface SubjectItem {
  id: number;
  name_english: string;
  name_marathi: string;
  icon: string;
  is_active: number;
  created_at: string;
}

const ManageSubjectsScreen: React.FC<Props> = ({
  navigation,
  route,
}) => {
  const { classId } = route.params;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [className, setClassName] = useState('');

  // ============================================================
  // LOAD SUBJECTS
  // ============================================================

  const loadSubjects = async () => {
    try {
      setLoading(true);

      // Get class name
      const classResult = await executeQuery(
        `SELECT name_english
         FROM classes
         WHERE id = ?`,
        [classId]
      );

      if (classResult.length > 0) {
        setClassName(classResult[0].name_english);
      }

      // Get subjects
      const items = await executeQuery(
        `SELECT
          id,
          name_english,
          name_marathi,
          icon,
          is_active,
          created_at
        FROM subjects
        WHERE class_id = ?
        ORDER BY name_english ASC`,
        [classId]
      );

      console.log('Subjects loaded:', items);

      setSubjects(items as SubjectItem[]);
    } catch (error) {
      console.error(
        'Error loading subjects:',
        error
      );

      showMessage(
        'Error',
        'Failed to load subjects.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSubjects();
    }, [classId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadSubjects();
  };

  // ============================================================
  // WEB / NATIVE MESSAGE
  // ============================================================

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

  // ============================================================
  // WEB / NATIVE CONFIRM
  // ============================================================

  const confirmAction = (
    title: string,
    message: string,
    confirmText: string,
    onConfirm: () => void | Promise<void>,
    destructive = false
  ) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
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
          text: confirmText,
          style: destructive
            ? 'destructive'
            : 'default',
          onPress: onConfirm,
        },
      ]
    );
  };

  // ============================================================
  // HIDE / SHOW SUBJECT
  // ============================================================

  const handleToggleActive = (
    id: number,
    currentStatus: number
  ) => {
    const action = currentStatus
      ? 'hide'
      : 'show';

    const confirmToggle = async () => {
      try {
        console.log(
          'Updating subject status:',
          {
            id,
            currentStatus,
            newStatus: currentStatus
              ? 0
              : 1,
          }
        );

        await executeQuery(
          `UPDATE subjects
           SET is_active = ?
           WHERE id = ?`,
          [
            currentStatus ? 0 : 1,
            id,
          ]
        );

        console.log(
          'Subject status updated successfully:',
          id
        );

        await loadSubjects();

        showMessage(
          'Success',
          `Subject ${
            currentStatus
              ? 'hidden'
              : 'shown'
          } successfully.`
        );
      } catch (error) {
        console.error(
          'Error updating subject status:',
          error
        );

        showMessage(
          'Error',
          'Failed to update subject status.'
        );
      }
    };

    confirmAction(
      `${currentStatus ? 'Hide' : 'Show'} Subject`,
      `Are you sure you want to ${action} this subject?`,
      currentStatus ? 'Hide' : 'Show',
      confirmToggle,
      currentStatus === 1
    );
  };

  // ============================================================
  // DELETE SUBJECT
  // ============================================================

  const handleDeleteSubject = (
    id: number,
    name: string
  ) => {
    const deleteSubject = async () => {
      try {
        console.log(
          'Deleting subject:',
          id,
          name
        );

        /*
         * First check whether content is linked
         * with this subject.
         */

        const videoResult =
          await executeQuery(
            `SELECT COUNT(*) AS count
             FROM videos
             WHERE subject_id = ?`,
            [id]
          );

        const pdfResult =
          await executeQuery(
            `SELECT COUNT(*) AS count
             FROM pdfs
             WHERE subject_id = ?`,
            [id]
          );

        const quizResult =
          await executeQuery(
            `SELECT COUNT(*) AS count
             FROM quizzes
             WHERE subject_id = ?`,
            [id]
          );

        const videoCount = Number(
          videoResult[0]?.count || 0
        );

        const pdfCount = Number(
          pdfResult[0]?.count || 0
        );

        const quizCount = Number(
          quizResult[0]?.count || 0
        );

        console.log(
          'Related subject content:',
          {
            videos: videoCount,
            pdfs: pdfCount,
            quizzes: quizCount,
          }
        );

        /*
         * Don't delete subject if content
         * is already associated with it.
         */

        if (
          videoCount > 0 ||
          pdfCount > 0 ||
          quizCount > 0
        ) {
          const relatedContent: string[] = [];

          if (videoCount > 0) {
            relatedContent.push(
              `${videoCount} video(s)`
            );
          }

          if (pdfCount > 0) {
            relatedContent.push(
              `${pdfCount} PDF(s)`
            );
          }

          if (quizCount > 0) {
            relatedContent.push(
              `${quizCount} quiz(zes)`
            );
          }

          showMessage(
            'Cannot Delete Subject',
            `"${name}" has associated ${relatedContent.join(
              ', '
            )}.\n\nPlease hide the subject instead of deleting it.`
          );

          return;
        }

        // Actual DELETE
        await executeQuery(
          `DELETE FROM subjects
           WHERE id = ?`,
          [id]
        );

        console.log(
          'Subject deleted successfully:',
          id
        );

        await loadSubjects();

        showMessage(
          'Success',
          'Subject deleted successfully.'
        );
      } catch (error) {
        console.error(
          'Error deleting subject:',
          error
        );

        showMessage(
          'Error',
          `Failed to delete subject: ${
            error instanceof Error
              ? error.message
              : String(error)
          }`
        );
      }
    };

    confirmAction(
      'Delete Subject',
      `Are you sure you want to delete "${name}"?\n\nThis action cannot be undone.`,
      'Delete',
      deleteSubject,
      true
    );
  };

  // ============================================================
  // FORMAT DATE
  // ============================================================

  const formatDate = (
    dateString: string
  ) => {
    if (!dateString) {
      return 'N/A';
    }

    const date = new Date(dateString);

    return date.toLocaleDateString(
      'en-US',
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }
    );
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <SafeAreaView
        style={styles.loadingContainer}
      >
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />

        <Text style={styles.loadingText}>
          Loading subjects...
        </Text>
      </SafeAreaView>
    );
  }

  // ============================================================
  // UI
  // ============================================================

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

        <Text
          style={styles.headerTitle}
          numberOfLines={1}
        >
          {className} - Subjects
        </Text>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() =>
            navigation.navigate(
              'AddSubject',
              { classId }
            )
          }
        >
          <Ionicons
            name="add"
            size={24}
            color={COLORS.white}
          />
        </TouchableOpacity>
      </View>

      {/* SUBJECT LIST */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        {subjects.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="book-outline"
              size={64}
              color="#CBD5E1"
            />

            <Text
              style={styles.emptyTitle}
            >
              No Subjects Found
            </Text>

            <Text
              style={styles.emptyText}
            >
              Add subjects to this class
            </Text>

            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() =>
                navigation.navigate(
                  'AddSubject',
                  { classId }
                )
              }
            >
              <Text
                style={
                  styles.emptyButtonText
                }
              >
                Add Subject
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          subjects.map((subject) => (
            <View
              key={subject.id}
              style={styles.subjectCard}
            >
              {/* STATUS */}
              <View
                style={styles.cardHeader}
              >
                <View
                  style={[
                    styles.statusBadge,
                    subject.is_active
                      ? styles.activeBadge
                      : styles.inactiveBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      subject.is_active
                        ? styles.activeText
                        : styles.inactiveText,
                    ]}
                  >
                    {subject.is_active
                      ? 'Active'
                      : 'Inactive'}
                  </Text>
                </View>
              </View>

              {/* SUBJECT INFO */}
              <View
                style={styles.cardBody}
              >
                <View
                  style={
                    styles.iconContainer
                  }
                >
                  <Text
                    style={styles.icon}
                  >
                    {subject.icon || '📚'}
                  </Text>
                </View>

                <View
                  style={styles.subjectInfo}
                >
                  <Text
                    style={styles.subjectName}
                  >
                    {subject.name_english}
                  </Text>

                  {subject.name_marathi && (
                    <Text
                      style={
                        styles.subjectMarathi
                      }
                    >
                      {subject.name_marathi}
                    </Text>
                  )}

                  <Text
                    style={
                      styles.subjectDate
                    }
                  >
                    Added:{' '}
                    {formatDate(
                      subject.created_at
                    )}
                  </Text>
                </View>
              </View>

              {/* ACTIONS */}
              <View
                style={styles.cardActions}
              >
                {/* EDIT */}
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.editButton,
                  ]}
                  onPress={() => {
                    console.log(
                      'Opening EditSubject:',
                      subject.id
                    );

                    navigation.navigate(
                      'EditSubject',
                      {
                        subjectId:
                          subject.id,
                      }
                    );
                  }}
                >
                  <Ionicons
                    name="create-outline"
                    size={16}
                    color="#2563EB"
                  />

                  <Text
                    style={
                      styles.editButtonText
                    }
                  >
                    Edit
                  </Text>
                </TouchableOpacity>

                {/* HIDE / SHOW */}
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.toggleButton,
                  ]}
                  onPress={() =>
                    handleToggleActive(
                      subject.id,
                      subject.is_active
                    )
                  }
                >
                  <Ionicons
                    name={
                      subject.is_active
                        ? 'eye-off-outline'
                        : 'eye-outline'
                    }
                    size={16}
                    color={
                      subject.is_active
                        ? '#D97706'
                        : '#16A34A'
                    }
                  />

                  <Text
                    style={[
                      styles.toggleButtonText,
                      {
                        color:
                          subject.is_active
                            ? '#D97706'
                            : '#16A34A',
                      },
                    ]}
                  >
                    {subject.is_active
                      ? 'Hide'
                      : 'Show'}
                  </Text>
                </TouchableOpacity>

                {/* DELETE */}
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.deleteButton,
                  ]}
                  onPress={() =>
                    handleDeleteSubject(
                      subject.id,
                      subject.name_english
                    )
                  }
                >
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color="#DC2626"
                  />

                  <Text
                    style={
                      styles.deleteButtonText
                    }
                  >
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },

  loadingText: {
    marginTop: 12,
    color: '#64748B',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },

  backButton: {
    padding: 4,
  },

  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginLeft: 12,
  },

  addButton: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    padding: 16,
    paddingBottom: 40,
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 16,
  },

  emptyText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },

  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
  },

  emptyButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },

  subjectCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },

  activeBadge: {
    backgroundColor: '#DCFCE7',
  },

  inactiveBadge: {
    backgroundColor: '#FEE2E2',
  },

  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },

  activeText: {
    color: '#16A34A',
  },

  inactiveText: {
    color: '#DC2626',
  },

  cardBody: {
    flexDirection: 'row',
    padding: 14,
    paddingTop: 8,
  },

  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  icon: {
    fontSize: 24,
  },

  subjectInfo: {
    flex: 1,
    marginLeft: 12,
  },

  subjectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },

  subjectMarathi: {
    fontSize: 13,
    color: '#4F46E5',
    marginTop: 1,
  },

  subjectDate: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
  },

  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    flex: 1,
    justifyContent: 'center',
  },

  editButton: {
    backgroundColor: '#EEF2FF',
  },

  editButtonText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '500',
  },

  toggleButton: {
    backgroundColor: '#F8FAFC',
  },

  toggleButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },

  deleteButton: {
    backgroundColor: '#FEE2E2',
  },

  deleteButtonText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
});

export default ManageSubjectsScreen;