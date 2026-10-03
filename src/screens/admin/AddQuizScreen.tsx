import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS } from '../../constants/colors';
import { executeQuery } from '../../database/database';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

type Props = NativeStackScreenProps<AdminStackParamList, 'AddQuiz'>;

interface Subject {
  id: number;
  name: string;
  classNumber: number;
}

interface Question {
  id: number;
  question: string;
  question_marathi: string;
  options: { a: string; b: string; c: string; d: string };
  options_marathi: { a: string; b: string; c: string; d: string };
  correctAnswer: string;
  explanation: string;
  explanation_marathi: string;
}

const AddQuizScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
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
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      const results = await executeQuery(
        `SELECT 
          s.id,
          s.name_english as name,
          c.class_number as classNumber
        FROM subjects s
        JOIN classes c ON s.class_id = c.id
        WHERE s.is_active = 1
        ORDER BY c.class_number, s.name_english`,
        []
      );
      setSubjects(results as Subject[]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error loading subjects:', {
        error: errorMessage,
        platform: typeof window !== 'undefined' ? 'web' : 'native'
      });
    }
  };

  const addQuestion = () => {
    setQuestions([...questions, {
      id: Date.now(),
      question: '',
      question_marathi: '',
      options: { a: '', b: '', c: '', d: '' },
      options_marathi: { a: '', b: '', c: '', d: '' },
      correctAnswer: 'a',
      explanation: '',
      explanation_marathi: '',
    }]);
  };

  const removeQuestion = (id: number) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const updateQuestion = (id: number, field: string, value: string) => {
    setQuestions(questions.map(q => {
      if (q.id === id) {
        return { ...q, [field]: value };
      }
      return q;
    }));
  };

  const updateOption = (id: number, option: string, value: string) => {
    setQuestions(questions.map(q => {
      if (q.id === id) {
        return {
          ...q,
          options: { ...q.options, [option]: value }
        };
      }
      return q;
    }));
  };

  const updateOptionMarathi = (id: number, option: string, value: string) => {
    setQuestions(questions.map(q => {
      if (q.id === id) {
        return {
          ...q,
          options_marathi: { ...q.options_marathi, [option]: value }
        };
      }
      return q;
    }));
  };

 // src/screens/admin/AddQuizScreen.tsx - Updated handleAddQuiz
const handleAddQuiz = async () => {
  if (!formData.title || !formData.subjectId || questions.length === 0) {
    Alert.alert('Error', 'Please fill in all required fields and add at least one question');
    return;
  }

  setLoading(true);

  try {
    // Insert quiz (without chapter_id)
    await executeQuery(
      `INSERT INTO quizzes (
        subject_id,
        title_english,
        title_marathi,
        description_english,
        description_marathi,
        type,
        total_questions,
        time_limit,
        passing_percentage,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        parseInt(formData.subjectId),
        formData.title,
        formData.titleMarathi || formData.title,
        formData.description || '',
        formData.descriptionMarathi || '',
        formData.type,
        questions.length,
        parseInt(formData.timeLimit) || 5,
        parseInt(formData.passingPercentage) || 40,
      ]
    );

    // Get quiz ID
    const quizResult = await executeQuery(
      `SELECT id FROM quizzes WHERE title_english = ? ORDER BY id DESC LIMIT 1`,
      [formData.title]
    );

    const quizId = quizResult[0]?.id;

    if (!quizId) {
      throw new Error('Failed to get quiz ID');
    }

    // Insert questions
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

    Alert.alert('Success', 'Quiz added successfully!');
    navigation.goBack();

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error adding quiz:', {
      error: errorMessage,
      platform: typeof window !== 'undefined' ? 'web' : 'native'
    });
    Alert.alert('Error', `Failed to add quiz: ${errorMessage}`);
  } finally {
    setLoading(false);
  }
};

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add Quiz</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.formCard}>
          <Input
            label="Title (English) *"
            placeholder="Enter quiz title"
            value={formData.title}
            onChangeText={(text) => setFormData({ ...formData, title: text })}
          />

          <Input
            label="Title (Marathi)"
            placeholder="Enter quiz title in Marathi"
            value={formData.titleMarathi}
            onChangeText={(text) => setFormData({ ...formData, titleMarathi: text })}
          />

          <Input
            label="Description"
            placeholder="Enter quiz description"
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            multiline
            numberOfLines={2}
          />

          {/* Subject Selection */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Subject *</Text>
            <ScrollView style={styles.pickerContainer} nestedScrollEnabled>
              {subjects.map((subject) => (
                <TouchableOpacity
                  key={subject.id}
                  style={[
                    styles.subjectOption,
                    parseInt(formData.subjectId) === subject.id && styles.subjectOptionSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, subjectId: String(subject.id) })}
                >
                  <Text style={styles.subjectOptionText}>
                    Class {subject.classNumber} - {subject.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Input
                label="Time Limit (min)"
                placeholder="5"
                value={formData.timeLimit}
                onChangeText={(text) => setFormData({ ...formData, timeLimit: text })}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.halfField}>
              <Input
                label="Passing %"
                placeholder="40"
                value={formData.passingPercentage}
                onChangeText={(text) => setFormData({ ...formData, passingPercentage: text })}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Questions Section */}
          <View style={styles.questionsSection}>
            <Text style={styles.sectionTitle}>Questions</Text>
            <TouchableOpacity style={styles.addQuestionButton} onPress={addQuestion}>
              <Text style={styles.addQuestionText}>+ Add Question</Text>
            </TouchableOpacity>

            {questions.map((q, index) => (
              <View key={q.id} style={styles.questionCard}>
                <View style={styles.questionHeader}>
                  <Text style={styles.questionNumber}>Q{index + 1}</Text>
                  <TouchableOpacity onPress={() => removeQuestion(q.id)}>
                    <Text style={styles.removeQuestion}>✕</Text>
                  </TouchableOpacity>
                </View>

                <Input
                  placeholder="Question (English)"
                  value={q.question}
                  onChangeText={(text) => updateQuestion(q.id, 'question', text)}
                />

                <Input
                  placeholder="Question (Marathi)"
                  value={q.question_marathi}
                  onChangeText={(text) => updateQuestion(q.id, 'question_marathi', text)}
                />

                <View style={styles.optionsGrid}>
                  {['a', 'b', 'c', 'd'].map((opt) => (
                    <View key={opt} style={styles.optionRow}>
                      <View style={styles.optionInputs}>
                        <Input
                          placeholder={`Option ${opt.toUpperCase()}`}
                          value={q.options[opt as keyof typeof q.options]}
                          onChangeText={(text) => updateOption(q.id, opt, text)}
                          style={styles.optionInput}
                        />
                        <Input
                          placeholder={`Option ${opt.toUpperCase()} (Marathi)`}
                          value={q.options_marathi[opt as keyof typeof q.options_marathi]}
                          onChangeText={(text) => updateOptionMarathi(q.id, opt, text)}
                          style={styles.optionInputMarathi}
                        />
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.correctButton,
                          q.correctAnswer === opt && styles.correctButtonActive,
                        ]}
                        onPress={() => updateQuestion(q.id, 'correctAnswer', opt)}
                      >
                        <Text style={styles.correctButtonText}>
                          {q.correctAnswer === opt ? '✓' : '○'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

                <Input
                  placeholder="Explanation (English)"
                  value={q.explanation}
                  onChangeText={(text) => updateQuestion(q.id, 'explanation', text)}
                  multiline
                  numberOfLines={2}
                />

                <Input
                  placeholder="Explanation (Marathi)"
                  value={q.explanation_marathi}
                  onChangeText={(text) => updateQuestion(q.id, 'explanation_marathi', text)}
                  multiline
                  numberOfLines={2}
                />
              </View>
            ))}
          </View>

          <Button
            title={loading ? 'Adding...' : 'Add Quiz'}
            onPress={handleAddQuiz}
            disabled={loading}
            loading={loading}
          />
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 32,
    color: COLORS.textPrimary,
    marginTop: -4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginLeft: 10,
  },
  content: {
    padding: 15,
    paddingBottom: 100,
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  pickerContainer: {
    maxHeight: 150,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
  },
  subjectOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  subjectOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  subjectOptionText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  halfField: {
    flex: 1,
  },
  questionsSection: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  addQuestionButton: {
    backgroundColor: COLORS.primaryLight,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  addQuestionText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  questionCard: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  removeQuestion: {
    fontSize: 18,
    color: '#DC2626',
    padding: 4,
  },
  optionsGrid: {
    gap: 8,
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
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  correctButtonActive: {
    backgroundColor: COLORS.success,
  },
  correctButtonText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
});

export default AddQuizScreen;