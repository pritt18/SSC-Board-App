import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { COLORS } from '../../constants/colors';
import { executeQuery } from '../../database/database';
import { useAuth } from '../../context/AuthContext';
import { TeacherQuizzesStackParamList } from '../../navigation/navigationTypes';

type Props = NativeStackScreenProps<TeacherQuizzesStackParamList, 'TeacherQuizzes'>;

interface QuizRow {
  id: number;
  title_english: string;
  subject_name: string;
  total_questions: number;
  is_active: number;
  created_at: string;
}

const TeacherQuizzesScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);

  const loadQuizzes = async () => {
    if (!user?.class_id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const rows = await executeQuery(
        `SELECT q.id, q.title_english, s.name_english as subject_name,
                q.total_questions, q.is_active, q.created_at
         FROM quizzes q
         JOIN subjects s ON q.subject_id = s.id
         WHERE s.class_id = ?
         ORDER BY q.created_at DESC`,
        [user.class_id]
      );
      setQuizzes(rows as QuizRow[]);
    } catch (error) {
      console.error('Error loading teacher quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadQuizzes();
    }, [user?.class_id])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Quizzes</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('TeacherCreateQuiz')}
        >
          <Text style={styles.createButtonText}>+ Create</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
      ) : (
        <FlatList
          data={quizzes}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No quizzes yet. Tap "+ Create" to add one for your class.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.title_english}</Text>
                <Text style={styles.cardMeta}>
                  {item.subject_name} • {item.total_questions} questions
                </Text>
              </View>
              <Text
                style={[
                  styles.statusBadge,
                  item.is_active ? styles.statusActive : styles.statusInactive,
                ]}
              >
                {item.is_active ? 'Active' : 'Hidden'}
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

export default TeacherQuizzesScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary },
  createButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  createButtonText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
  listContent: { padding: 20, paddingBottom: 40 },
  emptyText: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 30 },
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
  cardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  cardMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3 },
  statusBadge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  statusActive: { backgroundColor: '#DCFCE7', color: COLORS.success },
  statusInactive: { backgroundColor: '#F1F5F9', color: COLORS.textSecondary },
});
