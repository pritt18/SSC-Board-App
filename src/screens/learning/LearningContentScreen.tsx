import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { COLORS } from '../../constants/colors';
import {
  LearningStackParamList,
} from '../../navigation/navigationTypes';

type Props = NativeStackScreenProps<
  LearningStackParamList,
  'LearningContent'
>;

const LearningContentScreen: React.FC<Props> = ({
  navigation,
  route,
}) => {
  const { subjectId } = route.params;

  const handleVideoPress = () => {
    navigation.navigate('VideoPlayer', {
      subjectId,
    });
  };

  const handlePdfPress = () => {
    navigation.navigate('PdfViewer', {
      subjectId,
    });
  };

  const handleQuizPress = () => {
    navigation.navigate('QuizList', {
      subjectId,
    });
  };

  const learningOptions = [
    {
      id: 1,
      title: 'Video Lessons',
      subtitle: 'Watch subject videos',
      icon: '▶️',
      onPress: handleVideoPress,
    },
    {
      id: 2,
      title: 'PDF',
      subtitle: 'Read textbooks and study material',
      icon: '📄',
      onPress: handlePdfPress,
    },
    {
      id: 3,
      title: 'Notes',
      subtitle: 'Read subject notes',
      icon: '📒',
      onPress: () => {
        console.log('Notes clicked for subject:', subjectId);
      },
    },
    {
      id: 4,
      title: 'MCQ Quiz',
      subtitle: 'Test your knowledge',
      icon: '📝',
      onPress: handleQuizPress,
    },
    {
      id: 5,
      title: 'Practice Questions',
      subtitle: 'Practice important questions',
      icon: '✍️',
      onPress: () => {
        console.log(
          'Practice Questions clicked for subject:',
          subjectId,
        );
      },
    },
    {
      id: 6,
      title: 'Games',
      subtitle: 'Learn while playing',
      icon: '🎮',
      onPress: () => {
        console.log('Games clicked for subject:', subjectId);
      },
    },
    {
      id: 7,
      title: 'Puzzles',
      subtitle: 'Improve your thinking skills',
      icon: '🧩',
      onPress: () => {
        console.log('Puzzles clicked for subject:', subjectId);
      },
    },
    {
      id: 8,
      title: 'Assignment',
      subtitle: 'Complete your assignment',
      icon: '📋',
      onPress: () => {
        console.log(
          'Assignment clicked for subject:',
          subjectId,
        );
      },
    },
  ];

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top']}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>
              ‹
            </Text>
          </Pressable>

          <View style={styles.headerContent}>
            <Text style={styles.headerLabel}>
              Subject Learning
            </Text>

            <Text style={styles.title}>
              Learning Content
            </Text>
          </View>
        </View>

        {/* Progress */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>
              Learning Progress
            </Text>

            <Text style={styles.progressPercentage}>
              25%
            </Text>
          </View>

          <View style={styles.progressBackground}>
            <View style={styles.progressFill} />
          </View>

          <Text style={styles.progressDescription}>
            Complete all learning activities for this subject.
          </Text>
        </View>

        {/* Learning Options */}
        <Text style={styles.sectionTitle}>
          Learning Content
        </Text>

        <View style={styles.grid}>
          {learningOptions.map(item => (
            <Pressable
              key={item.id}
              onPress={item.onPress}
              style={({ pressed }) => [
                styles.optionCard,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>
                  {item.icon}
                </Text>
              </View>

              <Text style={styles.optionTitle}>
                {item.title}
              </Text>

              <Text style={styles.optionSubtitle}>
                {item.subtitle}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default LearningContentScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },

  backText: {
    fontSize: 32,
    color: COLORS.textPrimary,
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
    color: COLORS.textPrimary,
    fontSize: 25,
    fontWeight: '700',
    marginTop: 3,
  },

  progressCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    padding: 20,
    marginBottom: 30,
  },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  progressTitle: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '700',
  },

  progressPercentage: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },

  progressBackground: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    marginTop: 16,
    overflow: 'hidden',
  },

  progressFill: {
    width: '25%',
    height: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 4,
  },

  progressDescription: {
    color: COLORS.white,
    opacity: 0.85,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 18,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
  },

  optionCard: {
    width: '47%',
    minHeight: 165,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  pressed: {
    opacity: 0.7,
  },

  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  icon: {
    fontSize: 25,
  },

  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 14,
  },

  optionSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
  },
});