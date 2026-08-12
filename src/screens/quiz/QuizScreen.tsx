import React, {
  useEffect,
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
  'QuizScreen'
>;

type AnswerKey =
  | 'a'
  | 'b'
  | 'c'
  | 'd';

interface Question {
  id: number;
  question: string;
  options: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  correctAnswer: AnswerKey;
  explanation: string;
}

interface QuizData {
  id: number;
  title: string;
  timeLimit: number;
  passingPercentage: number;
  questions: Question[];
}

// =========================================
// HARDCODED QUIZ DATA
// =========================================


// =========================================
// QUIZ DATA IS LOADED FROM THE DATABASE
// (see the useEffect fetch below)
// =========================================

const QuizScreen: React.FC<Props> = ({
  navigation,
  route,
}) => {
  const { quizId } = route.params;

  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loadingQuiz, setLoadingQuiz] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadQuiz = async () => {
      try {
        setLoadingQuiz(true);
        const quizRows = await executeQuery(
          `SELECT id, title_english, time_limit, passing_percentage
           FROM quizzes WHERE id = ?`,
          [quizId]
        );

        if (quizRows.length === 0) {
          if (!cancelled) setQuiz(null);
          return;
        }

        const questionRows = await executeQuery(
          `SELECT id, question_text_english,
                  option_a_english, option_b_english,
                  option_c_english, option_d_english,
                  correct_answer, explanation_english
           FROM questions
           WHERE quiz_id = ?
           ORDER BY sort_order ASC`,
          [quizId]
        );

        const questions: Question[] = (questionRows as any[]).map((q) => ({
          id: q.id,
          question: q.question_text_english,
          options: {
            a: q.option_a_english,
            b: q.option_b_english,
            c: q.option_c_english || '',
            d: q.option_d_english || '',
          },
          correctAnswer: q.correct_answer as AnswerKey,
          explanation: q.explanation_english || '',
        }));

        if (!cancelled) {
          setQuiz({
            id: quizRows[0].id,
            title: quizRows[0].title_english,
            timeLimit: quizRows[0].time_limit,
            passingPercentage: quizRows[0].passing_percentage,
            questions,
          });
          setSecondsLeft(quizRows[0].time_limit * 60);
        }
      } catch (error) {
        console.error('Error loading quiz:', error);
        if (!cancelled) setQuiz(null);
      } finally {
        if (!cancelled) setLoadingQuiz(false);
      }
    };

    loadQuiz();
    return () => {
      cancelled = true;
    };
  }, [quizId]);

  const [
    currentQuestionIndex,
    setCurrentQuestionIndex,
  ] = useState(0);

  const [
    selectedAnswer,
    setSelectedAnswer,
  ] = useState<AnswerKey | null>(
    null,
  );

  const [score, setScore] =
    useState(0);

  const [
    showExplanation,
    setShowExplanation,
  ] = useState(false);

  const [
    secondsLeft,
    setSecondsLeft,
  ] = useState(
    quiz
      ? quiz.timeLimit * 60
      : 0,
  );

  // =========================================
  // TIMER
  // =========================================

  useEffect(() => {
    if (
      !quiz ||
      secondsLeft <= 0
    ) {
      return;
    }

    const timer = setInterval(
      () => {
        setSecondsLeft(
          previous => {
            if (previous <= 1) {
              clearInterval(timer);

              return 0;
            }

            return previous - 1;
          },
        );
      },
      1000,
    );

    return () =>
      clearInterval(timer);
  }, [secondsLeft, quiz]);

  // =========================================
  // TIME FINISHED
  // =========================================

  useEffect(() => {
    if (
      quiz &&
      secondsLeft === 0
    ) {
      navigation.replace(
        'QuizResult',
        {
          quizId,
          score,
          total:
            quiz.questions.length,
        },
      );
    }
  }, [secondsLeft]);

  if (loadingQuiz) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <View
          style={
            styles.emptyContainer
          }
        >
          <ActivityIndicator color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!quiz) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <View
          style={
            styles.emptyContainer
          }
        >
          <Text
            style={styles.emptyTitle}
          >
            Quiz Not Found
          </Text>

          <Pressable
            style={
              styles.primaryButton
            }
            onPress={() =>
              navigation.goBack()
            }
          >
            <Text
              style={
                styles.primaryButtonText
              }
            >
              Go Back
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const currentQuestion =
    quiz.questions[
      currentQuestionIndex
    ];

  const progress =
    ((currentQuestionIndex + 1) /
      quiz.questions.length) *
    100;

  const handleAnswerPress = (
    answer: AnswerKey,
  ) => {
    if (showExplanation) {
      return;
    }

    setSelectedAnswer(answer);
  };

  // =========================================
  // CHECK ANSWER
  // =========================================

  const handleCheckAnswer = () => {
    if (!selectedAnswer) {
      Alert.alert(
        'Select Answer',
        'Please select an answer.',
      );

      return;
    }

    if (
      selectedAnswer ===
      currentQuestion.correctAnswer
    ) {
      setScore(
        previous => previous + 1,
      );
    }

    setShowExplanation(true);
  };

  // =========================================
  // NEXT QUESTION
  // =========================================

  const handleNext = () => {
    const finalScore =
      selectedAnswer ===
        currentQuestion.correctAnswer
        ? score + 1
        : score;

    if (
      currentQuestionIndex ===
      quiz.questions.length - 1
    ) {
      navigation.replace(
        'QuizResult',
        {
          quizId,
          score: finalScore,
          total:
            quiz.questions.length,
        },
      );

      return;
    }

    setCurrentQuestionIndex(
      previous => previous + 1,
    );

    setSelectedAnswer(null);

    setShowExplanation(false);
  };

  const formatTime = (
    seconds: number,
  ) => {
    const minutes = Math.floor(
      seconds / 60,
    );

    const remainingSeconds =
      seconds % 60;

    return `${minutes}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`;
  };

  const options: {
    key: AnswerKey;
    value: string;
  }[] = [
    {
      key: 'a',
      value:
        currentQuestion.options.a,
    },
    {
      key: 'b',
      value:
        currentQuestion.options.b,
    },
    {
      key: 'c',
      value:
        currentQuestion.options.c,
    },
    {
      key: 'd',
      value:
        currentQuestion.options.d,
    },
  ];

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
              Quiz
            </Text>

            <Text
              style={styles.title}
              numberOfLines={1}
            >
              {quiz.title}
            </Text>
          </View>

          <View
            style={
              styles.timerContainer
            }
          >
            <Text
              style={styles.timerText}
            >
              {formatTime(
                secondsLeft,
              )}
            </Text>
          </View>
        </View>

        {/* PROGRESS */}

        <View
          style={
            styles.progressHeader
          }
        >
          <Text
            style={
              styles.questionCount
            }
          >
            Question{' '}
            {currentQuestionIndex + 1}{' '}
            of{' '}
            {quiz.questions.length}
          </Text>

          <Text
            style={
              styles.progressPercentage
            }
          >
            {Math.round(progress)}%
          </Text>
        </View>

        <View
          style={styles.progressBar}
        >
          <View
            style={[
              styles.progressFill,
              {
                width:
                  `${progress}%` as any,
              },
            ]}
          />
        </View>

        {/* QUESTION */}

        <View
          style={styles.questionCard}
        >
          <Text
            style={styles.questionText}
          >
            {currentQuestion.question}
          </Text>
        </View>

        {/* OPTIONS */}

        <View
          style={
            styles.optionsContainer
          }
        >
          {options.map(option => {
            const isSelected =
              selectedAnswer ===
              option.key;

            const isCorrect =
              option.key ===
              currentQuestion.correctAnswer;

            const isWrong =
              showExplanation &&
              isSelected &&
              !isCorrect;

            return (
              <Pressable
                key={option.key}
                disabled={
                  showExplanation
                }
                onPress={() =>
                  handleAnswerPress(
                    option.key,
                  )
                }
                style={[
                  styles.optionCard,

                  isSelected &&
                    !showExplanation &&
                    styles.selectedOption,

                  showExplanation &&
                    isCorrect &&
                    styles.correctOption,

                  isWrong &&
                    styles.wrongOption,
                ]}
              >
                <View
                  style={
                    styles.optionLetter
                  }
                >
                  <Text
                    style={
                      styles
                        .optionLetterText
                    }
                  >
                    {option.key.toUpperCase()}
                  </Text>
                </View>

                <Text
                  style={
                    styles.optionText
                  }
                >
                  {option.value}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* EXPLANATION */}

        {showExplanation && (
          <View
            style={
              styles.explanationCard
            }
          >
            <Text
              style={
                styles
                  .explanationTitle
              }
            >
              {selectedAnswer ===
              currentQuestion.correctAnswer
                ? '✓ Correct Answer'
                : '✕ Incorrect Answer'}
            </Text>

            <Text
              style={
                styles.explanationText
              }
            >
              {
                currentQuestion
                  .explanation
              }
            </Text>
          </View>
        )}

        {/* BUTTON */}

        {!showExplanation ? (
          <Pressable
            style={[
              styles.primaryButton,

              !selectedAnswer &&
                styles.disabledButton,
            ]}
            onPress={
              handleCheckAnswer
            }
          >
            <Text
              style={
                styles
                  .primaryButtonText
              }
            >
              Check Answer
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={
              styles.primaryButton
            }
            onPress={handleNext}
          >
            <Text
              style={
                styles
                  .primaryButtonText
              }
            >
              {currentQuestionIndex ===
              quiz.questions.length - 1
                ? 'View Result'
                : 'Next Question'}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default QuizScreen;

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
    marginBottom: 25,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor:
      COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
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
    fontSize: 12,
    fontWeight: '600',
  },

  title: {
    color:
      COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },

  timerContainer: {
    backgroundColor:
      COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },

  timerText: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  progressHeader: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
  },

  questionCount: {
    color:
      COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },

  progressPercentage: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },

  progressBar: {
    height: 7,
    backgroundColor:
      COLORS.border,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 25,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor:
      COLORS.primary,
  },

  questionCard: {
    backgroundColor:
      COLORS.white,
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    marginBottom: 20,
  },

  questionText: {
    color:
      COLORS.textPrimary,
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 28,
  },

  optionsContainer: {
    gap: 12,
  },

  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:
      COLORS.white,
    borderRadius: 15,
    padding: 14,
    borderWidth: 1.5,
    borderColor:
      COLORS.border,
  },

  selectedOption: {
    borderColor:
      COLORS.primary,
    backgroundColor:
      COLORS.primaryLight,
  },

  correctOption: {
    borderColor: '#16A34A',
    backgroundColor: '#DCFCE7',
  },

  wrongOption: {
    borderColor: '#DC2626',
    backgroundColor: '#FEE2E2',
  },

  optionLetter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor:
      COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  optionLetterText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '800',
  },

  optionText: {
    flex: 1,
    color:
      COLORS.textPrimary,
    fontSize: 15,
  },

  explanationCard: {
    marginTop: 20,
    padding: 17,
    borderRadius: 15,
    backgroundColor:
      COLORS.primaryLight,
  },

  explanationTitle: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '700',
  },

  explanationText: {
    color:
      COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
  },

  primaryButton: {
    backgroundColor:
      COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 25,
  },

  disabledButton: {
    opacity: 0.5,
  },

  primaryButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },

  emptyContainer: {
    flex: 1,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    color:
      COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
});