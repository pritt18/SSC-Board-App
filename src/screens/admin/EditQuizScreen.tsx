// src/screens/admin/EditQuizScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS } from '../../constants/colors';
import { executeQuery } from '../../database/database';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<AdminStackParamList, 'EditQuiz'>;

interface Subject {
  id: number;
  name: string;
  className: string;
}

interface Question {
  id?: number;
  question: string;
  question_marathi: string;
  options: { a: string; b: string; c: string; d: string };
  options_marathi: { a: string; b: string; c: string; d: string };
  correctAnswer: string;
  explanation: string;
  explanation_marathi: string;
}

const EditQuizScreen: React.FC<Props> = ({ navigation, route }) => {
  const { quizId } = route.params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    titleMarathi: '',
    description: '',
    descriptionMarathi: '',
    subjectId: '',
    type: 'practice_mcq',
    timeLimit: '5',
    passingPercentage: '40',
  });

  useEffect(() => {
    loadData();
    loadSubjects();
  }, []);

  const loadData = async () => {
    try {
      // Load quiz details
      const quizResult = await executeQuery(
        `SELECT 
          title_english,
          title_marathi,
          description_english,
          description_marathi,
          subject_id,
          type,
          time_limit,
          passing_percentage
        FROM quizzes 
        WHERE id = ?`,
        [quizId]
      );
      
      if (quizResult.length > 0) {
        const quiz = quizResult[0];
        setFormData({
          title: quiz.title_english || '',
          titleMarathi: quiz.title_marathi || '',
          description: quiz.description_english || '',
          descriptionMarathi: quiz.description_marathi || '',
          subjectId: String(quiz.subject_id || ''),
          type: quiz.type || 'practice_mcq',
          timeLimit: String(quiz.time_limit || 5),
          passingPercentage: String(quiz.passing_percentage || 40),
        });
      }

      // Load questions
      const questionsResult = await executeQuery(
        `SELECT 
          id,
          question_text_english as question,
          question_text_marathi as question_marathi,
          option_a_english as option_a,
          option_a_marathi as option_a_marathi,
          option_b_english as option_b,
          option_b_marathi as option_b_marathi,
          option_c_english as option_c,
          option_c_marathi as option_c_marathi,
          option_d_english as option_d,
          option_d_marathi as option_d_marathi,
          correct_answer,
          explanation_english as explanation,
          explanation_marathi as explanation_marathi
        FROM questions 
        WHERE quiz_id = ?
        ORDER BY id`,
        [quizId]
      );

      setQuestions(questionsResult.map((q: any) => ({
        id: q.id,
        question: q.question || '',
        question_marathi: q.question_marathi || '',
        options: {
          a: q.option_a || '',
          b: q.option_b || '',
          c: q.option_c || '',
          d: q.option_d || '',
        },
        options_marathi: {
          a: q.option_a_marathi || '',
          b: q.option_b_marathi || '',
          c: q.option_c_marathi || '',
          d: q.option_d_marathi || '',
        },
        correctAnswer: q.correct_answer || 'a',
        explanation: q.explanation || '',
        explanation_marathi: q.explanation_marathi || '',
      })));

    } catch (error) {
      Alert.alert('Error', 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  const loadSubjects = async () => {
    try {
      const results = await executeQuery(
        `SELECT 
          s.id,
          s.name_english as name,
          c.name_english as className
        FROM subjects s
        JOIN classes c ON s.class_id = c.id
        WHERE s.is_active = 1
        ORDER BY c.class_number, s.name_english`,
        []
      );
      setSubjects(results as Subject[]);
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  const addQuestion = () => {
    setQuestions([...questions, {
      question: '',
      question_marathi: '',
      options: { a: '', b: '', c: '', d: '' },
      options_marathi: { a: '', b: '', c: '', d: '' },
      correctAnswer: 'a',
      explanation: '',
      explanation_marathi: '',
    }]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: string, value: string) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const updateOption = (index: number, option: string, value: string) => {
    const updated = [...questions];
    updated[index] = {
      ...updated[index],
      options: { ...updated[index].options, [option]: value }
    };
    setQuestions(updated);
  };

  const updateOptionMarathi = (index: number, option: string, value: string) => {
    const updated = [...questions];
    updated[index] = {
      ...updated[index],
      options_marathi: { ...updated[index].options_marathi, [option]: value }
    };
    setQuestions(updated);
  };

  const handleUpdate = async () => {
    if (!formData.title || !formData.subjectId || questions.length === 0) {
      Alert.alert('Error', 'Please fill in all required fields and add at least one question');
      return;
    }

    setSaving(true);
    try {
      // Update quiz
      await executeQuery(
        `UPDATE quizzes SET 
          title_english = ?,
          title_marathi = ?,
          description_english = ?,
          description_marathi = ?,
          subject_id = ?,
          type = ?,
          time_limit = ?,
          passing_percentage = ?
        WHERE id = ?`,
        [
          formData.title,
          formData.titleMarathi || formData.title,
          formData.description || '',
          formData.descriptionMarathi || '',
          parseInt(formData.subjectId),
          formData.type,
          parseInt(formData.timeLimit) || 5,
          parseInt(formData.passingPercentage) || 40,
          quizId
        ]
      );

      // Delete existing questions
      await executeQuery(`DELETE FROM questions WHERE quiz_id = ?`, [quizId]);

      // Insert updated questions
      for (const q of questions) {
        await executeQuery(
          `INSERT INTO questions (
            quiz_id,
            question_text_english,
            question_text_marathi,
            option_a_english,
            option_a_marathi,
            option_b_english,
            option_b_marathi,
            option_c_english,
            option_c_marathi,
            option_d_english,
            option_d_marathi,
            correct_answer,
            explanation_english,
            explanation_marathi
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            quizId,
            q.question,
            q.question_marathi || q.question,
            q.options.a,
            q.options_marathi.a || q.options.a,
            q.options.b,
            q.options_marathi.b || q.options.b,
            q.options.c || '',
            q.options_marathi.c || '',
            q.options.d || '',
            q.options_marathi.d || '',
            q.correctAnswer || 'a',
            q.explanation || '',
            q.explanation_marathi || '',
          ]
        );
      }

      Alert.alert('Success', 'Quiz updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error updating quiz:', error);
      Alert.alert('Error', 'Failed to update quiz');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading quiz...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Quiz</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Quiz Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title (English) *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter quiz title"
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title (Marathi)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter quiz title in Marathi"
              value={formData.titleMarathi}
              onChangeText={(text) => setFormData({ ...formData, titleMarathi: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter quiz description"
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Subject *</Text>
            <View style={styles.subjectsContainer}>
              {subjects.map((subject) => (
                <TouchableOpacity
                  key={subject.id}
                  style={[
                    styles.subjectOption,
                    parseInt(formData.subjectId) === subject.id && styles.subjectOptionSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, subjectId: String(subject.id) })}
                >
                  <View style={styles.subjectContent}>
                    <Text style={styles.subjectName}>
                      {subject.className} - {subject.name}
                    </Text>
                  </View>
                  {parseInt(formData.subjectId) === subject.id && (
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>Time Limit (min)</Text>
              <TextInput
                style={styles.input}
                placeholder="5"
                value={formData.timeLimit}
                onChangeText={(text) => setFormData({ ...formData, timeLimit: text })}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>Passing %</Text>
              <TextInput
                style={styles.input}
                placeholder="40"
                value={formData.passingPercentage}
                onChangeText={(text) => setFormData({ ...formData, passingPercentage: text })}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Questions Section */}
          <View style={styles.questionsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Questions ({questions.length})</Text>
              <TouchableOpacity style={styles.addButton} onPress={addQuestion}>
                <Ionicons name="add" size={20} color={COLORS.white} />
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>

            {questions.map((q, index) => (
              <View key={index} style={styles.questionCard}>
                <View style={styles.questionHeader}>
                  <Text style={styles.questionNumber}>Q{index + 1}</Text>
                  <TouchableOpacity onPress={() => removeQuestion(index)}>
                    <Ionicons name="close" size={20} color="#DC2626" />
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Question (English)"
                  value={q.question}
                  onChangeText={(text) => updateQuestion(index, 'question', text)}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Question (Marathi)"
                  value={q.question_marathi}
                  onChangeText={(text) => updateQuestion(index, 'question_marathi', text)}
                />

                <View style={styles.optionsGrid}>
                  {['a', 'b', 'c', 'd'].map((opt) => (
                    <View key={opt} style={styles.optionRow}>
                      <View style={styles.optionInputs}>
                        <TextInput
                          style={[styles.input, styles.optionInput]}
                          placeholder={`Option ${opt.toUpperCase()}`}
                          value={q.options[opt as keyof typeof q.options]}
                          onChangeText={(text) => updateOption(index, opt, text)}
                        />
                        <TextInput
                          style={[styles.input, styles.optionInputMarathi]}
                          placeholder={`Option ${opt.toUpperCase()} (Marathi)`}
                          value={q.options_marathi[opt as keyof typeof q.options_marathi]}
                          onChangeText={(text) => updateOptionMarathi(index, opt, text)}
                        />
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.correctButton,
                          q.correctAnswer === opt && styles.correctButtonActive,
                        ]}
                        onPress={() => updateQuestion(index, 'correctAnswer', opt)}
                      >
                        <Text style={styles.correctButtonText}>
                          {q.correctAnswer === opt ? '✓' : '○'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

                <TextInput
                  style={[styles.input, styles.textAreaSmall]}
                  placeholder="Explanation (English)"
                  value={q.explanation}
                  onChangeText={(text) => updateQuestion(index, 'explanation', text)}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />

                <TextInput
                  style={[styles.input, styles.textAreaSmall]}
                  placeholder="Explanation (Marathi)"
                  value={q.explanation_marathi}
                  onChangeText={(text) => updateQuestion(index, 'explanation_marathi', text)}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, saving && styles.submitButtonDisabled]}
            onPress={handleUpdate}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="save" size={20} color={COLORS.white} />
                <Text style={styles.submitButtonText}>Update Quiz</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginLeft: 12,
  },
  headerRight: {
    width: 40,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
  },
  textArea: {
    minHeight: 60,
    paddingTop: 12,
  },
  textAreaSmall: {
    minHeight: 40,
    paddingTop: 12,
    marginTop: 8,
  },
  subjectsContainer: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  subjectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: COLORS.white,
  },
  subjectOptionSelected: {
    backgroundColor: '#EEF2FF',
  },
  subjectContent: {
    flex: 1,
  },
  subjectName: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  halfField: {
    flex: 1,
  },
  questionsSection: {
    marginTop: 8,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  questionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4F46E5',
  },
  optionsGrid: {
    gap: 6,
    marginVertical: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionInputs: {
    flex: 1,
  },
  optionInput: {
    marginBottom: 4,
  },
  optionInputMarathi: {
    marginBottom: 4,
  },
  correctButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  correctButtonActive: {
    backgroundColor: '#16A34A',
  },
  correctButtonText: {
    fontSize: 16,
    color: '#64748B',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 16,
  },
  cancelButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default EditQuizScreen;