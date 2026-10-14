import React, {
  useCallback,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import { COLORS } from '../../../constants/colors';
import { executeQuery } from '../../../database/database';

import {
  LearningStackParamList,
} from '../../../navigation/navigationTypes';

type Props = NativeStackScreenProps<
  LearningStackParamList,
  'SubjectList'
>;

interface SubjectItem {
  id: number;
  class_id: number;
  name_english: string;
  name_marathi: string;
  icon?: string | null;
  color?: string | null;
  is_active: number | boolean;
  video_count?: number;
  pdf_count?: number;
}

const SubjectListScreen: React.FC<Props> = ({
  navigation,
  route,
}) => {
  const { classId } = route.params;

  const [subjects, setSubjects] =
    useState<SubjectItem[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const loadSubjects = async () => {
    try {
      setIsLoading(true);

      const subjectData = await executeQuery(
        `SELECT s.*,
                (SELECT COUNT(*) FROM videos v WHERE v.subject_id = s.id AND v.is_active = 1) as video_count,
                (SELECT COUNT(*) FROM pdfs p WHERE p.subject_id = s.id AND p.is_active = 1) as pdf_count
         FROM subjects s
         WHERE s.class_id = ?
         AND s.is_active = ?
         ORDER BY s.name_english ASC`,
        [classId, 1],
      );

      console.log(
        `Subjects for Class ${classId}:`,
        subjectData,
      );

      setSubjects(
        subjectData as SubjectItem[],
      );
    } catch (error) {
      console.error(
        'Error loading subjects:',
        error,
      );

      setSubjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSubjects();
    }, [classId]),
  );

  const handleSubjectPress = (
    subjectId: number,
  ) => {
    navigation.navigate(
      'LearningContent',
      {
        subjectId,
      },
    );
  };

  if (isLoading) {
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
            onPress={() =>
              navigation.goBack()
            }
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

        {subjects.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>
              📚
            </Text>

            <Text style={styles.emptyTitle}>
              No Subjects Available
            </Text>

            <Text style={styles.emptyText}>
              Subjects for this class have not been added yet.
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {subjects.map(subject => (
              <Pressable
                key={subject.id}
                onPress={() =>
                  handleSubjectPress(
                    subject.id,
                  )
                }
                style={({ pressed }) => [
                  styles.subjectCard,

                  pressed &&
                    styles.pressedCard,
                ]}
              >
                <View
                  style={styles.iconContainer}
                >
                  <Text style={styles.icon}>
                    {subject.icon || '📘'}
                  </Text>
                </View>

                <Text
                  style={styles.subjectName}
                >
                  {subject.name_english}
                </Text>

                <Text style={styles.openText}>
                  {typeof subject.video_count === 'number' && subject.video_count > 0
                    ? `🎬 ${subject.video_count} Video${subject.video_count > 1 ? 's' : ''}`
                    : typeof subject.pdf_count === 'number' && subject.pdf_count > 0
                    ? `📄 ${subject.pdf_count} Book${subject.pdf_count > 1 ? 's' : ''}`
                    : 'Start Learning →'}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default SubjectListScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },

  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
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

  emptyContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 35,
    alignItems: 'center',
  },

  emptyIcon: {
    fontSize: 45,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 15,
  },

  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 6,
  },
});