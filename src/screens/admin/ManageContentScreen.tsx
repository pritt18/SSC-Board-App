// src/screens/admin/ManageContentScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import {
  saveContentFileLocally,
  createContentItem,
  updateContentItem,
  deleteContentItem,
  listContentItems,
  ContentType,
} from '../../services/contentService';
import { COLORS } from '../../constants/colors';

const ManageContentScreen = ({ navigation }: any) => {
  const [subjectId, setSubjectId] = useState('1');
  const [titleEnglish, setTitleEnglish] = useState('');
  const [titleMarathi, setTitleMarathi] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [contentType, setContentType] = useState<ContentType>('video');
  const [isLoading, setIsLoading] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [contentList, setContentList] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    fetchContents();
    resetForm();
  }, [contentType]);

  const fetchContents = async () => {
    try {
      const result = await listContentItems(contentType);
      setContentList(result || []);
    } catch (error) {
      console.log('Fetch error:', error);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setSubjectId('1');
    setTitleEnglish('');
    setTitleMarathi('');
    setFileUrl('');
  };

  // Pick a file directly from the device instead of typing a path
  const handlePickFile = async () => {
    setIsPicking(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: contentType === 'video' ? 'video/*' : 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const picked = result.assets[0];
      const localUri = await saveContentFileLocally(picked.uri, picked.name);
      setFileUrl(localUri);
      Alert.alert('File selected', `Copied into app storage:\n${picked.name}`);
    } catch (error) {
      console.error('File pick error:', error);
      Alert.alert('Error', 'Could not pick the file.');
    } finally {
      setIsPicking(false);
    }
  };

  const handleSaveContent = async () => {
    if (!titleEnglish.trim() || !fileUrl.trim()) {
      Alert.alert('Error', 'Kripya Title (English) aur file (path ya device se) bharein.');
      return;
    }

    setIsLoading(true);
    try {
      const data = {
        subjectId: parseInt(subjectId) || 0,
        titleEnglish,
        titleMarathi,
        fileUrl,
      };

      if (editingId) {
        await updateContentItem(contentType, editingId, data);
        Alert.alert('Updated ✅', `${contentType.toUpperCase()} safalpurvak update ho gaya hai!`);
      } else {
        await createContentItem(contentType, data);
        Alert.alert('Success 🎉', `${contentType.toUpperCase()} safalpurvak save ho gaya hai!`);
      }

      resetForm();
      fetchContents();
    } catch (error) {
      console.error('Save Content Error:', error);
      Alert.alert('Error', 'Database me save karte samay samasya aayi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditPress = (item: any) => {
    setEditingId(item.id);
    setSubjectId(String(item.subject_id));
    setTitleEnglish(item.title_english ?? '');
    setTitleMarathi(item.title_marathi ?? '');
    setFileUrl(contentType === 'video' ? item.video_url : item.pdf_url);
  };

  const handleDeletePress = (item: any) => {
    Alert.alert(
      'Delete Content',
      `Delete "${item.title_english}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteContentItem(contentType, item.id);
              if (editingId === item.id) resetForm();
              fetchContents();
            } catch (error) {
              console.error('Delete Content Error:', error);
              Alert.alert('Error', 'Could not delete this item.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Content 📚</Text>
      </View>

      <ScrollView contentContainerStyle={styles.formContainer}>
        <Text style={styles.label}>Content Type Chunein</Text>
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[styles.typeBtn, contentType === 'video' && styles.activeTypeBtn]}
            onPress={() => setContentType('video')}
            disabled={!!editingId}
          >
            <Text style={[styles.typeText, contentType === 'video' && styles.activeTypeText]}>🎬 Video</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, contentType === 'pdf' && styles.activeTypeBtn]}
            onPress={() => setContentType('pdf')}
            disabled={!!editingId}
          >
            <Text style={[styles.typeText, contentType === 'pdf' && styles.activeTypeText]}>📄 PDF</Text>
          </TouchableOpacity>
        </View>

        {!!editingId && (
          <View style={styles.editingBanner}>
            <Text style={styles.editingBannerText}>✏️ Editing item #{editingId}</Text>
            <TouchableOpacity onPress={resetForm}>
              <Text style={styles.editingCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.label}>Subject ID (Database me jo subject ki ID ho, jaise: 1, 2...)</Text>
        <TextInput
          style={styles.input}
          value={subjectId}
          onChangeText={setSubjectId}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Title (English)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Chapter 1 - Real Numbers"
          placeholderTextColor="#9CA3AF"
          value={titleEnglish}
          onChangeText={setTitleEnglish}
        />

        <Text style={styles.label}>Title (Marathi - Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="उदा. प्रकरण १ - वास्तव संख्या"
          placeholderTextColor="#9CA3AF"
          value={titleMarathi}
          onChangeText={setTitleMarathi}
        />

        <Text style={styles.label}>File (pick from device — recommended)</Text>
        <TouchableOpacity style={styles.pickButton} onPress={handlePickFile} disabled={isPicking}>
          {isPicking ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <Text style={styles.pickButtonText}>
              📁 {contentType === 'video' ? 'Choose Video from Device' : 'Choose PDF from Device'}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={[styles.label, { marginTop: 16 }]}>Or type a File URL / Path manually</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. /storage/emulated/0/Download/video.mp4"
          placeholderTextColor="#9CA3AF"
          value={fileUrl}
          onChangeText={setFileUrl}
        />
        {fileUrl !== '' && (
          <Text style={styles.selectedFileText} numberOfLines={1}>Selected: {fileUrl}</Text>
        )}

        <TouchableOpacity
          style={[styles.saveButton, !!editingId && styles.updateButton]}
          onPress={handleSaveContent}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>{editingId ? 'Update Content' : 'Save Content'}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.listHeaderRow}>
          <Text style={styles.listHeaderText}>
            Saved {contentType === 'video' ? 'Videos' : 'PDFs'}
          </Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{contentList.length}</Text>
          </View>
        </View>

        {contentList.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>{contentType === 'video' ? '🎬' : '📄'}</Text>
            <Text style={styles.emptyText}>No {contentType === 'video' ? 'videos' : 'PDFs'} saved yet.</Text>
          </View>
        ) : (
          contentList.map((item) => {
            const url = contentType === 'video' ? item.video_url : item.pdf_url;
            const isBeingEdited = editingId === item.id;
            return (
              <View key={item.id} style={[styles.listItem, isBeingEdited && styles.listItemActive]}>
                <View style={styles.listItemIcon}>
                  <Text style={styles.listItemIconText}>{contentType === 'video' ? '🎬' : '📄'}</Text>
                </View>

                <View style={styles.listItemBody}>
                  <Text style={styles.listTitle} numberOfLines={1}>{item.title_english}</Text>
                  <View style={styles.listBadgeRow}>
                    <Text style={styles.subjectBadge}>Subject {item.subject_id}</Text>
                  </View>
                  <Text style={styles.listUrl} numberOfLines={1}>{url}</Text>
                </View>

                <View style={styles.listItemActions}>
                  <TouchableOpacity
                    style={styles.actionIconBtn}
                    onPress={() => handleEditPress(item)}
                  >
                    <Text style={styles.actionIconText}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionIconBtn, styles.deleteIconBtn]}
                    onPress={() => handleDeletePress(item)}
                  >
                    <Text style={styles.actionIconText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backButton: { fontSize: 16, fontWeight: '600', color: COLORS.primary, marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  formContainer: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 15, color: COLORS.textPrimary },
  typeSelector: { flexDirection: 'row', gap: 10, marginBottom: 5 },
  typeBtn: { flex: 1, padding: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', borderRadius: 10, backgroundColor: COLORS.white },
  activeTypeBtn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeText: { fontSize: 15, color: COLORS.textPrimary, fontWeight: '600' },
  activeTypeText: { color: COLORS.white },
  editingBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFF7E6', borderWidth: 1, borderColor: '#F5C453', borderRadius: 10,
    padding: 12, marginTop: 14,
  },
  editingBannerText: { fontSize: 13, fontWeight: '700', color: '#8A6100' },
  editingCancelText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  pickButton: { backgroundColor: COLORS.primaryLight, borderWidth: 1, borderColor: COLORS.primary, borderRadius: 10, padding: 14, alignItems: 'center' },
  pickButtonText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  selectedFileText: { fontSize: 11, color: COLORS.textSecondary, marginTop: 6 },
  saveButton: { backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  updateButton: { backgroundColor: '#B8860B' },
  saveButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  listHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 30, marginBottom: 12 },
  listHeaderText: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  countBadge: { backgroundColor: COLORS.primaryLight, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 2 },
  countBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  emptyBox: { alignItems: 'center', paddingVertical: 30 },
  emptyIcon: { fontSize: 34, marginBottom: 8 },
  emptyText: { fontSize: 13, color: COLORS.textSecondary },
  listItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    padding: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10,
  },
  listItemActive: { borderColor: '#F5C453', borderWidth: 2, backgroundColor: '#FFFBF0' },
  listItemIcon: {
    width: 44, height: 44, borderRadius: 10, backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  listItemIconText: { fontSize: 20 },
  listItemBody: { flex: 1 },
  listTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  listBadgeRow: { flexDirection: 'row', marginTop: 4 },
  subjectBadge: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  listUrl: { fontSize: 11, color: COLORS.textSecondary, marginTop: 3 },
  listItemActions: { flexDirection: 'row', gap: 6, marginLeft: 8 },
  actionIconBtn: {
    width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
  },
  deleteIconBtn: { backgroundColor: '#FDECEC', borderColor: '#F5B5B5' },
  actionIconText: { fontSize: 15 },
});

export default ManageContentScreen;