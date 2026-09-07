// src/screens/admin/ManageQuizzesScreen.tsx

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
  Modal,
  TextInput,
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
  'ManageQuizzes'
>;

interface QuizItem {
  id: number;
  title: string;
  title_marathi: string;
  subject: string;
  subject_id: number;
  classNumber: number;
  className: string;
  isActive: boolean | number;
  created_at: string;
  total_questions: number;
  time_limit: number;
  passing_percentage: number;
  description: string;
  type: string;
}

interface QuestionItem {
  id: number;
  quiz_id: number;
  question_text_english: string;
  question_text_marathi: string;
  option_a_english: string;
  option_a_marathi: string;
  option_b_english: string;
  option_b_marathi: string;
  option_c_english: string | null;
  option_c_marathi: string | null;
  option_d_english: string | null;
  option_d_marathi: string | null;
  correct_answer: string;
  explanation_english: string | null;
  explanation_marathi: string | null;
  difficulty: string | null;
  sort_order: number;
}

const isActiveValue = (value: boolean | number) => {
  return value === true || value === 1;
};

/**
 * Web browser:
 * Alert.alert() with button callbacks does not work reliably.
 * Therefore window.confirm/window.alert are used on web.
 *
 * Android/iOS:
 * Normal React Native Alert is used.
 */
const confirmAction = (
  title: string,
  message: string,
  onConfirm: () => void | Promise<void>,
  confirmText: string = 'Confirm'
) => {
  if (Platform.OS === 'web') {
    const confirmed = window.confirm(
      `${title}\n\n${message}\n\nClick OK to ${confirmText.toLowerCase()}.`
    );

    if (confirmed) {
      void onConfirm();
    }

    return;
  }

  Alert.alert(title, message, [
    {
      text: 'Cancel',
      style: 'cancel',
    },
    {
      text: confirmText,
      style: 'destructive',
      onPress: () => {
        void onConfirm();
      },
    },
  ]);
};

const showSuccess = (message: string) => {
  if (Platform.OS === 'web') {
    window.alert(message);
  } else {
    Alert.alert('Success', message);
  }
};

const showError = (message: string) => {
  if (Platform.OS === 'web') {
    window.alert(message);
  } else {
    Alert.alert('Error', message);
  }
};

const ManageQuizzesScreen: React.FC<Props> = ({
  navigation,
}) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [filteredQuizzes, setFilteredQuizzes] =
    useState<QuizItem[]>([]);

  const [searchQuery, setSearchQuery] = useState('');

  const [showFilterModal, setShowFilterModal] =
    useState(false);

  const [selectedClass, setSelectedClass] =
    useState<string>('all');

  const [classes, setClasses] = useState<
    { id: number; name: string }[]
  >([]);

  // Questions modal
  const [showQuestionsModal, setShowQuestionsModal] =
    useState(false);

  const [selectedQuiz, setSelectedQuiz] =
    useState<QuizItem | null>(null);

  const [questions, setQuestions] =
    useState<QuestionItem[]>([]);

  const [questionsLoading, setQuestionsLoading] =
    useState(false);

  /**
   * Load quizzes
   */
  const loadQuizzes = async () => {
    try {
      setLoading(true);

      let query = `
        SELECT
          q.id,
          q.title_english AS title,
          q.title_marathi,
          s.name_english AS subject,
          q.subject_id,
          c.class_number AS classNumber,
          c.name_english AS className,
          q.is_active AS isActive,
          q.created_at,
          q.total_questions,
          q.time_limit,
          q.passing_percentage,
          q.description_english AS description,
          q.type
        FROM quizzes q
        JOIN subjects s
          ON q.subject_id = s.id
        JOIN classes c
          ON s.class_id = c.id
      `;

      const params: any[] = [];

      if (selectedClass !== 'all') {
        query += ` WHERE c.id = ?`;
        params.push(parseInt(selectedClass, 10));
      }

      query += ` ORDER BY q.id DESC`;

      console.log('Loading quizzes:', query, params);

      const items = await executeQuery(
        query,
        params
      );

      const quizItems = items as QuizItem[];

      setQuizzes(quizItems);

      // Apply current search also
      if (searchQuery.trim()) {
        const search = searchQuery.toLowerCase();

        const filtered = quizItems.filter(
          (quiz) =>
            (quiz.title || '')
              .toLowerCase()
              .includes(search) ||
            (quiz.subject || '')
              .toLowerCase()
              .includes(search) ||
            (quiz.className || '')
              .toLowerCase()
              .includes(search)
        );

        setFilteredQuizzes(filtered);
      } else {
        setFilteredQuizzes(quizItems);
      }
    } catch (error) {
      console.error(
        'Error loading quizzes:',
        error
      );

      showError('Failed to load quizzes.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Load classes for filter
   */
  const loadClasses = async () => {
    try {
      const classData = await executeQuery(
        `
        SELECT
          id,
          name_english AS name
        FROM classes
        WHERE is_active = 1
        ORDER BY class_number ASC
        `,
        []
      );

      setClasses(
        classData as {
          id: number;
          name: string;
        }[]
      );
    } catch (error) {
      console.error(
        'Error loading classes:',
        error
      );
    }
  };

  /**
   * Reload when screen receives focus
   */
  useFocusEffect(
    useCallback(() => {
      loadQuizzes();
      loadClasses();
    }, [selectedClass])
  );

  /**
   * Pull to refresh
   */
  const onRefresh = () => {
    setRefreshing(true);
    loadQuizzes();
  };

  /**
   * Search
   */
  const handleSearch = (text: string) => {
    setSearchQuery(text);

    if (!text.trim()) {
      setFilteredQuizzes(quizzes);
      return;
    }

    const search = text.toLowerCase();

    const filtered = quizzes.filter(
      (quiz) =>
        (quiz.title || '')
          .toLowerCase()
          .includes(search) ||
        (quiz.subject || '')
          .toLowerCase()
          .includes(search) ||
        (quiz.className || '')
          .toLowerCase()
          .includes(search)
    );

    setFilteredQuizzes(filtered);
  };

  /**
   * Toggle Active / Inactive
   *
   * WEB:
   * window.confirm()
   *
   * NATIVE:
   * Alert.alert()
   */
  const handleToggleActive = (
    id: number,
    currentStatus: boolean | number
  ) => {
    const active = isActiveValue(currentStatus);

    const action = active
      ? 'hide'
      : 'show';

    const newStatus = active ? 0 : 1;

    confirmAction(
      active ? 'Hide Quiz' : 'Show Quiz',
      `Are you sure you want to ${action} this quiz?`,
      async () => {
        try {
          console.log(
            'Updating quiz status:',
            id,
            newStatus
          );

          const result = await executeQuery(
            `
            UPDATE quizzes
            SET is_active = ?
            WHERE id = ?
            `,
            [newStatus, id]
          );

          console.log(
            'Quiz status update result:',
            result
          );

          // Immediate UI update
          setQuizzes((prev) =>
            prev.map((quiz) =>
              quiz.id === id
                ? {
                    ...quiz,
                    isActive: newStatus,
                  }
                : quiz
            )
          );

          setFilteredQuizzes((prev) =>
            prev.map((quiz) =>
              quiz.id === id
                ? {
                    ...quiz,
                    isActive: newStatus,
                  }
                : quiz
            )
          );

          showSuccess(
            `Quiz ${
              active ? 'hidden' : 'shown'
            } successfully.`
          );

          // Reload from database
          await loadQuizzes();
        } catch (error) {
          console.error(
            'Error updating quiz status:',
            error
          );

          showError(
            'Failed to update quiz status.'
          );
        }
      },
      active ? 'Hide' : 'Show'
    );
  };

  /**
   * Delete Quiz
   *
   * First delete questions.
   * Then delete quiz.
   *
   * This works even if SQLite foreign-key cascade
   * is not enabled.
   */
  const handleDeleteQuiz = (
    id: number,
    title: string
  ) => {
    confirmAction(
      'Delete Quiz',
      `Are you sure you want to delete "${title}"?\n\nAll questions belonging to this quiz will also be deleted.`,
      async () => {
        try {
          console.log(
            'Deleting questions for quiz:',
            id
          );

          // Delete questions first
          await executeQuery(
            `
            DELETE FROM questions
            WHERE quiz_id = ?
            `,
            [id]
          );

          console.log(
            'Deleting quiz:',
            id
          );

          // Delete quiz
          await executeQuery(
            `
            DELETE FROM quizzes
            WHERE id = ?
            `,
            [id]
          );

          // Immediate UI removal
          setQuizzes((prev) =>
            prev.filter(
              (quiz) => quiz.id !== id
            )
          );

          setFilteredQuizzes((prev) =>
            prev.filter(
              (quiz) => quiz.id !== id
            )
          );

          showSuccess(
            'Quiz deleted successfully.'
          );

          // Reload from database
          await loadQuizzes();
        } catch (error) {
          console.error(
            'Error deleting quiz:',
            error
          );

          showError(
            'Failed to delete quiz. Check the console for details.'
          );
        }
      },
      'Delete'
    );
  };

  /**
   * Open Questions modal
   */
  const handleViewQuestions = async (
    quiz: QuizItem
  ) => {
    try {
      setSelectedQuiz(quiz);
      setQuestions([]);
      setShowQuestionsModal(true);
      setQuestionsLoading(true);

      console.log(
        'Loading questions for quiz:',
        quiz.id
      );

      const result = await executeQuery(
        `
        SELECT
          id,
          quiz_id,
          question_text_english,
          question_text_marathi,
          option_a_english,
          option_a_marathi,
          option_b_english,
          option_b_marathi,
          option_c_english,
          option_c_marathi,
          option_d_english,
          option_d_marathi,
          correct_answer,
          explanation_english,
          explanation_marathi,
          difficulty,
          sort_order
        FROM questions
        WHERE quiz_id = ?
        ORDER BY sort_order ASC, id ASC
        `,
        [quiz.id]
      );

      console.log(
        'Questions loaded:',
        result
      );

      setQuestions(
        result as QuestionItem[]
      );
    } catch (error) {
      console.error(
        'Error loading questions:',
        error
      );

      showError(
        'Failed to load quiz questions.'
      );
    } finally {
      setQuestionsLoading(false);
    }
  };

  /**
   * Close questions modal
   */
  const closeQuestionsModal = () => {
    setShowQuestionsModal(false);
    setSelectedQuiz(null);
    setQuestions([]);
  };

  /**
   * Format date
   */
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

  /**
   * Quiz type label
   */
  const getTypeLabel = (
    type: string
  ) => {
    switch (type) {
      case 'chapter_quiz':
        return 'Chapter Quiz';

      case 'practice_mcq':
        return 'Practice MCQ';

      case 'mock_test':
        return 'Mock Test';

      case 'previous_paper':
        return 'Previous Paper';

      default:
        return type || 'Quiz';
    }
  };

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
          Loading quizzes...
        </Text>
      </SafeAreaView>
    );
  }

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
          Manage Quizzes
        </Text>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() =>
            navigation.navigate(
              'AddQuiz'
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

      {/* SEARCH + FILTER */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons
            name="search"
            size={20}
            color="#94A3B8"
          />

          <TextInput
            style={styles.searchInput}
            placeholder="Search quizzes..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={handleSearch}
          />

          {searchQuery ? (
            <TouchableOpacity
              onPress={() =>
                handleSearch('')
              }
            >
              <Ionicons
                name="close-circle"
                size={20}
                color="#94A3B8"
              />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() =>
            setShowFilterModal(true)
          }
        >
          <Ionicons
            name="filter"
            size={20}
            color={COLORS.primary}
          />

          {selectedClass !== 'all' && (
            <View
              style={styles.filterBadge}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* QUIZ LIST */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.content
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        {filteredQuizzes.length === 0 ? (
          <View
            style={styles.emptyContainer}
          >
            <Ionicons
              name="checkbox-outline"
              size={64}
              color="#CBD5E1"
            />

            <Text
              style={styles.emptyTitle}
            >
              No Quizzes Found
            </Text>

            <Text
              style={styles.emptyText}
            >
              {searchQuery
                ? 'Try a different search'
                : 'Create your first quiz'}
            </Text>

            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() =>
                navigation.navigate(
                  'AddQuiz'
                )
              }
            >
              <Text
                style={
                  styles.emptyButtonText
                }
              >
                Create Quiz
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredQuizzes.map(
            (quiz) => {
              const active =
                isActiveValue(
                  quiz.isActive
                );

              return (
                <View
                  key={quiz.id}
                  style={
                    styles.quizCard
                  }
                >
                  {/* CARD HEADER */}
                  <View
                    style={
                      styles.cardHeader
                    }
                  >
                    <View
                      style={[
                        styles.statusBadge,
                        active
                          ? styles.activeBadge
                          : styles.inactiveBadge,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          active
                            ? styles.activeText
                            : styles.inactiveText,
                        ]}
                      >
                        {active
                          ? 'Active'
                          : 'Inactive'}
                      </Text>
                    </View>

                    <Text
                      style={
                        styles.classText
                      }
                    >
                      Class{' '}
                      {
                        quiz.classNumber
                      }
                    </Text>
                  </View>

                  {/* CARD BODY */}
                  <View
                    style={
                      styles.cardBody
                    }
                  >
                    <View
                      style={
                        styles.thumbnailContainer
                      }
                    >
                      <Ionicons
                        name="checkbox"
                        size={32}
                        color={
                          COLORS.primary
                        }
                      />
                    </View>

                    <View
                      style={
                        styles.quizInfo
                      }
                    >
                      <Text
                        style={
                          styles.quizTitle
                        }
                        numberOfLines={1}
                      >
                        {quiz.title}
                      </Text>

                      {quiz.title_marathi ? (
                        <Text
                          style={
                            styles.quizMarathi
                          }
                          numberOfLines={
                            1
                          }
                        >
                          {
                            quiz.title_marathi
                          }
                        </Text>
                      ) : null}

                      <Text
                        style={
                          styles.quizSubject
                        }
                      >
                        {quiz.subject}
                      </Text>

                      <View
                        style={
                          styles.quizMeta
                        }
                      >
                        <Text
                          style={
                            styles.metaText
                          }
                        >
                          📝{' '}
                          {
                            quiz.total_questions
                          }{' '}
                          Qs
                        </Text>

                        <Text
                          style={
                            styles.metaText
                          }
                        >
                          ⏱{' '}
                          {
                            quiz.time_limit
                          }{' '}
                          min
                        </Text>

                        <Text
                          style={
                            styles.metaText
                          }
                        >
                          🎯{' '}
                          {
                            quiz.passing_percentage
                          }
                          %
                        </Text>
                      </View>

                      <Text
                        style={
                          styles.quizType
                        }
                      >
                        {getTypeLabel(
                          quiz.type
                        )}
                      </Text>

                      <Text
                        style={
                          styles.quizDate
                        }
                      >
                        Added:{' '}
                        {formatDate(
                          quiz.created_at
                        )}
                      </Text>
                    </View>
                  </View>

                  {/* ACTION BUTTONS */}
                  <View
                    style={
                      styles.cardActions
                    }
                  >
                    {/* EDIT */}
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        styles.editButton,
                      ]}
                      activeOpacity={0.7}
                      onPress={() => {
                        console.log(
                          'Edit quiz:',
                          quiz.id
                        );

                        navigation.navigate(
                          'EditQuiz',
                          {
                            quizId:
                              quiz.id,
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

                    {/* QUESTIONS */}
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        styles.viewButton,
                      ]}
                      activeOpacity={0.7}
                      onPress={() =>
                        handleViewQuestions(
                          quiz
                        )
                      }
                    >
                      <Ionicons
                        name="list-outline"
                        size={16}
                        color="#7C3AED"
                      />

                      <Text
                        style={[
                          styles.actionButtonText,
                          {
                            color:
                              '#7C3AED',
                          },
                        ]}
                      >
                        Questions
                      </Text>
                    </TouchableOpacity>

                    {/* HIDE / SHOW */}
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        styles.toggleButton,
                      ]}
                      activeOpacity={0.7}
                      onPress={() =>
                        handleToggleActive(
                          quiz.id,
                          quiz.isActive
                        )
                      }
                    >
                      <Ionicons
                        name={
                          active
                            ? 'eye-off-outline'
                            : 'eye-outline'
                        }
                        size={16}
                        color={
                          active
                            ? '#D97706'
                            : '#16A34A'
                        }
                      />

                      <Text
                        style={[
                          styles.toggleButtonText,
                          {
                            color: active
                              ? '#D97706'
                              : '#16A34A',
                          },
                        ]}
                      >
                        {active
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
                      activeOpacity={0.7}
                      onPress={() =>
                        handleDeleteQuiz(
                          quiz.id,
                          quiz.title
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
              );
            }
          )
        )}
      </ScrollView>

      {/* ===================================================== */}
      {/* QUESTIONS MODAL */}
      {/* ===================================================== */}

      <Modal
        visible={showQuestionsModal}
        animationType="fade"
        transparent
        onRequestClose={
          closeQuestionsModal
        }
      >
        <View
          style={
            styles.questionsModalOverlay
          }
        >
          <View
            style={
              styles.questionsModalContent
            }
          >
            {/* MODAL HEADER */}
            <View
              style={
                styles.questionsModalHeader
              }
            >
              <View
                style={
                  styles.questionsModalTitleContainer
                }
              >
                <Text
                  style={
                    styles.questionsModalTitle
                  }
                  numberOfLines={1}
                >
                  {selectedQuiz?.title ||
                    'Quiz Questions'}
                </Text>

                <Text
                  style={
                    styles.questionsModalSubtitle
                  }
                >
                  {questions.length}{' '}
                  question
                  {questions.length !== 1
                    ? 's'
                    : ''}
                </Text>
              </View>

              <TouchableOpacity
                style={
                  styles.closeButton
                }
                onPress={
                  closeQuestionsModal
                }
              >
                <Ionicons
                  name="close"
                  size={24}
                  color="#0F172A"
                />
              </TouchableOpacity>
            </View>

            {/* QUESTIONS */}
            {questionsLoading ? (
              <View
                style={
                  styles.questionsLoading
                }
              >
                <ActivityIndicator
                  size="large"
                  color={
                    COLORS.primary
                  }
                />

                <Text
                  style={
                    styles.loadingText
                  }
                >
                  Loading questions...
                </Text>
              </View>
            ) : questions.length === 0 ? (
              <View
                style={
                  styles.noQuestionsContainer
                }
              >
                <Ionicons
                  name="document-text-outline"
                  size={50}
                  color="#CBD5E1"
                />

                <Text
                  style={
                    styles.noQuestionsTitle
                  }
                >
                  No Questions Found
                </Text>

                <Text
                  style={
                    styles.noQuestionsText
                  }
                >
                  This quiz does not have
                  any questions yet.
                </Text>
              </View>
            ) : (
              <ScrollView
                style={
                  styles.questionsList
                }
                contentContainerStyle={
                  styles.questionsListContent
                }
                showsVerticalScrollIndicator
              >
                {questions.map(
                  (question, index) => (
                    <View
                      key={
                        question.id
                      }
                      style={
                        styles.questionCard
                      }
                    >
                      <View
                        style={
                          styles.questionHeader
                        }
                      >
                        <Text
                          style={
                            styles.questionNumber
                          }
                        >
                          Q{index + 1}
                        </Text>

                        {question.difficulty ? (
                          <Text
                            style={
                              styles.difficultyText
                            }
                          >
                            {
                              question.difficulty
                            }
                          </Text>
                        ) : null}
                      </View>

                      <Text
                        style={
                          styles.questionEnglish
                        }
                      >
                        {
                          question.question_text_english
                        }
                      </Text>

                      {question.question_text_marathi ? (
                        <Text
                          style={
                            styles.questionMarathi
                          }
                        >
                          {
                            question.question_text_marathi
                          }
                        </Text>
                      ) : null}

                      <View
                        style={
                          styles.optionsContainer
                        }
                      >
                        <View
                          style={[
                            styles.option,
                            question.correct_answer ===
                              'a' &&
                              styles.correctOption,
                          ]}
                        >
                          <Text
                            style={[
                              styles.optionText,
                              question.correct_answer ===
                                'a' &&
                                styles.correctOptionText,
                            ]}
                          >
                            A.{' '}
                            {
                              question.option_a_english
                            }
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.option,
                            question.correct_answer ===
                              'b' &&
                              styles.correctOption,
                          ]}
                        >
                          <Text
                            style={[
                              styles.optionText,
                              question.correct_answer ===
                                'b' &&
                                styles.correctOptionText,
                            ]}
                          >
                            B.{' '}
                            {
                              question.option_b_english
                            }
                          </Text>
                        </View>

                        {question.option_c_english ? (
                          <View
                            style={[
                              styles.option,
                              question.correct_answer ===
                                'c' &&
                                styles.correctOption,
                            ]}
                          >
                            <Text
                              style={[
                                styles.optionText,
                                question.correct_answer ===
                                  'c' &&
                                  styles.correctOptionText,
                              ]}
                            >
                              C.{' '}
                              {
                                question.option_c_english
                              }
                            </Text>
                          </View>
                        ) : null}

                        {question.option_d_english ? (
                          <View
                            style={[
                              styles.option,
                              question.correct_answer ===
                                'd' &&
                                styles.correctOption,
                            ]}
                          >
                            <Text
                              style={[
                                styles.optionText,
                                question.correct_answer ===
                                  'd' &&
                                  styles.correctOptionText,
                              ]}
                            >
                              D.{' '}
                              {
                                question.option_d_english
                              }
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      <Text
                        style={
                          styles.answerText
                        }
                      >
                        Correct Answer:{' '}
                        {question.correct_answer.toUpperCase()}
                      </Text>

                      {question.explanation_english ? (
                        <Text
                          style={
                            styles.explanationText
                          }
                        >
                          Explanation:{' '}
                          {
                            question.explanation_english
                          }
                        </Text>
                      ) : null}
                    </View>
                  )
                )}
              </ScrollView>
            )}

            {/* CLOSE */}
            <TouchableOpacity
              style={
                styles.closeModalButton
              }
              onPress={
                closeQuestionsModal
              }
            >
              <Text
                style={
                  styles.closeModalButtonText
                }
              >
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===================================================== */}
      {/* FILTER MODAL */}
      {/* ===================================================== */}

      <Modal
        visible={showFilterModal}
        animationType="fade"
        transparent
        onRequestClose={() =>
          setShowFilterModal(false)
        }
      >
        <TouchableOpacity
          style={
            styles.filterModalOverlay
          }
          activeOpacity={1}
          onPress={() =>
            setShowFilterModal(false)
          }
        >
          <View
            style={
              styles.filterModalContent
            }
          >
            <Text
              style={
                styles.filterModalTitle
              }
            >
              Filter by Class
            </Text>

            {/* ALL CLASSES */}
            <TouchableOpacity
              style={[
                styles.filterOption,
                selectedClass ===
                  'all' &&
                  styles.filterOptionSelected,
              ]}
              onPress={() => {
                setSelectedClass(
                  'all'
                );
                setShowFilterModal(
                  false
                );
              }}
            >
              <Text
                style={[
                  styles.filterOptionText,
                  selectedClass ===
                    'all' &&
                    styles.filterOptionTextSelected,
                ]}
              >
                All Classes
              </Text>
            </TouchableOpacity>

            {/* CLASSES */}
            {classes.map(
              (cls) => (
                <TouchableOpacity
                  key={cls.id}
                  style={[
                    styles.filterOption,
                    selectedClass ===
                      String(
                        cls.id
                      ) &&
                      styles.filterOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedClass(
                      String(
                        cls.id
                      )
                    );

                    setShowFilterModal(
                      false
                    );
                  }}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      selectedClass ===
                        String(
                          cls.id
                        ) &&
                        styles.filterOptionTextSelected,
                    ]}
                  >
                    {cls.name}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

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
    fontSize: 20,
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

  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },

  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#0F172A',
  },

  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },

  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },

  content: {
    paddingHorizontal: 16,
    paddingBottom: 20,
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

  quizCard: {
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

  classText: {
    fontSize: 11,
    color: '#64748B',
  },

  cardBody: {
    flexDirection: 'row',
    padding: 14,
    paddingTop: 8,
  },

  thumbnailContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  quizInfo: {
    flex: 1,
    marginLeft: 12,
  },

  quizTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },

  quizMarathi: {
    fontSize: 12,
    color: '#7C3AED',
    marginTop: 1,
  },

  quizSubject: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },

  quizMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },

  metaText: {
    fontSize: 10,
    color: '#64748B',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  quizType: {
    fontSize: 11,
    color: '#8B5CF6',
    marginTop: 2,
  },

  quizDate: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },

  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 4,
  },

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    flex: 1,
    justifyContent: 'center',
    minHeight: 34,
  },

  editButton: {
    backgroundColor: '#EEF2FF',
  },

  editButtonText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '500',
  },

  viewButton: {
    backgroundColor: '#EDE9FE',
  },

  actionButtonText: {
    fontSize: 11,
    fontWeight: '500',
  },

  toggleButton: {
    backgroundColor: '#F8FAFC',
  },

  toggleButtonText: {
    fontSize: 11,
    fontWeight: '500',
  },

  deleteButton: {
    backgroundColor: '#FEE2E2',
  },

  deleteButtonText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '500',
  },

  /* ========================================================= */
  /* QUESTIONS MODAL */
  /* ========================================================= */

  questionsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  questionsModalContent: {
    width: '95%',
    maxWidth: 900,
    height: '90%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
  },

  questionsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },

  questionsModalTitleContainer: {
    flex: 1,
  },

  questionsModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },

  questionsModalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },

  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },

  questionsLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  noQuestionsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },

  noQuestionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 15,
  },

  noQuestionsText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
  },

  questionsList: {
    flex: 1,
  },

  questionsListContent: {
    padding: 16,
    paddingBottom: 30,
  },

  questionCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },

  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  questionNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },

  difficultyText: {
    fontSize: 10,
    color: '#64748B',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    textTransform: 'capitalize',
  },

  questionEnglish: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    lineHeight: 21,
  },

  questionMarathi: {
    fontSize: 13,
    color: '#7C3AED',
    marginTop: 5,
    lineHeight: 20,
  },

  optionsContainer: {
    marginTop: 12,
    gap: 6,
  },

  option: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  correctOption: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },

  optionText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },

  correctOptionText: {
    color: '#15803D',
    fontWeight: '600',
  },

  answerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
    marginTop: 10,
  },

  explanationText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 17,
    marginTop: 6,
  },

  closeModalButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },

  closeModalButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },

  /* ========================================================= */
  /* FILTER MODAL */
  /* ========================================================= */

  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  filterModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 500,
    maxHeight: '80%',
  },

  filterModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },

  filterOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },

  filterOptionSelected: {
    backgroundColor: '#EEF2FF',
  },

  filterOptionText: {
    fontSize: 14,
    color: '#64748B',
  },

  filterOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default ManageQuizzesScreen;