import React, { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
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
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { TeacherAssignmentsStackParamList } from '../../navigation/navigationTypes';

type Props = NativeStackScreenProps<TeacherAssignmentsStackParamList, 'TeacherCreateAssignment'>;

interface SubjectRow {
  id: number;
  name_english: string;
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const TeacherCreateAssignmentScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  const loadSubjects = async () => {
    if (!user?.class_id) return;
    try {
      const rows = await executeQuery(
        `SELECT id, name_english FROM subjects WHERE class_id = ? AND is_active = 1 ORDER BY name_english ASC`,
        [user.class_id]
      );
      setSubjects(rows as SubjectRow[]);
      if (rows.length > 0) setSelectedSubjectId((rows[0] as SubjectRow).id);
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSubjects();
    }, [user?.class_id])
  );

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter an assignment title.');
      return;
    }
    if (dueDate.trim() && !DATE_REGEX.test(dueDate.trim())) {
      Alert.alert('Invalid Date', 'Please enter due date as YYYY-MM-DD, or leave it blank.');
      return;
    }
    if (!user?.id || !user?.class_id) return;

    setSaving(true);
    try {
      await executeQuery(
        `INSERT INTO assignments (class_id, subject_id, teacher_id, title, description, due_date, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [
          user.class_id,
          selectedSubjectId,
          user.id,
          title.trim(),
          description.trim() || null,
          dueDate.trim() || null,
        ]
      );
      Alert.alert('Success', 'Assignment created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('Error creating assignment:', error);
      Alert.alert('Error', 'Failed to create assignment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Create Assignment</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Subject</Text>
        {subjects.length === 0 ? (
          <Text style={styles.emptyText}>No subjects found for your class.</Text>
        ) : (
          <View style={styles.chipRow}>
            {subjects.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => setSelectedSubjectId(s.id)}
                style={[styles.chip, selectedSubjectId === s.id && styles.chipSelected]}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedSubjectId === s.id && styles.chipTextSelected,
                  ]}
                >
                  {s.name_english}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <Input label="Assignment Title" placeholder="e.g. Chapter 4 Homework" value={title} onChangeText={setTitle} />
        <Input
          label="Description (optional)"
          placeholder="Instructions for students..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />
        <Input
          label="Due Date (YYYY-MM-DD, optional)"
          placeholder="e.g. 2026-09-15"
          value={dueDate}
          onChangeText={setDueDate}
          autoCapitalize="none"
        />

        <Button
          title={saving ? 'Saving...' : 'Save Assignment'}
          onPress={handleSave}
          disabled={saving}
          loading={saving}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default TeacherCreateAssignmentScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: { marginRight: 10 },
  backText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
  title: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
  content: { padding: 20, paddingBottom: 60 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 10 },
  emptyText: { color: COLORS.textSecondary, marginBottom: 16 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white,
  },
  chipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textPrimary, fontWeight: '600', fontSize: 13 },
  chipTextSelected: { color: COLORS.white },
});
