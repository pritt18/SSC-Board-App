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

import { COLORS } from '../../../constants/colors';
import {
  LearningStackParamList,
} from '../../../navigation/navigationTypes';

type Props = NativeStackScreenProps<
  LearningStackParamList,
  'SubjectList'
>;

const subjects = [
  { id: 1, name: 'Mathematics', icon: '📐' },
  { id: 2, name: 'Science', icon: '🔬' },
  { id: 3, name: 'English', icon: '📖' },
  { id: 4, name: 'Marathi', icon: 'म' },
  { id: 5, name: 'Hindi', icon: 'अ' },
  { id: 6, name: 'History', icon: '🏛️' },
  { id: 7, name: 'Geography', icon: '🌍' },
];

const SubjectsScreen: React.FC<Props> = ({
  navigation,
  route,
}) => {
const { classId } = route.params;

  const handleSubjectPress = (
    subjectId: number,
  ) => {
    navigation.navigate('LearningContent', {
      subjectId,
    });
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top']}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>
              ‹
            </Text>
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.title}>
              Class {classId}
            </Text>

            <Text style={styles.subtitle}>
              Choose a subject to start learning
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Subjects
        </Text>

        <View style={styles.grid}>
          {subjects.map(subject => (
            <Pressable
              key={subject.id}
              onPress={() =>
                handleSubjectPress(subject.id)
              }
              style={({ pressed }) => [
                styles.subjectCard,
                pressed && styles.pressedCard,
              ]}
            >
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>
                  {subject.icon}
                </Text>
              </View>

              <Text style={styles.subjectName}>
                {subject.name}
              </Text>

              <Text style={styles.openText}>
                Start Learning →
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SubjectsScreen;

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
    marginBottom: 30,
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

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
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

  subjectCard: {
    width: '47%',
    minHeight: 170,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  pressedCard: {
    opacity: 0.75,
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
    fontSize: 26,
    color: COLORS.primary,
    fontWeight: '700',
  },

  subjectName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 16,
  },

  openText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
});