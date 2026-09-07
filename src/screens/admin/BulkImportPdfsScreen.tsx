import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { executeQuery } from '../../database/database';
import { COLORS } from '../../constants/colors';
import { saveFile, getFreeSpaceBytes } from '../../utils/fileStorage';
import { showAlert } from '../../utils/confirmAction';

interface ClassRow {
  id: number;
  class_number: number;
}

interface PickedFile {
  name: string;
  uri: string;
  size?: number;
  subjectName: string; // editable, auto-guessed from filename — groups the PDF under a subject
  pdfTitle: string; // editable, auto-guessed from filename — what students actually see as the title
}

const guessSubjectName = (fileName: string): string => {
  const withoutExt = fileName.replace(/\.pdf$/i, '');
  return withoutExt
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(' ')
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
};

const formatBytes = (bytes: number): string => {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
};

const BulkImportPdfsScreen: React.FC<any> = ({ navigation }) => {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [medium, setMedium] = useState<'english' | 'marathi'>('english');
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [importing, setImporting] = useState(false);
  const [progressText, setProgressText] = useState('');

  const loadClasses = async () => {
    try {
      const rows = await executeQuery(
        `SELECT id, class_number FROM classes WHERE is_active = 1 ORDER BY class_number ASC`,
        []
      );
      setClasses(rows as ClassRow[]);
      if (rows.length > 0 && selectedClassId === null) {
        setSelectedClassId((rows[0] as ClassRow).id);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadClasses();
    }, [])
  );

  const handlePickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const picked: PickedFile[] = result.assets.map((asset) => ({
        name: asset.name,
        uri: asset.uri,
        size: asset.size,
        subjectName: guessSubjectName(asset.name),
        pdfTitle: guessSubjectName(asset.name),
      }));

      setFiles((prev) => [...prev, ...picked]);
    } catch (error) {
      console.error('Error picking PDFs:', error);
      showAlert('Error', 'Failed to select PDF files.');
    }
  };

  const updateSubjectName = (index: number, name: string) => {
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, subjectName: name } : f))
    );
  };

  const updatePdfTitle = (index: number, title: string) => {
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, pdfTitle: title } : f))
    );
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => setFiles([]);

  const findOrCreateSubject = async (
    classId: number,
    name: string
  ): Promise<number> => {
    const existing = await executeQuery(
      `SELECT id FROM subjects WHERE class_id = ? AND LOWER(name_english) = LOWER(?)`,
      [classId, name]
    );
    if (existing.length > 0) {
      return existing[0].id;
    }
    await executeQuery(
      `INSERT INTO subjects (class_id, name_english, name_marathi, icon, is_active)
       VALUES (?, ?, ?, '📚', 1)`,
      [classId, name, name]
    );
    const created = await executeQuery(
      `SELECT id FROM subjects WHERE class_id = ? AND LOWER(name_english) = LOWER(?)`,
      [classId, name]
    );
    return created[0].id;
  };

  const checkStorageBeforeImport = async (): Promise<boolean> => {
    try {
      const freeBytes = await getFreeSpaceBytes();
      // getFreeSpaceBytes() returns null on web — there's no such
      // concept in a browser sandbox, so just skip the check there.
      if (freeBytes === null) return true;

      const totalIncomingBytes = files.reduce((sum, f) => sum + (f.size || 0), 0);
      const safetyBuffer = 200 * 1024 * 1024;

      if (totalIncomingBytes > 0 && freeBytes - totalIncomingBytes < safetyBuffer) {
        return await new Promise((resolve) => {
          Alert.alert(
            'Low Storage Warning',
            `This device has ${formatBytes(freeBytes)} free. These ${files.length} file(s) need about ${formatBytes(totalIncomingBytes)}. Importing may fill up the device's storage.\n\nContinue anyway?`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Import Anyway', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });
      }
      return true;
    } catch (error) {
      console.error('Error checking free storage:', error);
      return true;
    }
  };

  const handleImportAll = async () => {
    if (!selectedClassId) {
      showAlert('Error', 'Please select a class first.');
      return;
    }
    if (files.length === 0) {
      showAlert('Error', 'Please select at least one PDF file.');
      return;
    }
    const emptyName = files.some((f) => !f.subjectName.trim() || !f.pdfTitle.trim());
    if (emptyName) {
      showAlert('Error', 'Every file needs both a subject name and a PDF title. Please fill in the blanks.');
      return;
    }

    const canProceed = await checkStorageBeforeImport();
    if (!canProceed) return;

    setImporting(true);
    let successCount = 0;
    let failCount = 0;
    const failedNames: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgressText(`Importing ${i + 1} of ${files.length}: ${file.name}`);
        try {
          // Cross-platform: copies into app storage on native, saves
          // into IndexedDB on web. See src/utils/fileStorage.ts.
          const storedRef = await saveFile(file.uri, file.name, 'pdfs');

          const subjectId = await findOrCreateSubject(
            selectedClassId,
            file.subjectName.trim()
          );

          await executeQuery(
            `INSERT INTO pdfs (subject_id, title_english, title_marathi, pdf_url, medium, is_active)
             VALUES (?, ?, ?, ?, ?, 1)`,
            [
              subjectId,
              file.pdfTitle.trim(),
              file.pdfTitle.trim(),
              storedRef,
              medium,
            ]
          );

          successCount++;
        } catch (fileError) {
          console.error(`Error importing ${file.name}:`, fileError);
          failCount++;
          failedNames.push(file.name);
        }
      }

      showAlert(
        'Import Complete',
        `${successCount} PDF(s) imported successfully.${
          failCount > 0 ? `\n${failCount} file(s) failed: ${failedNames.join(', ')}` : ''
        }`
      );
      if (successCount > 0) {
        navigation.goBack();
      }
    } finally {
      setImporting(false);
      setProgressText('');
    }
  };

  const totalSelectedSize = files.reduce((sum, f) => sum + (f.size || 0), 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Bulk Import PDFs</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>1. Select Class</Text>
        <View style={styles.chipRow}>
          {classes.map((cls) => (
            <Pressable
              key={cls.id}
              onPress={() => setSelectedClassId(cls.id)}
              style={[styles.chip, selectedClassId === cls.id && styles.chipSelected]}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedClassId === cls.id && styles.chipTextSelected,
                ]}
              >
                Class {cls.class_number}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>2. Select Medium</Text>
        <View style={styles.chipRow}>
          {(['english', 'marathi'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMedium(m)}
              style={[styles.chip, medium === m && styles.chipSelected]}
            >
              <Text style={[styles.chipText, medium === m && styles.chipTextSelected]}>
                {m === 'english' ? 'English Medium' : 'Marathi Medium'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>
          3. Pick PDF Files ({files.length} selected
          {totalSelectedSize > 0 ? `, ${formatBytes(totalSelectedSize)}` : ''})
        </Text>
        <View style={styles.pickRow}>
          <TouchableOpacity style={styles.pickButton} onPress={handlePickFiles}>
            <Text style={styles.pickButtonText}>+ Select PDFs</Text>
          </TouchableOpacity>
          {files.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={clearAll}>
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.hintText}>
          Pick all PDFs from one "Class / Medium" folder at a time (e.g. all files
          inside "1st Std / English Medium"). For each file, confirm its title
          (what students see) and which subject it belongs to, then Import.
          Repeat for each folder.
        </Text>

        {files.map((file, index) => (
          <View key={`${file.uri}-${index}`} style={styles.fileRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fileName} numberOfLines={1}>
                {file.name} {file.size ? `(${formatBytes(file.size)})` : ''}
              </Text>

              <Text style={styles.fileLabel}>PDF title (what students see):</Text>
              <TextInput
                style={styles.subjectInput}
                value={file.pdfTitle}
                onChangeText={(text) => updatePdfTitle(index, text)}
                placeholder="PDF title"
              />

              <Text style={[styles.fileLabel, { marginTop: 10 }]}>Subject (groups it under):</Text>
              <TextInput
                style={styles.subjectInput}
                value={file.subjectName}
                onChangeText={(text) => updateSubjectName(index, text)}
                placeholder="Subject name"
              />
            </View>
            <TouchableOpacity onPress={() => removeFile(index)}>
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))}

        {importing ? (
          <View style={styles.importingBox}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.importingText}>{progressText}</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.importButton, files.length === 0 && styles.importButtonDisabled]}
            onPress={handleImportAll}
            disabled={files.length === 0}
          >
            <Text style={styles.importButtonText}>
              Import {files.length > 0 ? `${files.length} PDF(s)` : ''}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default BulkImportPdfsScreen;

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
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 10,
    marginTop: 16,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  chipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textPrimary, fontWeight: '600', fontSize: 13 },
  chipTextSelected: { color: COLORS.white },
  pickRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  pickButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 18,
  },
  pickButtonText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
  clearButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  clearButtonText: { color: COLORS.error, fontWeight: '700', fontSize: 12 },
  hintText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 8,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginTop: 12,
  },
  fileName: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 6 },
  fileLabel: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 4 },
  subjectInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  removeText: { color: COLORS.error, fontSize: 12, fontWeight: '600', marginLeft: 10, marginTop: 4 },
  importingBox: { alignItems: 'center', marginTop: 24 },
  importingText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 10, textAlign: 'center' },
  importButton: {
    backgroundColor: COLORS.success,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  importButtonDisabled: { backgroundColor: COLORS.border },
  importButtonText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
});
