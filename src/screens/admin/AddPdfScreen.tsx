import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS } from '../../constants/colors';
import { executeQuery } from '../../database/database';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { saveFile } from '../../utils/fileStorage';
import { showAlert } from '../../utils/confirmAction';

type Props = NativeStackScreenProps<AdminStackParamList, 'AddPdf'>;

interface Subject {
  id: number;
  name: string;
  name_marathi: string;
  classNumber: number;
}

const AddPdfScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedFile, setSelectedFile] = useState<{ name: string; uri: string } | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    titleMarathi: '',
    description: '',
    descriptionMarathi: '',
    subjectId: '',
    sortOrder: '1',
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
          s.name_marathi,
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
      Alert.alert('Error', `Failed to load subjects: ${errorMessage}`);
    }
  };

  const pickPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      setSelectedFile({
        name: file.name,
        uri: file.uri,
      });

    } catch (error) {
      console.error('Error picking PDF:', error);
      Alert.alert('Error', 'Failed to select PDF');
    }
  };

  // Now works on both native (copies into app storage) and web
  // (saves into IndexedDB) — see src/utils/fileStorage.ts.
  const copyPdfToAssets = async (sourceUri: string, fileName: string) => {
    return saveFile(sourceUri, fileName, 'pdfs');
  };

  const handleAddPdf = async () => {
    if (!formData.title || !formData.subjectId || !selectedFile) {
      showAlert('Error', 'Please fill in all required fields and select a PDF');
      return;
    }

    setLoading(true);

    try {
      const storedRef = await copyPdfToAssets(selectedFile.uri, selectedFile.name);

      await executeQuery(
        `INSERT INTO pdfs (
          subject_id,
          title_english,
          title_marathi,
          description_english,
          description_marathi,
          pdf_url,
          sort_order,
          is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          parseInt(formData.subjectId),
          formData.title,
          formData.titleMarathi || formData.title,
          formData.description || '',
          formData.descriptionMarathi || '',
          storedRef,
          parseInt(formData.sortOrder) || 1,
        ]
      );

      showAlert('Success', 'PDF added successfully!');
      navigation.goBack();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error adding PDF:', {
        error: errorMessage,
        platform: typeof window !== 'undefined' ? 'web' : 'native'
      });
      showAlert('Error', `Failed to add PDF: ${errorMessage}`);
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
        <Text style={styles.title}>Add PDF</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.formCard}>
          <Input
            label="Title (English) *"
            placeholder="Enter PDF title"
            value={formData.title}
            onChangeText={(text) => setFormData({ ...formData, title: text })}
          />

          <Input
            label="Title (Marathi)"
            placeholder="Enter PDF title in Marathi"
            value={formData.titleMarathi}
            onChangeText={(text) => setFormData({ ...formData, titleMarathi: text })}
          />

          <Input
            label="Description"
            placeholder="Enter PDF description"
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            multiline
            numberOfLines={3}
          />

          <Input
            label="Description (Marathi)"
            placeholder="Enter PDF description in Marathi"
            value={formData.descriptionMarathi}
            onChangeText={(text) => setFormData({ ...formData, descriptionMarathi: text })}
            multiline
            numberOfLines={3}
          />

          {/* Subject Selection */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Subject *</Text>
            <ScrollView style={styles.pickerContainer}>
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

          {/* PDF Selection */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>PDF File *</Text>
            <TouchableOpacity style={styles.filePicker} onPress={pickPdf}>
              <Text style={styles.filePickerIcon}>📄</Text>
              <Text style={styles.filePickerText}>
                {selectedFile ? selectedFile.name : 'Tap to select PDF'}
              </Text>
              {selectedFile && (
                <Text style={styles.filePickerCheck}>✓</Text>
              )}
            </TouchableOpacity>
          </View>

          <Input
            label="Sort Order"
            placeholder="1, 2, 3..."
            value={formData.sortOrder}
            onChangeText={(text) => setFormData({ ...formData, sortOrder: text })}
            keyboardType="numeric"
          />

          <Button
            title={loading ? 'Adding...' : 'Add PDF'}
            onPress={handleAddPdf}
            disabled={loading}
            loading={loading}
          />
        </View>
      </ScrollView>
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
  },
  subjectOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    marginBottom: 8,
  },
  subjectOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  subjectOptionText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  filePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 10,
    borderStyle: 'dashed',
    backgroundColor: COLORS.background,
  },
  filePickerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  filePickerText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  filePickerCheck: {
    fontSize: 20,
    color: COLORS.success,
  },
});

export default AddPdfScreen;
