import React from 'react';

import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import { COLORS } from '../../constants/colors';

import {
  LearningStackParamList,
} from '../../navigation/navigationTypes';

type Props = NativeStackScreenProps<
  LearningStackParamList,
  'QuizResult'
>;

interface HardcodedQuizInfo {
  title: string;
  passingPercentage: number;
}

// =========================================
// HARDCODED QUIZ INFORMATION
// =========================================

const quizInfo: Record<
  number,
  HardcodedQuizInfo
> = {
  1: {
    title:
      'Mathematics Practice Quiz',
    passingPercentage: 40,
  },

  2: {
    title:
      'Mathematics Mock Test',
    passingPercentage: 40,
  },
};

const QuizResultScreen: React.FC<Props> = ({
  navigation,
  route,
}) => {
  const {
    quizId,
    score,
    total,
  } = route.params;

  const quiz = quizInfo[quizId];

  const percentage =
    total > 0
      ? Math.round(
          (score / total) * 100,
        )
      : 0;

  const passingPercentage =
    quiz?.passingPercentage ?? 40;

  const isPassed =
    percentage >=
    passingPercentage;

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
        {/* RESULT ICON */}

        <View
          style={
            styles.resultIconContainer
          }
        >
          <Text
            style={styles.resultIcon}
          >
            {isPassed
              ? '🏆'
              : '📚'}
          </Text>
        </View>

        {/* RESULT TITLE */}

        <Text
          style={styles.resultTitle}
        >
          {isPassed
            ? 'Great Job!'
            : 'Keep Practicing!'}
        </Text>

        <Text
          style={styles.quizTitle}
        >
          {quiz?.title ??
            'Quiz Result'}
        </Text>

        <Text
          style={
            styles.resultMessage
          }
        >
          {isPassed
            ? 'You successfully passed the quiz.'
            : 'Practice again and improve your score.'}
        </Text>

        {/* SCORE CARD */}

        <View
          style={styles.scoreCard}
        >
          <Text
            style={styles.scoreLabel}
          >
            Your Score
          </Text>

          <Text
            style={styles.percentage}
          >
            {percentage}%
          </Text>

          <Text
            style={styles.scoreText}
          >
            {score} out of {total}{' '}
            correct
          </Text>

          <View
            style={[
              styles.statusBadge,

              !isPassed &&
                styles.failedBadge,
            ]}
          >
            <Text
              style={[
                styles.statusText,

                !isPassed &&
                  styles.failedText,
              ]}
            >
              {isPassed
                ? 'PASSED'
                : 'TRY AGAIN'}
            </Text>
          </View>
        </View>

        {/* RESULT DETAILS */}

        <View
          style={
            styles.statsContainer
          }
        >
          {/* CORRECT */}

          <View
            style={styles.statCard}
          >
            <Text
              style={styles.statIcon}
            >
              ✓
            </Text>

            <Text
              style={styles.statValue}
            >
              {score}
            </Text>

            <Text
              style={styles.statLabel}
            >
              Correct
            </Text>
          </View>

          {/* WRONG */}

          <View
            style={styles.statCard}
          >
            <Text
              style={styles.statIcon}
            >
              ✕
            </Text>

            <Text
              style={styles.statValue}
            >
              {total - score}
            </Text>

            <Text
              style={styles.statLabel}
            >
              Wrong
            </Text>
          </View>

          {/* PASSING */}

          <View
            style={styles.statCard}
          >
            <Text
              style={styles.statIcon}
            >
              🎯
            </Text>

            <Text
              style={styles.statValue}
            >
              {passingPercentage}%
            </Text>

            <Text
              style={styles.statLabel}
            >
              Passing
            </Text>
          </View>
        </View>

        {/* TRY AGAIN */}

        <Pressable
          style={
            styles.primaryButton
          }
          onPress={() =>
            navigation.replace(
              'QuizScreen',
              {
                quizId,
              },
            )
          }
        >
          <Text
            style={
              styles.primaryButtonText
            }
          >
            Try Again
          </Text>
        </Pressable>

        {/* BACK */}

        <Pressable
          style={
            styles.secondaryButton
          }
          onPress={() =>
            navigation.goBack()
          }
        >
          <Text
            style={
              styles.secondaryButtonText
            }
          >
            Back
          </Text>
        </Pressable>

        <Text
          style={styles.infoText}
        >
          Quiz content is available
          offline.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

export default QuizResultScreen;

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        COLORS.background,
    },

    content: {
      flexGrow: 1,
      padding: 20,
      paddingTop: 45,
      paddingBottom: 40,
      alignItems: 'center',
    },

    resultIconContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor:
        COLORS.primaryLight,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    resultIcon: {
      fontSize: 50,
    },

    resultTitle: {
      color:
        COLORS.textPrimary,
      fontSize: 28,
      fontWeight: '800',
      marginTop: 22,
      textAlign: 'center',
    },

    quizTitle: {
      color: COLORS.primary,
      fontSize: 15,
      fontWeight: '700',
      marginTop: 8,
      textAlign: 'center',
    },

    resultMessage: {
      color:
        COLORS.textSecondary,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
      marginTop: 8,
      paddingHorizontal: 20,
    },

    scoreCard: {
      width: '100%',
      backgroundColor:
        COLORS.white,
      borderRadius: 22,
      padding: 25,
      alignItems: 'center',
      marginTop: 30,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    scoreLabel: {
      color:
        COLORS.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },

    percentage: {
      color: COLORS.primary,
      fontSize: 52,
      fontWeight: '800',
      marginTop: 5,
    },

    scoreText: {
      color:
        COLORS.textSecondary,
      fontSize: 14,
      marginTop: 3,
    },

    statusBadge: {
      backgroundColor:
        COLORS.primaryLight,
      paddingHorizontal: 18,
      paddingVertical: 8,
      borderRadius: 20,
      marginTop: 17,
    },

    statusText: {
      color: COLORS.primary,
      fontSize: 12,
      fontWeight: '800',
    },

    failedBadge: {
      backgroundColor: '#FEE2E2',
    },

    failedText: {
      color: '#DC2626',
    },

    statsContainer: {
      width: '100%',
      flexDirection: 'row',
      gap: 10,
      marginTop: 20,
    },

    statCard: {
      flex: 1,
      backgroundColor:
        COLORS.white,
      borderRadius: 16,
      paddingVertical: 18,
      alignItems: 'center',
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    statIcon: {
      fontSize: 20,
      color: COLORS.primary,
    },

    statValue: {
      color:
        COLORS.textPrimary,
      fontSize: 20,
      fontWeight: '800',
      marginTop: 5,
    },

    statLabel: {
      color:
        COLORS.textSecondary,
      fontSize: 11,
      marginTop: 3,
    },

    primaryButton: {
      width: '100%',
      backgroundColor:
        COLORS.primary,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 30,
    },

    primaryButtonText: {
      color: COLORS.white,
      fontSize: 15,
      fontWeight: '700',
    },

    secondaryButton: {
      width: '100%',
      backgroundColor:
        COLORS.white,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 12,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    secondaryButtonText: {
      color: COLORS.primary,
      fontSize: 15,
      fontWeight: '700',
    },

    infoText: {
      color:
        COLORS.textSecondary,
      fontSize: 11,
      marginTop: 18,
      textAlign: 'center',
    },
  });