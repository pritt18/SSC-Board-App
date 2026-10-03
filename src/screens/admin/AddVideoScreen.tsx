// src/screens/admin/AddVideoScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS } from '../../constants/colors';
import { executeQuery } from '../../database/database';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { Ionicons } from '@expo/vector-icons';
import { saveFile } from '../../utils/fileStorage';
import { showAlert } from '../../utils/confirmAction';

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

interface SelectedFile {
  name: string;
  uri: string;
  size?: number;
}

const AddVideoScreen: React.FC<Props> = ({ navigation }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  const [formData, setFormData] = useState({
    title: '',
    titleMarathi: '',
    description: '',
    descriptionMarathi: '',
    subjectId: '',
    chapterId: '',
    sortOrder: '1',
  });

  const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500 MB

  // ------------------------------------------------------------
  // Load all active subjects
  // ------------------------------------------------------------
  useEffect(() => {
    loadSubjects();
  }, []);

  // ------------------------------------------------------------
  // Load chapters whenever subject changes
  // ------------------------------------------------------------
  useEffect(() => {
    if (formData.subjectId) {
      loadChapters(parseInt(formData.subjectId, 10));
    } else {
      setChapters([]);
    }
  }, [formData.subjectId]);

  // ------------------------------------------------------------
  // LOAD ALL SUBJECTS
  // Class 1 -> Class 10
  // Every active subject will be shown
  // ------------------------------------------------------------
  const loadSubjects = async () => {
    try {
      setLoadingSubjects(true);

      const results = await executeQuery(
        `
        SELECT
          s.id,
          s.name_english AS name,
          s.name_marathi,
          c.class_number AS classNumber,
          c.name_english AS className
        FROM subjects s
        INNER JOIN classes c
          ON s.class_id = c.id
        WHERE
          s.is_active = 1
          AND c.is_active = 1
        ORDER BY
          c.class_number ASC,
          s.name_english ASC
        `,
        []
      );

      console.log('Total active subjects loaded:', results.length);
      console.log('Subjects:', results);

      setSubjects(results as Subject[]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error loading subjects:', {
        error: errorMessage,
        platform: typeof window !== 'undefined' ? 'web' : 'native'
      });

      showAlert(
        'Error',
        `Failed to load subjects: ${errorMessage}`
      );
    } finally {
      setLoadingSubjects(false);
    }
  };

  // ------------------------------------------------------------
  // LOAD CHAPTERS FOR SELECTED SUBJECT
  // ------------------------------------------------------------
  const loadChapters = async (subjectId: number) => {
    try {
      const results = await executeQuery(
        `
        SELECT
          id,
          name_english AS name
        FROM chapters
        WHERE
          subject_id = ?
          AND is_active = 1
        ORDER BY chapter_number ASC
        `,
        [subjectId]
      );

      setChapters(results as Chapter[]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error loading chapters:', {
        error: errorMessage,
        subjectId,
        platform: typeof window !== 'undefined' ? 'web' : 'native'
      });
      setChapters([]);
    }
  };

  // ------------------------------------------------------------
  // SELECT VIDEO FILE
  // ------------------------------------------------------------
  const pickVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'video/mp4',
          'video/mpeg',
          'video/quicktime',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      if (!result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];

      if (file.size && file.size > MAX_VIDEO_SIZE) {
        showAlert(
          'Error',
          'Video file is too large. Maximum size is 500MB.'
        );
        return;
      }

      setSelectedFile({
        name: file.name,
        uri: file.uri,
        size: file.size,
      });
    } catch (error) {
      console.error('Error picking video:', error);

      showAlert(
        'Error',
        'Failed to select video file.'
      );
    }
  };

  // ------------------------------------------------------------
  // SAVE VIDEO LOCALLY
  // Works with native + web IndexedDB implementation
  // ------------------------------------------------------------
  const copyVideoToAssets = async (
    sourceUri: string,
    fileName: string
  ) => {
    return saveFile(
      sourceUri,
      fileName,
      'videos'
    );
  };

  // ------------------------------------------------------------
  // ADD VIDEO
  // ------------------------------------------------------------
  const handleAddVideo = async () => {
    if (!formData.title.trim()) {
      showAlert(
        'Required',
        'Please enter video title.'
      );
      return;
    }

    if (!formData.subjectId) {
      showAlert(
        'Required',
        'Please select a subject.'
      );
      return;
    }

    if (!selectedFile) {
      showAlert(
        'Required',
        'Please select a video file.'
      );
      return;
    }

    const subjectId = parseInt(
      formData.subjectId,
      10
    );

    if (Number.isNaN(subjectId)) {
      showAlert(
        'Error',
        'Invalid subject selected.'
      );
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Step 1: Save video locally
      setUploadProgress(20);

      const storedRef = await copyVideoToAssets(
        selectedFile.uri,
        selectedFile.name
      );

      setUploadProgress(60);

      // Step 2: Insert video record
      await executeQuery(
        `
        INSERT INTO videos (
          subject_id,
          chapter_id,
          title_english,
          title_marathi,
          description_english,
          description_marathi,
          video_url,
          sort_order,
          is_active
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        `,
        [
          subjectId,

          formData.chapterId
            ? parseInt(formData.chapterId, 10)
            : null,

          formData.title.trim(),

          formData.titleMarathi.trim() ||
            formData.title.trim(),

          formData.description.trim(),

          formData.descriptionMarathi.trim(),

          storedRef,

          parseInt(formData.sortOrder, 10) || 1,
        ]
      );

      setUploadProgress(100);

      showAlert(
        'Success',
        'Video added successfully!'
      );

      navigation.goBack();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(
        'Error adding video:',
        {
          error: errorMessage,
          subjectId,
          platform: typeof window !== 'undefined' ? 'web' : 'native'
        }
      );

      showAlert(
        'Error',
        `Failed to add video: ${errorMessage}`
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // ------------------------------------------------------------
  // FORMAT FILE SIZE
  // ------------------------------------------------------------
  const formatFileSize = (
    bytes?: number
  ) => {
    if (!bytes) {
      return '';
    }

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(
        bytes / 1024
      ).toFixed(1)} KB`;
    }

    if (bytes < 1024 * 1024 * 1024) {
      return `${(
        bytes /
        (1024 * 1024)
      ).toFixed(1)} MB`;
    }

    return `${(
      bytes /
      (1024 * 1024 * 1024)
    ).toFixed(1)} GB`;
  };

  // ------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------
  return (
    <SafeAreaView
      style={styles.container}
      edges={['top']}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={COLORS.textPrimary}
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Upload Video
        </Text>

        <View style={styles.headerRight} />
      </View>

      {/* MAIN PAGE SCROLL */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.scrollContent
        }
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>
            Video Details
          </Text>

          {/* TITLE ENGLISH */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Title (English) *
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter video title"
              placeholderTextColor="#94A3B8"
              value={formData.title}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  title: text,
                })
              }
            />
          </View>

          {/* TITLE MARATHI */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Title (Marathi)
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter video title in Marathi"
              placeholderTextColor="#94A3B8"
              value={formData.titleMarathi}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  titleMarathi: text,
                })
              }
            />
          </View>

          {/* DESCRIPTION ENGLISH */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Description (English)
            </Text>

            <TextInput
              style={[
                styles.input,
                styles.textArea,
              ]}
              placeholder="Enter video description"
              placeholderTextColor="#94A3B8"
              value={formData.description}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  description: text,
                })
              }
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* DESCRIPTION MARATHI */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Description (Marathi)
            </Text>

            <TextInput
              style={[
                styles.input,
                styles.textArea,
              ]}
              placeholder="Enter video description in Marathi"
              placeholderTextColor="#94A3B8"
              value={
                formData.descriptionMarathi
              }
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  descriptionMarathi: text,
                })
              }
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* ==================================================
              SUBJECT SELECTION
              ================================================== */}
          <View style={styles.inputGroup}>
            <View style={styles.subjectHeader}>
              <Text style={styles.label}>
                Subject *
              </Text>

              {!loadingSubjects && (
                <Text style={styles.subjectCount}>
                  {subjects.length} subjects
                </Text>
              )}
            </View>

            {/* 
              IMPORTANT:
              This is an INNER ScrollView.
              It allows ALL subjects from Class 1-10
              to be displayed without making the whole
              page extremely long.
            */}
            <View style={styles.subjectsContainer}>
              {loadingSubjects ? (
                <View
                  style={styles.loadingSubjects}
                >
                  <ActivityIndicator
                    size="small"
                    color={COLORS.primary}
                  />

                  <Text
                    style={
                      styles.loadingSubjectsText
                    }
                  >
                    Loading all subjects...
                  </Text>
                </View>
              ) : subjects.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="book-outline"
                    size={30}
                    color="#94A3B8"
                  />

                  <Text
                    style={styles.emptyStateText}
                  >
                    No active subjects available
                  </Text>
                </View>
              ) : (
                <ScrollView
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                  style={styles.subjectScroll}
                  contentContainerStyle={
                    styles.subjectScrollContent
                  }
                >
                  {subjects.map(
                    (subject, index) => {
                      const isSelected =
                        parseInt(
                          formData.subjectId,
                          10
                        ) === subject.id;

                      const isLast =
                        index ===
                        subjects.length - 1;

                      return (
                        <TouchableOpacity
                          key={subject.id}
                          activeOpacity={0.7}
                          style={[
                            styles.subjectOption,
                            isSelected &&
                              styles.subjectOptionSelected,
                            isLast &&
                              styles.subjectOptionLast,
                          ]}
                          onPress={() => {
                            setFormData({
                              ...formData,
                              subjectId:
                                String(
                                  subject.id
                                ),
                              chapterId: '',
                            });
                          }}
                        >
                          {/* CLASS NUMBER */}
                          <View
                            style={[
                              styles.classBadge,
                              isSelected &&
                                styles.classBadgeSelected,
                            ]}
                          >
                            <Text
                              style={[
                                styles.classBadgeText,
                                isSelected &&
                                  styles.classBadgeTextSelected,
                              ]}
                            >
                              {subject.classNumber}
                            </Text>
                          </View>

                          {/* SUBJECT INFO */}
                          <View
                            style={
                              styles.subjectContent
                            }
                          >
                            <Text
                              style={
                                styles.subjectName
                              }
                            >
                              Class{' '}
                              {
                                subject.classNumber
                              }{' '}
                              - {subject.name}
                            </Text>

                            {subject.name_marathi ? (
                              <Text
                                style={
                                  styles.subjectNameMarathi
                                }
                              >
                                {
                                  subject.name_marathi
                                }
                              </Text>
                            ) : null}
                          </View>

                          {/* CHECK */}
                          {isSelected && (
                            <Ionicons
                              name="checkmark-circle"
                              size={22}
                              color={
                                COLORS.primary
                              }
                            />
                          )}
                        </TouchableOpacity>
                      );
                    }
                  )}
                </ScrollView>
              )}
            </View>
          </View>

          {/* ==================================================
              CHAPTER SELECTION
              ================================================== */}
          {formData.subjectId &&
            chapters.length > 0 && (
              <View
                style={styles.inputGroup}
              >
                <Text style={styles.label}>
                  Chapter (Optional)
                </Text>

                <View
                  style={
                    styles.chaptersContainer
                  }
                >
                  {/* NO CHAPTER */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[
                      styles.chapterOption,
                      !formData.chapterId &&
                        styles.chapterOptionSelected,
                    ]}
                    onPress={() =>
                      setFormData({
                        ...formData,
                        chapterId: '',
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.chapterName,
                        !formData.chapterId &&
                          styles.chapterNameSelected,
                      ]}
                    >
                      No Chapter
                    </Text>
                  </TouchableOpacity>

                  {/* CHAPTERS */}
                  {chapters.map(
                    (chapter) => {
                      const isSelected =
                        formData.chapterId ===
                        String(chapter.id);

                      return (
                        <TouchableOpacity
                          key={chapter.id}
                          activeOpacity={0.7}
                          style={[
                            styles.chapterOption,
                            isSelected &&
                              styles.chapterOptionSelected,
                          ]}
                          onPress={() =>
                            setFormData({
                              ...formData,
                              chapterId:
                                String(
                                  chapter.id
                                ),
                            })
                          }
                        >
                          <Text
                            style={[
                              styles.chapterName,
                              isSelected &&
                                styles.chapterNameSelected,
                            ]}
                          >
                            {chapter.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    }
                  )}
                </View>
              </View>
            )}

          {/* ==================================================
              VIDEO FILE
              ================================================== */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Video File *
            </Text>

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.filePicker}
              onPress={pickVideo}
            >
              <View
                style={
                  styles.filePickerContent
                }
              >
                <Ionicons
                  name="videocam"
                  size={28}
                  color="#64748B"
                />

                <View
                  style={
                    styles.filePickerInfo
                  }
                >
                  <Text
                    style={
                      styles.filePickerText
                    }
                    numberOfLines={2}
                  >
                    {selectedFile
                      ? selectedFile.name
                      : 'Tap to select video file'}
                  </Text>

                  {selectedFile?.size ? (
                    <Text
                      style={
                        styles.filePickerSize
                      }
                    >
                      {formatFileSize(
                        selectedFile.size
                      )}
                    </Text>
                  ) : null}
                </View>

                {selectedFile ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color="#16A34A"
                  />
                ) : (
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color="#94A3B8"
                  />
                )}
              </View>
            </TouchableOpacity>

            <Text style={styles.fileHint}>
              Supported formats: MP4, MPEG,
              QuickTime • Max size: 500MB
            </Text>
          </View>

          {/* ==================================================
              SORT ORDER
              ================================================== */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Sort Order
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter sort order (1, 2, 3...)"
              placeholderTextColor="#94A3B8"
              value={formData.sortOrder}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  sortOrder: text,
                })
              }
              keyboardType="numeric"
            />
          </View>

          {/* ==================================================
              UPLOAD PROGRESS
              ================================================== */}
          {isUploading && (
            <View
              style={
                styles.progressContainer
              }
            >
              <View
                style={styles.progressBar}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${uploadProgress}%`,
                    },
                  ]}
                />
              </View>

              <Text
                style={styles.progressText}
              >
                Uploading...{' '}
                {uploadProgress}%
              </Text>
            </View>
          )}

          {/* ==================================================
              SUBMIT
              ================================================== */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.submitButton,
              isUploading &&
                styles.submitButtonDisabled,
            ]}
            onPress={handleAddVideo}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <ActivityIndicator
                  size="small"
                  color={COLORS.white}
                />

                <Text
                  style={
                    styles.submitButtonText
                  }
                >
                  Uploading...
                </Text>
              </>
            ) : (
              <>
                <Ionicons
                  name="cloud-upload"
                  size={20}
                  color={COLORS.white}
                />

                <Text
                  style={
                    styles.submitButtonText
                  }
                >
                  Upload Video
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* ==================================================
              INFO
              ================================================== */}
          <View style={styles.infoBox}>
            <Ionicons
              name="information-circle"
              size={22}
              color={COLORS.primary}
            />

            <View
              style={styles.infoContent}
            >
              <Text
                style={styles.infoTitle}
              >
                Video Upload Tips
              </Text>

              <Text
                style={styles.infoText}
              >
                • Videos are stored locally
                for offline access
              </Text>

              <Text
                style={styles.infoText}
              >
                • Use MP4 format for best
                compatibility
              </Text>

              <Text
                style={styles.infoText}
              >
                • Keep videos under 500MB
                for faster upload
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // ----------------------------------------------------------
  // Header
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // Page
  // ----------------------------------------------------------

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
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

  // ----------------------------------------------------------
  // Subject Header
  // ----------------------------------------------------------

  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  subjectCount: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },

  // ----------------------------------------------------------
  // SUBJECT LIST
  // ----------------------------------------------------------

  subjectsContainer: {
    height: 320,

    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',

    backgroundColor: COLORS.white,

    overflow: 'hidden',
  },

  subjectScroll: {
    flex: 1,
  },

  subjectScrollContent: {
    paddingVertical: 0,
  },

  loadingSubjects: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  loadingSubjectsText: {
    color: '#64748B',
    fontSize: 14,
    marginTop: 8,
  },

  emptyState: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyStateText: {
    color: '#64748B',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },

  // ----------------------------------------------------------
  // Subject option
  // ----------------------------------------------------------

  subjectOption: {
    minHeight: 62,

    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 14,
    paddingVertical: 10,

    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',

    backgroundColor: COLORS.white,
  },

  subjectOptionSelected: {
    backgroundColor: '#EEF2FF',
  },

  subjectOptionLast: {
    borderBottomWidth: 0,
  },

  classBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: '#F1F5F9',

    marginRight: 12,
  },

  classBadgeSelected: {
    backgroundColor: COLORS.primary,
  },

  classBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },

  classBadgeTextSelected: {
    color: COLORS.white,
  },

  subjectContent: {
    flex: 1,
  },

  subjectName: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },

  subjectNameMarathi: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },

  // ----------------------------------------------------------
  // Chapters
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // File Picker
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // Progress
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // Submit
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // Info
  // ----------------------------------------------------------

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