// src/screens/admin/AddVideoScreen.tsx
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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { COLORS } from '../../constants/colors';
import { executeQuery } from '../../database/database';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<AdminStackParamList, 'AddVideo'>;

interface Subject {
  id: number;
  name: string;
  name_marathi: string;
  classNumber: number;
  className: string;
}

interface Chapter {
  id: number;
  name: string;
}

const AddVideoScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedFile, setSelectedFile] = useState<{ name: string; uri: string; size?: number } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    titleMarathi: '',
    description: '',
    descriptionMarathi: '',
    subjectId: '',
    chapterId: '',
    sortOrder: '1',
  });

  const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB

  useEffect(() => {
    loadSubjects();
  }, []);

  useEffect(() => {
    if (formData.subjectId) {
      loadChapters(parseInt(formData.subjectId));
    } else {
      setChapters([]);
    }
  }, [formData.subjectId]);

  const loadSubjects = async () => {
    try {
      const results = await executeQuery(
        `SELECT 
          s.id,
          s.name_english as name,
          s.name_marathi,
          c.class_number as classNumber,
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
      Alert.alert('Error', 'Failed to load subjects');
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

  const pickVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['video/mp4', 'video/mpeg', 'video/quicktime'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      
      if (file.size && file.size > MAX_VIDEO_SIZE) {
        Alert.alert('Error', 'Video file is too large. Maximum size is 500MB');
        return;
      }

      setSelectedFile({
        name: file.name,
        uri: file.uri,
        size: file.size,
      });
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to select video');
    }
  };

  const copyVideoToAssets = async (sourceUri: string, fileName: string) => {
    try {
      const documentDir = FileSystem.documentDirectory;
      if (!documentDir) {
        throw new Error('Document directory not available');
      }
      
      const videosDir = `${documentDir}videos/`;
      const destPath = `${videosDir}${fileName}`;
      
      // Create directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(videosDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(videosDir, { intermediates: true });
      }

      // Copy file
      await FileSystem.copyAsync({
        from: sourceUri,
        to: destPath,
      });

      return destPath;
    } catch (error) {
      console.error('Error copying video:', error);
      throw error;
    }
  };

  // src/screens/admin/AddVideoScreen.tsx - Updated handleAddVideo
const handleAddVideo = async () => {
  if (!formData.title || !formData.subjectId || !selectedFile) {
    Alert.alert('Error', 'Please fill in all required fields and select a video');
    return;
  }

  setIsUploading(true);
  setUploadProgress(0);

  try {
    // Step 1: Copy video to app storage
    setUploadProgress(20);
    await copyVideoToAssets(selectedFile.uri, selectedFile.name);
    setUploadProgress(50);

    // Step 2: Save to database (without chapter_id)
    await executeQuery(
      `INSERT INTO videos (
        subject_id,
        title_english,
        title_marathi,
        description_english,
        description_marathi,
        video_url,
        sort_order,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        parseInt(formData.subjectId),
        formData.title,
        formData.titleMarathi || formData.title,
        formData.description || '',
        formData.descriptionMarathi || '',
        selectedFile.name,
        parseInt(formData.sortOrder) || 1,
      ]
    );

    setUploadProgress(100);

    Alert.alert(
      'Success', 
      'Video added successfully!',
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        }
      ]
    );

  } catch (error) {
    console.error('Error adding video:', error);
    Alert.alert('Error', 'Failed to add video');
  } finally {
    setIsUploading(false);
    setUploadProgress(0);
  }
};

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Video</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Video Details</Text>

          {/* Title (English) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title (English) *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter video title"
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
            />
          </View>

          {/* Title (Marathi) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title (Marathi)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter video title in Marathi"
              value={formData.titleMarathi}
              onChangeText={(text) => setFormData({ ...formData, titleMarathi: text })}
            />
          </View>

          {/* Description (English) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description (English)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter video description"
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Description (Marathi) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description (Marathi)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter video description in Marathi"
              value={formData.descriptionMarathi}
              onChangeText={(text) => setFormData({ ...formData, descriptionMarathi: text })}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Subject Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Subject *</Text>
            <View style={styles.subjectsContainer}>
              {subjects.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No subjects available</Text>
                </View>
              ) : (
                subjects.map((subject) => (
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
                ))
              )}
            </View>
          </View>

          {/* Chapter Selection */}
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

          {/* Video File Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Video File *</Text>
            <TouchableOpacity style={styles.filePicker} onPress={pickVideo}>
              <View style={styles.filePickerContent}>
                <Ionicons name="videocam" size={28} color="#64748B" />
                <View style={styles.filePickerInfo}>
                  <Text style={styles.filePickerText}>
                    {selectedFile ? selectedFile.name : 'Tap to select video file'}
                  </Text>
                  {selectedFile && selectedFile.size && (
                    <Text style={styles.filePickerSize}>
                      {formatFileSize(selectedFile.size)}
                    </Text>
                  )}
                </View>
                {selectedFile ? (
                  <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
                )}
              </View>
            </TouchableOpacity>
            <Text style={styles.fileHint}>Supported formats: MP4, MPEG, QuickTime • Max size: 500MB</Text>
          </View>

          {/* Sort Order */}
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

          {/* Upload Progress */}
          {isUploading && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
              </View>
              <Text style={styles.progressText}>
                Uploading... {uploadProgress}%
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <TouchableOpacity
            style={[styles.submitButton, isUploading && styles.submitButtonDisabled]}
            onPress={handleAddVideo}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={20} color={COLORS.white} />
                <Text style={styles.submitButtonText}>Upload Video</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={22} color={COLORS.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Video Upload Tips</Text>
              <Text style={styles.infoText}>• Videos are stored locally for offline access</Text>
              <Text style={styles.infoText}>• Use MP4 format for best compatibility</Text>
              <Text style={styles.infoText}>• Keep videos under 500MB for faster upload</Text>
            </View>
          </View>
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
    maxHeight: 200,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#64748B',
    fontSize: 14,
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
  filePicker: {
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderStyle: 'dashed',
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  filePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  filePickerInfo: {
    flex: 1,
  },
  filePickerText: {
    fontSize: 14,
    color: '#0F172A',
  },
  filePickerSize: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  fileHint: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 6,
  },
  progressContainer: {
    marginVertical: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
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
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#475569',
    marginTop: 2,
    lineHeight: 20,
  },
});

export default AddVideoScreen;