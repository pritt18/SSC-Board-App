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
import { TeacherQuizzesStackParamList } from '../../navigation/navigationTypes';

type Props = NativeStackScreenProps<TeacherQuizzesStackParamList, 'TeacherCreateQuiz'>;

interface SubjectRow {
  id: number;
  name_english: string;
}

interface DraftQuestion {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correct: 'a' | 'b' | 'c' | 'd';
}

const emptyQuestion = (): DraftQuestion => ({
  question: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  correct: 'a',
});

const TeacherCreateQuizScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();

  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyQuestion()]);
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

  const updateQuestion = (index: number, patch: Partial<DraftQuestion>) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...patch } : q))
    );
  };

  const addQuestion = () => setQuestions((prev) => [...prev, emptyQuestion()]);

  const removeQuestion = (index: number) => {
    if (questions.length === 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = (): string | null => {
    if (!selectedSubjectId) return 'Please select a subject.';
    if (!title.trim()) return 'Please enter a quiz title.';
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim() || !q.optionA.trim() || !q.optionB.trim()) {
        return `Question ${i + 1}: fill in the question and at least options A & B.`;
      }
    }
    return null;
  };

  const handleSave = async () => {
    const error = validate();
    if (error) {
      Alert.alert('Incomplete', error);
      return;
    }
    if (!user?.id) return;

    setSaving(true);
    try {
      const result: any = await executeQuery(
        `INSERT INTO quizzes
           (subject_id, title_english, title_marathi, type, total_questions, time_limit, passing_percentage, is_active)
         VALUES (?, ?, ?, 'practice_mcq', ?, 5, 40, 1)`,
        [selectedSubjectId, title.trim(), title.trim(), questions.length]
      );

      const quizIdRows = await executeQuery(
        `SELECT id FROM quizzes WHERE subject_id = ? ORDER BY id DESC LIMIT 1`,
        [selectedSubjectId]
      );
      const quizId = quizIdRows[0]?.id;

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await executeQuery(
          `INSERT INTO questions
             (quiz_id, question_text_english, question_text_marathi,
              option_a_english, option_a_marathi,
              option_b_english, option_b_marathi,
              option_c_english, option_c_marathi,
              option_d_english, option_d_marathi,
              correct_answer, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            quizId,
            q.question.trim(), q.question.trim(),
            q.optionA.trim(), q.optionA.trim(),
            q.optionB.trim(), q.optionB.trim(),
            q.optionC.trim() || null, q.optionC.trim() || null,
            q.optionD.trim() || null, q.optionD.trim() || null,
            q.correct,
            i + 1,
          ]
        );
      }

      Alert.alert('Success', 'Quiz created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('Error creating quiz:', error);
      Alert.alert('Error', 'Failed to create quiz. Please try again.');
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
        <Text style={styles.title}>Create Quiz</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Subject</Text>
        {subjects.length === 0 ? (
          <Text style={styles.emptyText}>
            No subjects found for your class. Ask admin to add subjects first.
          </Text>
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

        <Input label="Quiz Title" placeholder="e.g. Chapter 3 Practice" value={title} onChangeText={setTitle} />

        <Text style={styles.sectionLabel}>Questions ({questions.length})</Text>

        {questions.map((q, index) => (
          <View key={index} style={styles.questionCard}>
            <View style={styles.questionHeader}>
              <Text style={styles.questionNumber}>Question {index + 1}</Text>
              {questions.length > 1 && (
                <TouchableOpacity onPress={() => removeQuestion(index)}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>

            <Input
              placeholder="Question text"
              value={q.question}
              onChangeText={(t) => updateQuestion(index, { question: t })}
            />
            <Input
              placeholder="Option A"
              value={q.optionA}
              onChangeText={(t) => updateQuestion(index, { optionA: t })}
            />
            <Input
              placeholder="Option B"
              value={q.optionB}
              onChangeText={(t) => updateQuestion(index, { optionB: t })}
            />
            <Input
              placeholder="Option C (optional)"
              value={q.optionC}
              onChangeText={(t) => updateQuestion(index, { optionC: t })}
            />
            <Input
              placeholder="Option D (optional)"
              value={q.optionD}
              onChangeText={(t) => updateQuestion(index, { optionD: t })}
            />

            <Text style={styles.correctLabel}>Correct Answer</Text>
            <View style={styles.correctRow}>
              {(['a', 'b', 'c', 'd'] as const).map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.correctOption,
                    q.correct === opt && styles.correctOptionSelected,
                  ]}
                  onPress={() => updateQuestion(index, { correct: opt })}
                >
                  <Text
                    style={[
                      styles.correctOptionText,
                      q.correct === opt && styles.correctOptionTextSelected,
                    ]}
                  >
                    {opt.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.addQuestionButton} onPress={addQuestion}>
          <Text style={styles.addQuestionText}>+ Add Another Question</Text>
        </TouchableOpacity>

        <Button
          title={saving ? 'Saving...' : 'Save Quiz'}
          onPress={handleSave}
          disabled={saving}
          loading={saving}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default TeacherCreateQuizScreen;

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
  sectionLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 10, marginTop: 12 },
  emptyText: { color: COLORS.textSecondary, marginBottom: 16 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white,
  },
  chipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textPrimary, fontWeight: '600', fontSize: 13 },
  chipTextSelected: { color: COLORS.white },
  questionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 14,
  },
  questionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  questionNumber: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  removeText: { fontSize: 12, color: COLORS.error, fontWeight: '600' },
  correctLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginTop: 4, marginBottom: 6 },
  correctRow: { flexDirection: 'row', gap: 8 },
  correctOption: {
    width: 40, height: 40, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  correctOptionSelected: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  correctOptionText: { fontWeight: '700', color: COLORS.textPrimary },
  correctOptionTextSelected: { color: COLORS.white },
  addQuestionButton: {
    alignSelf: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  addQuestionText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
});
