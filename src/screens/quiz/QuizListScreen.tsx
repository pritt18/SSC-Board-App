import React, { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import { COLORS } from '../../constants/colors';
import { executeQuery } from '../../database/database';

import {
  LearningStackParamList,
} from '../../navigation/navigationTypes';

type Props = NativeStackScreenProps<
  LearningStackParamList,
  'QuizList'
>;

interface QuizItem {
  id: number;
  title: string;
  description: string;
  type: string;
  totalQuestions: number;
  timeLimit: number;
  passingPercentage: number;
}

const TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  chapter_quiz: { label: 'Chapter Quiz', icon: '📘' },
  practice_mcq: { label: 'Practice MCQ', icon: '📝' },
  mock_test: { label: 'Mock Test', icon: '⏱️' },
  previous_paper: { label: 'Previous Paper', icon: '📄' },
};

const QuizListScreen: React.FC<Props> = ({
  navigation,
  route,
}) => {
  const { subjectId } = route.params;
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      const rows = await executeQuery(
        `SELECT id, title_english, description_english, type,
                total_questions, time_limit, passing_percentage
         FROM quizzes
         WHERE subject_id = ? AND is_active = 1
         ORDER BY created_at DESC`,
        [subjectId]
      );

      setQuizzes(
        (rows as any[]).map((r) => ({
          id: r.id,
          title: r.title_english,
          description: r.description_english || 'Practice questions for this subject.',
          type: r.type,
          totalQuestions: r.total_questions,
          timeLimit: r.time_limit,
          passingPercentage: r.passing_percentage,
        }))
      );
    } catch (error) {
      console.error('Error loading quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadQuizzes();
    }, [subjectId])
  );

  const handleQuizPress = (
    quizId: number,
  ) => {
    navigation.navigate(
      'QuizScreen',
      {
        quizId,
      },
    );
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top']}
    >
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        {/* HEADER */}

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

          <View
            style={styles.headerContent}
          >
            <Text
              style={styles.headerLabel}
            >
              Subject Learning
            </Text>

            <Text style={styles.title}>
              Quizzes
            </Text>
          </View>
        </View>

        <Text
          style={styles.sectionTitle}
        >
          Available Quizzes
        </Text>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 30 }} />
        ) : quizzes.length === 0 ? (
          <Text style={styles.emptyText}>
            No quizzes have been added for this subject yet. Check back later!
          </Text>
        ) : (
          <View style={styles.quizList}>
            {quizzes.map(quiz => {
              const typeInfo = TYPE_LABELS[quiz.type] || { label: 'Quiz', icon: '📝' };
              return (
                <Pressable
                  key={quiz.id}
                  onPress={() =>
                    handleQuizPress(
                      quiz.id,
                    )
                  }
                  style={({ pressed }) => [
                    styles.quizCard,

                    pressed &&
                      styles.pressedCard,
                  ]}
                >
                  <View
                    style={
                      styles.iconContainer
                    }
                  >
                    <Text
                      style={styles.quizIcon}
                    >
                      {typeInfo.icon}
                    </Text>
                  </View>

                  <View
                    style={styles.quizInfo}
                  >
                    <Text
                      style={styles.quizType}
                    >
                      {typeInfo.label}
                    </Text>

                    <Text
                      style={styles.quizTitle}
                    >
                      {quiz.title}
                    </Text>

                    <Text
                      style={
                        styles.description
                      }
                      numberOfLines={2}
                    >
                      {quiz.description}
                    </Text>

                    <View
                      style={
                        styles.quizDetails
                      }
                    >
                      <Text
                        style={
                          styles.detailText
                        }
                      >
                        {quiz.totalQuestions}{' '}
                        Questions
                      </Text>

                      <Text
                        style={
                          styles.detailText
                        }
                      >
                        • {quiz.timeLimit} min
                      </Text>

                      <Text
                        style={
                          styles.detailText
                        }
                      >
                        • Pass{' '}
                        {
                          quiz.passingPercentage
                        }
                        %
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.arrow}>
                    ›
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

export default QuizListScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:
      COLORS.background,
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor:
      COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },

  backText: {
    fontSize: 32,
    color:
      COLORS.textPrimary,
    marginTop: -4,
  },

  headerContent: {
    flex: 1,
  },

  headerLabel: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },

  title: {
    fontSize: 26,
    fontWeight: '700',
    color:
      COLORS.textPrimary,
    marginTop: 3,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color:
      COLORS.textPrimary,
    marginBottom: 18,
  },

  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },

  quizList: {
    gap: 14,
  },

  quizCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:
      COLORS.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor:
      COLORS.border,
  },

  pressedCard: {
    opacity: 0.75,
  },

  iconContainer: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor:
      COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  quizIcon: {
    fontSize: 27,
  },

  quizInfo: {
    flex: 1,
    marginLeft: 15,
  },

  quizType: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
  },

  quizTitle: {
    color:
      COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 3,
  },

  description: {
    color:
      COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
  },

  quizDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 8,
  },

  detailText: {
    color:
      COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },

  arrow: {
    fontSize: 28,
    color:
      COLORS.textSecondary,
    marginLeft: 8,
  },
});
