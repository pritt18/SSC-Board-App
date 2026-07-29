import React, {
  useEffect,
  useState,
} from 'react';

import {
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

const quizData: Record<
  number,
  QuizData
> = {
  1: {
    id: 1,
    title: 'Mathematics Practice Quiz',
    timeLimit: 5,
    passingPercentage: 40,
    questions: [
      {
        id: 1,
        question: 'What is 5 + 3?',
        options: {
          a: '6',
          b: '7',
          c: '8',
          d: '9',
        },
        correctAnswer: 'c',
        explanation: '5 + 3 equals 8.',
      },
      {
        id: 2,
        question: 'What is 10 - 4?',
        options: {
          a: '5',
          b: '6',
          c: '7',
          d: '8',
        },
        correctAnswer: 'b',
        explanation: '10 - 4 equals 6.',
      },
      {
        id: 3,
        question: 'What is 3 × 4?',
        options: {
          a: '7',
          b: '10',
          c: '12',
          d: '14',
        },
        correctAnswer: 'c',
        explanation: '3 multiplied by 4 equals 12.',
      },
      {
        id: 4,
        question: 'What is 20 ÷ 5?',
        options: {
          a: '2',
          b: '3',
          c: '4',
          d: '5',
        },
        correctAnswer: 'c',
        explanation: '20 divided by 5 equals 4.',
      },
      {
        id: 5,
        question: 'Which number is the largest?',
        options: {
          a: '12',
          b: '25',
          c: '18',
          d: '20',
        },
        correctAnswer: 'b',
        explanation: '25 is the largest number.',
      },
    ],
  },

  2: {
    id: 2,
    title: 'Mathematics Mock Test',
    timeLimit: 10,
    passingPercentage: 40,
    questions: [
      {
        id: 101,
        question: 'What is 7 + 8?',
        options: {
          a: '13',
          b: '14',
          c: '15',
          d: '16',
        },
        correctAnswer: 'c',
        explanation: '7 + 8 equals 15.',
      },
      {
        id: 102,
        question: 'What is 6 × 5?',
        options: {
          a: '25',
          b: '30',
          c: '35',
          d: '40',
        },
        correctAnswer: 'b',
        explanation: '6 multiplied by 5 equals 30.',
      },
      {
        id: 103,
        question: 'What is 50 - 20?',
        options: {
          a: '20',
          b: '25',
          c: '30',
          d: '35',
        },
        correctAnswer: 'c',
        explanation: '50 - 20 equals 30.',
      },
      {
        id: 104,
        question: 'What is 36 ÷ 6?',
        options: {
          a: '5',
          b: '6',
          c: '7',
          d: '8',
        },
        correctAnswer: 'b',
        explanation: '36 divided by 6 equals 6.',
      },
      {
        id: 105,
        question: 'Which is the smallest number?',
        options: {
          a: '15',
          b: '8',
          c: '12',
          d: '20',
        },
        correctAnswer: 'b',
        explanation: '8 is the smallest number.',
      },
    ],
  },

  3: {
    id: 3,
    title: 'Science Quiz: Basic Physics',
    timeLimit: 5,
    passingPercentage: 40,
    questions: [
      {
        id: 201,
        question: 'What is the unit of force?',
        options: {
          a: 'Joule',
          b: 'Newton',
          c: 'Watt',
          d: 'Pascal',
        },
        correctAnswer: 'b',
        explanation: 'Newton (N) is the SI unit of force.',
      },
      {
        id: 202,
        question: 'What is the speed of light approximately?',
        options: {
          a: '3 × 10⁶ m/s',
          b: '3 × 10⁸ m/s',
          c: '3 × 10¹⁰ m/s',
          d: '3 × 10⁴ m/s',
        },
        correctAnswer: 'b',
        explanation: 'The speed of light is approximately 3 × 10⁸ meters per second.',
      },
      {
        id: 203,
        question: 'What is the SI unit of energy?',
        options: {
          a: 'Watt',
          b: 'Joule',
          c: 'Newton',
          d: 'Pascal',
        },
        correctAnswer: 'b',
        explanation: 'Joule (J) is the SI unit of energy.',
      },
      {
        id: 204,
        question: 'What force keeps planets in orbit?',
        options: {
          a: 'Magnetic force',
          b: 'Gravitational force',
          c: 'Electrostatic force',
          d: 'Nuclear force',
        },
        correctAnswer: 'b',
        explanation: 'Gravitational force keeps planets in orbit around the sun.',
      },
      {
        id: 205,
        question: 'What is the boiling point of water?',
        options: {
          a: '50°C',
          b: '80°C',
          c: '100°C',
          d: '120°C',
        },
        correctAnswer: 'c',
        explanation: 'Water boils at 100°C at standard atmospheric pressure.',
      },
    ],
  },

  4: {
    id: 4,
    title: 'Science Quiz: Biology Basics',
    timeLimit: 5,
    passingPercentage: 40,
    questions: [
      {
        id: 301,
        question: 'What is the largest organ in the human body?',
        options: {
          a: 'Liver',
          b: 'Brain',
          c: 'Skin',
          d: 'Heart',
        },
        correctAnswer: 'c',
        explanation: 'The skin is the largest organ in the human body.',
      },
      {
        id: 302,
        question: 'What is the powerhouse of the cell?',
        options: {
          a: 'Nucleus',
          b: 'Ribosome',
          c: 'Mitochondria',
          d: 'Golgi apparatus',
        },
        correctAnswer: 'c',
        explanation: 'Mitochondria are known as the powerhouse of the cell.',
      },
      {
        id: 303,
        question: 'What is the normal human body temperature?',
        options: {
          a: '36.5°C',
          b: '37.0°C',
          c: '37.5°C',
          d: '38.0°C',
        },
        correctAnswer: 'b',
        explanation: 'Normal human body temperature is 37.0°C or 98.6°F.',
      },
      {
        id: 304,
        question: 'What is the basic unit of life?',
        options: {
          a: 'Atom',
          b: 'Molecule',
          c: 'Cell',
          d: 'Tissue',
        },
        correctAnswer: 'c',
        explanation: 'The cell is the basic unit of life.',
      },
      {
        id: 305,
        question: 'Which blood type is the universal donor?',
        options: {
          a: 'A+',
          b: 'B+',
          c: 'AB+',
          d: 'O-',
        },
        correctAnswer: 'd',
        explanation: 'O- is the universal donor blood type.',
      },
    ],
  },

  5: {
    id: 5,
    title: 'General Knowledge Quiz',
    timeLimit: 5,
    passingPercentage: 40,
    questions: [
      {
        id: 401,
        question: 'What is the capital of France?',
        options: {
          a: 'London',
          b: 'Paris',
          c: 'Rome',
          d: 'Madrid',
        },
        correctAnswer: 'b',
        explanation: 'Paris is the capital of France.',
      },
      {
        id: 402,
        question: 'Which is the largest ocean on Earth?',
        options: {
          a: 'Atlantic Ocean',
          b: 'Indian Ocean',
          c: 'Pacific Ocean',
          d: 'Arctic Ocean',
        },
        correctAnswer: 'c',
        explanation: 'The Pacific Ocean is the largest ocean on Earth.',
      },
      {
        id: 403,
        question: 'What is the smallest country in the world?',
        options: {
          a: 'Monaco',
          b: 'Vatican City',
          c: 'San Marino',
          d: 'Liechtenstein',
        },
        correctAnswer: 'b',
        explanation: 'Vatican City is the smallest country in the world.',
      },
      {
        id: 404,
        question: 'What is the longest river in the world?',
        options: {
          a: 'Amazon',
          b: 'Nile',
          c: 'Yangtze',
          d: 'Mississippi',
        },
        correctAnswer: 'b',
        explanation: 'The Nile is the longest river in the world.',
      },
      {
        id: 405,
        question: 'What is the chemical symbol for water?',
        options: {
          a: 'H2O',
          b: 'CO2',
          c: 'NaCl',
          d: 'HCl',
        },
        correctAnswer: 'a',
        explanation: 'H2O is the chemical formula for water.',
      },
    ],
  },

  6: {
    id: 6,
    title: 'English Language Quiz',
    timeLimit: 5,
    passingPercentage: 40,
    questions: [
      {
        id: 501,
        question: 'What is the plural of "child"?',
        options: {
          a: 'Childs',
          b: 'Children',
          c: 'Childrens',
          d: 'Childes',
        },
        correctAnswer: 'b',
        explanation: 'The plural of "child" is "children".',
      },
      {
        id: 502,
        question: 'Which word is a synonym for "happy"?',
        options: {
          a: 'Sad',
          b: 'Joyful',
          c: 'Angry',
          d: 'Tired',
        },
        correctAnswer: 'b',
        explanation: '"Joyful" is a synonym for "happy".',
      },
      {
        id: 503,
        question: 'What is the past tense of "go"?',
        options: {
          a: 'Gone',
          b: 'Went',
          c: 'Going',
          d: 'Goes',
        },
        correctAnswer: 'b',
        explanation: 'The past tense of "go" is "went".',
      },
      {
        id: 504,
        question: 'Which is a correct sentence?',
        options: {
          a: 'He go to school.',
          b: 'He goes to school.',
          c: 'He going to school.',
          d: 'He gone to school.',
        },
        correctAnswer: 'b',
        explanation: '"He goes to school" is the correct simple present tense sentence.',
      },
      {
        id: 505,
        question: 'What is the antonym of "hot"?',
        options: {
          a: 'Warm',
          b: 'Cold',
          c: 'Boiling',
          d: 'Scalding',
        },
        correctAnswer: 'b',
        explanation: '"Cold" is the antonym of "hot".',
      },
    ],
  },

  7: {
    id: 7,
    title: 'History Quiz',
    timeLimit: 5,
    passingPercentage: 40,
    questions: [
      {
        id: 601,
        question: 'Who was the first President of the United States?',
        options: {
          a: 'Thomas Jefferson',
          b: 'George Washington',
          c: 'Abraham Lincoln',
          d: 'John Adams',
        },
        correctAnswer: 'b',
        explanation: 'George Washington was the first President of the United States.',
      },
      {
        id: 602,
        question: 'When did World War II end?',
        options: {
          a: '1943',
          b: '1944',
          c: '1945',
          d: '1946',
        },
        correctAnswer: 'c',
        explanation: 'World War II ended in 1945.',
      },
      {
        id: 603,
        question: 'What civilization built the pyramids?',
        options: {
          a: 'Greek',
          b: 'Roman',
          c: 'Egyptian',
          d: 'Persian',
        },
        correctAnswer: 'c',
        explanation: 'The Egyptian civilization built the pyramids.',
      },
      {
        id: 604,
        question: 'Who discovered America?',
        options: {
          a: 'Ferdinand Magellan',
          b: 'Christopher Columbus',
          c: 'Vasco da Gama',
          d: 'Amerigo Vespucci',
        },
        correctAnswer: 'b',
        explanation: 'Christopher Columbus discovered America in 1492.',
      },
      {
        id: 605,
        question: 'What was the Renaissance?',
        options: {
          a: 'A war',
          b: 'A cultural movement',
          c: 'A disease',
          d: 'A religion',
        },
        correctAnswer: 'b',
        explanation: 'The Renaissance was a cultural movement in Europe.',
      },
    ],
  },

  8: {
    id: 8,
    title: 'Geography Quiz',
    timeLimit: 5,
    passingPercentage: 40,
    questions: [
      {
        id: 701,
        question: 'What is the largest continent?',
        options: {
          a: 'Africa',
          b: 'North America',
          c: 'Asia',
          d: 'Europe',
        },
        correctAnswer: 'c',
        explanation: 'Asia is the largest continent.',
      },
      {
        id: 702,
        question: 'Which is the driest continent?',
        options: {
          a: 'Africa',
          b: 'Australia',
          c: 'Antarctica',
          d: 'South America',
        },
        correctAnswer: 'c',
        explanation: 'Antarctica is the driest continent.',
      },
      {
        id: 703,
        question: 'What is the longest mountain range?',
        options: {
          a: 'Himalayas',
          b: 'Andes',
          c: 'Rockies',
          d: 'Alps',
        },
        correctAnswer: 'b',
        explanation: 'The Andes is the longest mountain range in the world.',
      },
      {
        id: 704,
        question: 'Which country has the most population?',
        options: {
          a: 'India',
          b: 'China',
          c: 'USA',
          d: 'Indonesia',
        },
        correctAnswer: 'a',
        explanation: 'India has the highest population in the world.',
      },
      {
        id: 705,
        question: 'What is the capital of Japan?',
        options: {
          a: 'Seoul',
          b: 'Beijing',
          c: 'Bangkok',
          d: 'Tokyo',
        },
        correctAnswer: 'd',
        explanation: 'Tokyo is the capital of Japan.',
      },
    ],
  },
};

const QuizScreen: React.FC<Props> = ({
  navigation,
  route,
}) => {
  const { quizId } = route.params;

  const quiz = quizData[quizId];

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