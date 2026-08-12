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

import { COLORS } from '../../constants/colors';
import { executeQuery } from '../../database/database';
import { useAuth } from '../../context/AuthContext';

interface AssignmentRow {
  id: number;
  title: string;
  description: string | null;
  subject_name: string | null;
  teacher_name: string | null;
  due_date: string | null;
  created_at: string;
}

const StudentAssignmentsScreen: React.FC<any> = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);

  const loadAssignments = async () => {
    if (!user?.class_id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const rows = await executeQuery(
        `SELECT a.id, a.title, a.description, a.due_date, a.created_at,
                s.name_english as subject_name,
                t.full_name as teacher_name
         FROM assignments a
         LEFT JOIN subjects s ON a.subject_id = s.id
         LEFT JOIN users t ON a.teacher_id = t.id
         WHERE a.class_id = ? AND a.is_active = 1
         ORDER BY a.created_at DESC`,
        [user.class_id]
      );
      setAssignments(rows as AssignmentRow[]);
    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAssignments();
    }, [user?.class_id])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Assignments</Text>
        <Text style={styles.subtitle}>Homework from your teacher</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
      ) : (
        <FlatList
          data={assignments}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No assignments yet. Check back later!</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              {item.description ? (
                <Text style={styles.cardDesc}>{item.description}</Text>
              ) : null}
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>
                  {item.subject_name || 'General'}
                  {item.teacher_name ? ` • ${item.teacher_name}` : ''}
                </Text>
                {item.due_date && (
                  <Text style={styles.dueDate}>Due {item.due_date}</Text>
                )}
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

export default StudentAssignmentsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 20, paddingBottom: 10 },
  backButton: { marginBottom: 8 },
  backText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  listContent: { padding: 20, paddingBottom: 40 },
  emptyText: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 30 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  cardDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 6, lineHeight: 18 },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  metaText: { fontSize: 11, color: COLORS.textSecondary },
  dueDate: { fontSize: 11, color: COLORS.error, fontWeight: '700' },
});
