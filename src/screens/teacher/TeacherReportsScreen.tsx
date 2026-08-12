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
import { useAuth } from '../../context/AuthContext';

interface StudentReport {
  id: number;
  full_name: string;
  email: string;
  quizzes_completed: number;
  avg_score: number;
  videos_watched: number;
}

const TeacherReportsScreen: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentReport[]>([]);

  const loadReports = async () => {
    if (!user?.class_id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const rows = await executeQuery(
        `SELECT
           u.id,
           u.full_name,
           u.email,
           COUNT(CASE WHEN p.quiz_completed = 1 THEN 1 END) as quizzes_completed,
           AVG(CASE WHEN p.quiz_completed = 1 THEN p.quiz_score END) as avg_score,
           COUNT(CASE WHEN p.video_watched = 1 THEN 1 END) as videos_watched
         FROM users u
         LEFT JOIN progress p ON p.user_id = u.id
         WHERE u.role = 'student' AND u.class_id = ?
         GROUP BY u.id
         ORDER BY u.full_name ASC`,
        [user.class_id]
      );
      setStudents(
        (rows as any[]).map((r) => ({
          ...r,
          avg_score: Math.round(r.avg_score || 0),
        }))
      );
    } catch (error) {
      console.error('Error loading student reports:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [user?.class_id])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Student Reports</Text>
        <Text style={styles.subtitle}>Progress overview for your class</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
      ) : !user?.class_id ? (
        <Text style={styles.emptyText}>No class assigned yet.</Text>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No students in your class yet.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.full_name}</Text>
                <Text style={styles.email}>{item.email}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>📹 {item.videos_watched} videos</Text>
                  <Text style={styles.metaText}>✅ {item.quizzes_completed} quizzes</Text>
                </View>
              </View>
              <Text
                style={[
                  styles.scoreBadge,
                  item.avg_score < 40 ? styles.scoreBadgeLow : styles.scoreBadgeGood,
                ]}
              >
                {item.quizzes_completed > 0 ? `${item.avg_score}%` : 'N/A'}
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

export default TeacherReportsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
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
  name: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  email: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 14, marginTop: 6 },
  metaText: { fontSize: 11, color: COLORS.textSecondary },
  scoreBadge: {
    fontSize: 14,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    overflow: 'hidden',
  },
  scoreBadgeGood: { backgroundColor: '#DCFCE7', color: COLORS.success },
  scoreBadgeLow: { backgroundColor: '#FEE2E2', color: COLORS.error },
});
