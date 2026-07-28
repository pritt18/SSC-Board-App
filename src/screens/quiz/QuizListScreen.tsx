import React from 'react';

import {
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
  'QuizList'
>;

interface QuizItem {
  id: number;
  title: string;
  description: string;
  type: string;
  icon: string;
  totalQuestions: number;
  timeLimit: number;
  passingPercentage: number;
}

// =========================================
// HARDCODED QUIZ DATA
// =========================================

const quizzes: QuizItem[] = [
  {
    id: 1,
    title: 'Mathematics Practice Quiz',
    description:
      'Practice basic mathematics questions.',
    type: 'Practice MCQ',
    icon: '📝',
    totalQuestions: 5,
    timeLimit: 5,
    passingPercentage: 40,
  },
  {
    id: 2,
    title: 'Mathematics Mock Test',
    description:
      'Test your basic mathematics knowledge.',
    type: 'Mock Test',
    icon: '⏱️',
    totalQuestions: 5,
    timeLimit: 10,
    passingPercentage: 40,
  },
];

const QuizListScreen: React.FC<Props> = ({
  navigation,
}) => {
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

        <View style={styles.quizList}>
          {quizzes.map(quiz => (
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
                  {quiz.icon}
                </Text>
              </View>

              <View
                style={styles.quizInfo}
              >
                <Text
                  style={styles.quizType}
                >
                  {quiz.type}
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
          ))}
        </View>
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