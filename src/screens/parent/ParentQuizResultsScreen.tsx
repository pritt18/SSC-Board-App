import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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

interface QuizAttempt {
  id: number;
  quiz_title: string;
  subject_name: string;
  score: number;
  correct_answers: number;
  total_questions: number;
  attempted_at: string;
}

const ParentQuizResultsScreen: React.FC = () => {
  const { selectedChild, loading: childrenLoading } = useParentChild();
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);

  const loadResults = async () => {
    if (!selectedChild) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const rows = await executeQuery(
        `SELECT
           qa.id,
           q.title_english as quiz_title,
           s.name_english as subject_name,
           qa.score,
           qa.correct_answers,
           qa.total_questions,
           qa.attempted_at
         FROM quiz_attempts qa
         LEFT JOIN quizzes q ON qa.quiz_id = q.id
         LEFT JOIN subjects s ON q.subject_id = s.id
         WHERE qa.user_id = ?
         ORDER BY qa.attempted_at DESC`,
        [selectedChild.id]
      );
      setAttempts(rows as QuizAttempt[]);
    } catch (error) {
      console.error('Error loading quiz results:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadResults();
    }, [selectedChild?.id])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Quiz Results</Text>
        <Text style={styles.subtitle}>Every attempt, most recent first</Text>
      </View>

      <ChildSwitcher />

      {childrenLoading || loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
      ) : (
        <FlatList
          data={attempts}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No quiz attempts yet.</Text>
          }
          renderItem={({ item }) => {
            const passed = item.score >= 40;
            return (
              <View style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.quizTitle}>
                    {item.quiz_title || 'Quiz'}
                  </Text>
                  <Text style={styles.meta}>
                    {item.subject_name || 'Subject'} •{' '}
                    {new Date(item.attempted_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                  <Text style={styles.metaSmall}>
                    {item.correct_answers}/{item.total_questions} correct
                  </Text>
                </View>
                <Text
                  style={[
                    styles.scoreBadge,
                    passed ? styles.scoreBadgeGood : styles.scoreBadgeLow,
                  ]}
                >
                  {item.score}%
                </Text>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
};

export default ParentQuizResultsScreen;

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
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginTop: 30,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 12,
  },
  quizTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  meta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  metaSmall: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  scoreBadge: {
    fontSize: 15,
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
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
});
