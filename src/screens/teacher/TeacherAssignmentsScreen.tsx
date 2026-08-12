import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { TeacherAssignmentsStackParamList } from '../../navigation/navigationTypes';

type Props = NativeStackScreenProps<TeacherAssignmentsStackParamList, 'TeacherAssignments'>;

interface AssignmentRow {
  id: number;
  title: string;
  description: string | null;
  subject_name: string | null;
  due_date: string | null;
  created_at: string;
}

const TeacherAssignmentsScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);

  const loadAssignments = async () => {
    if (!user?.id || !user?.class_id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const rows = await executeQuery(
        `SELECT a.id, a.title, a.description, a.due_date, a.created_at,
                s.name_english as subject_name
         FROM assignments a
         LEFT JOIN subjects s ON a.subject_id = s.id
         WHERE a.teacher_id = ? AND a.class_id = ? AND a.is_active = 1
         ORDER BY a.created_at DESC`,
        [user.id, user.class_id]
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
    }, [user?.id, user?.class_id])
  );

  const handleDelete = (id: number, title: string) => {
    Alert.alert('Delete Assignment', `Remove "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await executeQuery(`UPDATE assignments SET is_active = 0 WHERE id = ?`, [id]);
            loadAssignments();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete assignment.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Assignments</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('TeacherCreateAssignment')}
        >
          <Text style={styles.createButtonText}>+ Create</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
      ) : (
        <FlatList
          data={assignments}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No assignments yet. Tap "+ Create" to post one for your class.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                {item.description ? (
                  <Text style={styles.cardDesc} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
                <Text style={styles.cardMeta}>
                  {item.subject_name || 'General'}
                  {item.due_date ? ` • Due ${item.due_date}` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(item.id, item.title)}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

export default TeacherAssignmentsScreen;

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
    alignItems: 'flex-start',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  cardDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  cardMeta: { fontSize: 11, color: COLORS.primary, marginTop: 6, fontWeight: '600' },
  deleteText: { fontSize: 12, color: COLORS.error, fontWeight: '600' },
});
