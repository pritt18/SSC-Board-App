// src/screens/admin/EditPdfScreen.tsx
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS } from '../../constants/colors';
import { executeQuery } from '../../database/database';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<AdminStackParamList, 'EditPdf'>;

interface Subject {
  id: number;
  name: string;
  name_marathi: string;
  className: string;
}

interface Chapter {
  id: number;
  name: string;
}

const EditPdfScreen: React.FC<Props> = ({ navigation, route }) => {
  const { pdfId } = route.params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    titleMarathi: '',
    description: '',
    descriptionMarathi: '',
    subjectId: '',
    chapterId: '',
    totalPages: '',
    sortOrder: '1',
  });

  useEffect(() => {
    loadData();
    loadSubjects();
  }, []);

  useEffect(() => {
    if (formData.subjectId) {
      loadChapters(parseInt(formData.subjectId));
    } else {
      setChapters([]);
    }
  }, [formData.subjectId]);

  const loadData = async () => {
    try {
      const result = await executeQuery(
        `SELECT 
          title_english,
          title_marathi,
          description_english,
          description_marathi,
          subject_id,
          chapter_id,
          total_pages,
          sort_order
        FROM pdfs 
        WHERE id = ?`,
        [pdfId]
      );
      
      if (result.length > 0) {
        const pdf = result[0];
        setFormData({
          title: pdf.title_english || '',
          titleMarathi: pdf.title_marathi || '',
          description: pdf.description_english || '',
          descriptionMarathi: pdf.description_marathi || '',
          subjectId: String(pdf.subject_id || ''),
          chapterId: String(pdf.chapter_id || ''),
          totalPages: String(pdf.total_pages || ''),
          sortOrder: String(pdf.sort_order || 1),
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load PDF');
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
          s.name_marathi,
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

  const loadChapters = async (subjectId: number) => {
    try {
      const results = await executeQuery(
        `SELECT id, name_english as name 
         FROM chapters 
         WHERE subject_id = ? AND is_active = 1
         ORDER BY chapter_number`,
        [subjectId]
      );
      setChapters(results as Chapter[]);
    } catch (error) {
      console.error('Error loading chapters:', error);
    }
  };

  const handleUpdate = async () => {
    if (!formData.title || !formData.subjectId) {
      Alert.alert('Error', 'Title and Subject are required');
      return;
    }

    setSaving(true);
    try {
      await executeQuery(
        `UPDATE pdfs SET 
          title_english = ?,
          title_marathi = ?,
          description_english = ?,
          description_marathi = ?,
          subject_id = ?,
          chapter_id = ?,
          total_pages = ?,
          sort_order = ?
        WHERE id = ?`,
        [
          formData.title,
          formData.titleMarathi || formData.title,
          formData.description || '',
          formData.descriptionMarathi || '',
          parseInt(formData.subjectId),
          formData.chapterId ? parseInt(formData.chapterId) : null,
          formData.totalPages ? parseInt(formData.totalPages) : 0,
          parseInt(formData.sortOrder) || 1,
          pdfId
        ]
      );
      
      Alert.alert('Success', 'PDF updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error updating PDF:', error);
      Alert.alert('Error', 'Failed to update PDF');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading PDF...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit PDF</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>PDF Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title (English) *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter PDF title"
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title (Marathi)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter PDF title in Marathi"
              value={formData.titleMarathi}
              onChangeText={(text) => setFormData({ ...formData, titleMarathi: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description (English)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter PDF description"
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description (Marathi)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter PDF description in Marathi"
              value={formData.descriptionMarathi}
              onChangeText={(text) => setFormData({ ...formData, descriptionMarathi: text })}
              multiline
              numberOfLines={3}
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
                  onPress={() => setFormData({ ...formData, subjectId: String(subject.id), chapterId: '' })}
                >
                  <View style={styles.subjectContent}>
                    <Text style={styles.subjectName}>
                      {subject.className} - {subject.name}
                    </Text>
                    {subject.name_marathi && (
                      <Text style={styles.subjectNameMarathi}>
                        {subject.name_marathi}
                      </Text>
                    )}
                  </View>
                  {parseInt(formData.subjectId) === subject.id && (
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {formData.subjectId && chapters.length > 0 && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Chapter (Optional)</Text>
              <View style={styles.chaptersContainer}>
                <TouchableOpacity
                  style={[
                    styles.chapterOption,
                    !formData.chapterId && styles.chapterOptionSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, chapterId: '' })}
                >
                  <Text style={[styles.chapterName, !formData.chapterId && styles.chapterNameSelected]}>
                    No Chapter
                  </Text>
                </TouchableOpacity>
                {chapters.map((chapter) => (
                  <TouchableOpacity
                    key={chapter.id}
                    style={[
                      styles.chapterOption,
                      formData.chapterId === String(chapter.id) && styles.chapterOptionSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, chapterId: String(chapter.id) })}
                  >
                    <Text style={[styles.chapterName, formData.chapterId === String(chapter.id) && styles.chapterNameSelected]}>
                      {chapter.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Total Pages</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter total pages"
              value={formData.totalPages}
              onChangeText={(text) => setFormData({ ...formData, totalPages: text })}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sort Order</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter sort order (1, 2, 3...)"
              value={formData.sortOrder}
              onChangeText={(text) => setFormData({ ...formData, sortOrder: text })}
              keyboardType="numeric"
            />
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
                <Text style={styles.submitButtonText}>Update PDF</Text>
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
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
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
    minHeight: 80,
    paddingTop: 12,
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
  subjectNameMarathi: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  chaptersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chapterOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  chapterOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#EEF2FF',
  },
  chapterName: {
    fontSize: 13,
    color: '#64748B',
  },
  chapterNameSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
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

export default EditPdfScreen;