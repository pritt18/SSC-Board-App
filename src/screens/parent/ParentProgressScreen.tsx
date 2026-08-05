import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { COLORS } from '../../constants/colors';
import { executeQuery } from '../../database/database';
import { useParentChild } from '../../context/ParentChildContext';
import ChildSwitcher from '../../components/parent/ChildSwitcher';

interface SubjectProgress {
  subject_id: number;
  name_english: string;
  icon: string;
  video_watched: number;
  pdf_viewed: number;
  quiz_completed: number;
  quiz_score: number;
}

const WEAK_THRESHOLD = 40;

const ParentProgressScreen: React.FC = () => {
  const { selectedChild, loading: childrenLoading } = useParentChild();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<SubjectProgress[]>([]);

  const loadProgress = async () => {
    if (!selectedChild) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const rows = await executeQuery(
        `SELECT
           s.id as subject_id,
           s.name_english,
           s.icon,
           COALESCE(p.video_watched, 0) as video_watched,
           COALESCE(p.pdf_viewed, 0) as pdf_viewed,
           COALESCE(p.quiz_completed, 0) as quiz_completed,
           COALESCE(p.quiz_score, 0) as quiz_score
         FROM subjects s
         LEFT JOIN progress p ON p.subject_id = s.id AND p.user_id = ?
         WHERE s.class_id = ?
         ORDER BY s.name_english ASC`,
        [selectedChild.id, selectedChild.class_id]
      );
      setSubjects(rows as SubjectProgress[]);
    } catch (error) {
      console.error('Error loading child progress:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProgress();
    }, [selectedChild?.id])
  );

  const weakSubjects = subjects.filter(
    (s) => s.quiz_completed && s.quiz_score < WEAK_THRESHOLD
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Progress</Text>
        <Text style={styles.subtitle}>Subject-wise learning progress</Text>
      </View>

      <ChildSwitcher />

      {childrenLoading || loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
      ) : !selectedChild ? (
        <Text style={styles.emptyText}>No child selected.</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {weakSubjects.length > 0 && (
            <View style={styles.weakBox}>
              <Text style={styles.weakTitle}>⚠️ Needs Attention</Text>
              <Text style={styles.weakSubtitle}>
                {selectedChild.full_name} is scoring below {WEAK_THRESHOLD}% in:
              </Text>
              {weakSubjects.map((s) => (
                <Text key={s.subject_id} style={styles.weakItem}>
                  • {s.name_english} ({s.quiz_score}%)
                </Text>
              ))}
            </View>
          )}

          <Text style={styles.sectionTitle}>All Subjects</Text>

          {subjects.length === 0 ? (
            <Text style={styles.emptyText}>No subjects found for this class yet.</Text>
          ) : (
            subjects.map((s) => (
              <View key={s.subject_id} style={styles.subjectCard}>
                <View style={styles.subjectHeader}>
                  <Text style={styles.subjectIcon}>{s.icon || '📚'}</Text>
                  <Text style={styles.subjectName}>{s.name_english}</Text>
                  {s.quiz_completed ? (
                    <Text
                      style={[
                        styles.scoreBadge,
                        s.quiz_score < WEAK_THRESHOLD
                          ? styles.scoreBadgeLow
                          : styles.scoreBadgeGood,
                      ]}
                    >
                      {s.quiz_score}%
                    </Text>
                  ) : (
                    <Text style={styles.scoreBadgeNone}>No quiz yet</Text>
                  )}
                </View>
                <View style={styles.rowChips}>
                  <Text style={[styles.chip, s.video_watched && styles.chipDone]}>
                    {s.video_watched ? '✓' : '○'} Video
                  </Text>
                  <Text style={[styles.chip, s.pdf_viewed && styles.chipDone]}>
                    {s.pdf_viewed ? '✓' : '○'} PDF
                  </Text>
                  <Text style={[styles.chip, s.quiz_completed && styles.chipDone]}>
                    {s.quiz_completed ? '✓' : '○'} Quiz
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default ParentProgressScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginTop: 30,
  },
  weakBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 16,
    marginBottom: 20,
  },
  weakTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#B91C1C',
  },
  weakSubtitle: {
    fontSize: 12,
    color: '#7F1D1D',
    marginTop: 4,
    marginBottom: 6,
  },
  weakItem: {
    fontSize: 13,
    color: '#7F1D1D',
    fontWeight: '600',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  subjectCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 12,
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subjectIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  subjectName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  scoreBadge: {
    fontSize: 13,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  scoreBadgeGood: {
    backgroundColor: '#DCFCE7',
    color: COLORS.success,
  },
  scoreBadgeLow: {
    backgroundColor: '#FEE2E2',
    color: COLORS.error,
  },
  scoreBadgeNone: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  rowChips: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  chip: {
    fontSize: 11,
    color: COLORS.textSecondary,
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  chipDone: {
    color: COLORS.success,
    backgroundColor: '#DCFCE7',
  },
});
