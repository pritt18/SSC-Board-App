// src/screens/admin/ManagePdfsScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { executeQuery } from '../../database/database';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { Ionicons } from '@expo/vector-icons';
import { confirmAction, showAlert } from '../../utils/confirmAction';
import { deleteFile } from '../../utils/fileStorage';

type Props = NativeStackScreenProps<AdminStackParamList, 'ManagePdfs'>;

interface PdfItem {
  id: number;
  title: string;
  title_marathi: string;
  subject: string;
  subject_id: number;
  class_number: number;
  class_name: string;
  medium: string;
  isActive: boolean;
  created_at: string;
  pdf_url: string;
  description: string;
  chapter_name: string | null;
  total_pages: number;
}

const ManagePdfsScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pdfs, setPdfs] = useState<PdfItem[]>([]);
  const [filteredPdfs, setFilteredPdfs] = useState<PdfItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedMedium, setSelectedMedium] = useState<string>('all');
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);

  const loadPdfs = async () => {
    try {
      setLoading(true);

      let query = `
        SELECT 
          p.id,
          p.title_english as title,
          p.title_marathi,
          s.name_english as subject,
          p.subject_id,
          c.class_number,
          c.name_english as class_name,
          p.medium,
          p.is_active as isActive,
          p.created_at,
          p.pdf_url,
          p.description_english as description,
          ch.name_english as chapter_name,
          p.total_pages
        FROM pdfs p
        JOIN subjects s ON p.subject_id = s.id
        JOIN classes c ON s.class_id = c.id
        LEFT JOIN chapters ch ON p.chapter_id = ch.id
      `;
      
      const params: any[] = [];
      const conditions: string[] = [];

      if (selectedClass !== 'all') {
        conditions.push('c.id = ?');
        params.push(parseInt(selectedClass));
      }

      if (selectedMedium !== 'all') {
        conditions.push("(p.medium = ? OR p.medium = 'both' OR p.medium IS NULL)");
        params.push(selectedMedium);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ' ORDER BY p.id DESC';

      const items = await executeQuery(query, params);
      setPdfs(items as PdfItem[]);
      setFilteredPdfs(items as PdfItem[]);
    } catch (error) {
      console.error('Error loading PDFs:', error);
      showAlert('Error', 'Failed to load PDFs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadClasses = async () => {
    try {
      const classData = await executeQuery(
        'SELECT id, name_english as name FROM classes WHERE is_active = 1 ORDER BY class_number',
        []
      );
      setClasses(classData as { id: number; name: string }[]);
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadPdfs();
      loadClasses();
    }, [selectedClass, selectedMedium])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadPdfs();
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim() === '') {
      setFilteredPdfs(pdfs);
    } else {
      const filtered = pdfs.filter(
        (pdf) =>
          pdf.title.toLowerCase().includes(text.toLowerCase()) ||
          pdf.subject.toLowerCase().includes(text.toLowerCase()) ||
          (pdf.chapter_name && pdf.chapter_name.toLowerCase().includes(text.toLowerCase()))
      );
      setFilteredPdfs(filtered);
    }
  };

  // Fixed: Alert.alert() with multiple buttons + callbacks doesn't
  // work on web — this now uses confirmAction(), which falls back to
  // the browser's real confirm() dialog on web.
  const handleToggleActive = (id: number, currentStatus: boolean) => {
    confirmAction(
      `${currentStatus ? 'Deactivate' : 'Activate'} PDF`,
      `Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this PDF?`,
      async () => {
        try {
          await executeQuery(
            `UPDATE pdfs SET is_active = ? WHERE id = ?`,
            [currentStatus ? 0 : 1, id]
          );
          loadPdfs();
          showAlert('Success', `PDF ${currentStatus ? 'deactivated' : 'activated'}`);
        } catch (error) {
          showAlert('Error', 'Failed to update PDF status');
        }
      },
      'Confirm',
      currentStatus
    );
  };

  const handleDeletePdf = (id: number, title: string, pdfUrl: string) => {
    confirmAction(
      'Delete PDF',
      `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      async () => {
        try {
          await executeQuery(`DELETE FROM pdfs WHERE id = ?`, [id]);
          // Also clean up the actual stored file (native file or web
          // IndexedDB entry) — safe to call even if it's already gone.
          await deleteFile(pdfUrl);
          loadPdfs();
          showAlert('Success', 'PDF deleted successfully');
        } catch (error) {
          showAlert('Error', 'Failed to delete PDF');
        }
      },
      'Delete',
      true
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading PDFs...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage PDFs</Text>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => navigation.navigate('BulkImportPdfs')}
        >
          <Ionicons name="cloud-upload-outline" size={20} color={COLORS.white} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => navigation.navigate('AddPdf')}
        >
          <Ionicons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Search & Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search PDFs..."
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons name="filter" size={20} color={COLORS.primary} />
          {(selectedClass !== 'all' || selectedMedium !== 'all') && (
            <View style={styles.filterBadge} />
          )}
        </TouchableOpacity>
      </View>

      {/* PDF List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredPdfs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No PDFs Found</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Try a different search' : 'Upload your first PDF'}
            </Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => navigation.navigate('AddPdf')}
            >
              <Text style={styles.emptyButtonText}>Upload PDF</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredPdfs.map((pdf) => (
            <View key={pdf.id} style={styles.pdfCard}>
              <View style={styles.cardHeader}>
                <View style={[styles.statusBadge, pdf.isActive ? styles.activeBadge : styles.inactiveBadge]}>
                  <Text style={[styles.statusText, pdf.isActive ? styles.activeText : styles.inactiveText]}>
                    {pdf.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
                <View style={styles.headerRightBadges}>
                  <Text style={styles.classText}>
                    Class {pdf.class_number != null ? pdf.class_number : (pdf.class_name || '?')}
                  </Text>
                  <View
                    style={[
                      styles.mediumBadge,
                      pdf.medium === 'marathi'
                        ? styles.mediumBadgeMarathi
                        : pdf.medium === 'english'
                        ? styles.mediumBadgeEnglish
                        : styles.mediumBadgeBoth,
                    ]}
                  >
                    <Text style={styles.mediumBadgeText}>
                      {pdf.medium === 'marathi'
                        ? 'Marathi'
                        : pdf.medium === 'english'
                        ? 'English'
                        : 'Both'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.thumbnailContainer}>
                  <Ionicons name="document-text" size={32} color={COLORS.primary} />
                </View>
                <View style={styles.pdfInfo}>
                  <Text style={styles.pdfTitle} numberOfLines={1}>{pdf.title}</Text>
                  {pdf.title_marathi && (
                    <Text style={styles.pdfMarathi} numberOfLines={1}>{pdf.title_marathi}</Text>
                  )}
                  <Text style={styles.pdfSubject}>{pdf.subject}</Text>
                  {pdf.chapter_name && (
                    <Text style={styles.chapterText}>Chapter: {pdf.chapter_name}</Text>
                  )}
                  {pdf.total_pages > 0 && (
                    <Text style={styles.pageText}>{pdf.total_pages} pages</Text>
                  )}
                  <Text style={styles.pdfDate}>Added: {formatDate(pdf.created_at)}</Text>
                </View>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => navigation.navigate('EditPdf', { pdfId: pdf.id })}
                >
                  <Ionicons name="create-outline" size={16} color="#2563EB" />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.toggleButton]}
                  onPress={() => handleToggleActive(pdf.id, pdf.isActive)}
                >
                  <Ionicons 
                    name={pdf.isActive ? 'eye-off-outline' : 'eye-outline'} 
                    size={16} 
                    color={pdf.isActive ? '#D97706' : '#16A34A'} 
                  />
                  <Text style={[styles.toggleButtonText, { color: pdf.isActive ? '#D97706' : '#16A34A' }]}>
                    {pdf.isActive ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeletePdf(pdf.id, pdf.title, pdf.pdf_url)}
                >
                  <Ionicons name="trash-outline" size={16} color="#DC2626" />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity 
          style={styles.filterModalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <View style={styles.filterModalContent}>
            <Text style={styles.filterModalTitle}>Filter by Class</Text>
            <TouchableOpacity
              style={[styles.filterOption, selectedClass === 'all' && styles.filterOptionSelected]}
              onPress={() => {
                setSelectedClass('all');
              }}
            >
              <Text style={[styles.filterOptionText, selectedClass === 'all' && styles.filterOptionTextSelected]}>
                All Classes
              </Text>
            </TouchableOpacity>
            {classes.map((cls) => (
              <TouchableOpacity
                key={cls.id}
                style={[styles.filterOption, selectedClass === String(cls.id) && styles.filterOptionSelected]}
                onPress={() => {
                  setSelectedClass(String(cls.id));
                }}
              >
                <Text style={[styles.filterOptionText, selectedClass === String(cls.id) && styles.filterOptionTextSelected]}>
                  {cls.name}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={[styles.filterModalTitle, { marginTop: 16 }]}>Filter by Medium</Text>
            {[
              { key: 'all', label: 'All Mediums' },
              { key: 'english', label: 'English Medium' },
              { key: 'marathi', label: 'Marathi Medium' },
            ].map((m) => (
              <TouchableOpacity
                key={m.key}
                style={[styles.filterOption, selectedMedium === m.key && styles.filterOptionSelected]}
                onPress={() => {
                  setSelectedMedium(m.key);
                }}
              >
                <Text style={[styles.filterOptionText, selectedMedium === m.key && styles.filterOptionTextSelected]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.filterApplyButton}
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={styles.filterApplyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  addButton: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#0F172A',
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
  },
  emptyButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  pdfCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#DCFCE7',
  },
  inactiveBadge: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  activeText: {
    color: '#16A34A',
  },
  inactiveText: {
    color: '#DC2626',
  },
  classText: {
    fontSize: 11,
    color: '#64748B',
  },
  headerRightBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mediumBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  mediumBadgeEnglish: {
    backgroundColor: '#DBEAFE',
  },
  mediumBadgeMarathi: {
    backgroundColor: '#FEF3C7',
  },
  mediumBadgeBoth: {
    backgroundColor: '#E2E8F0',
  },
  mediumBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  cardBody: {
    flexDirection: 'row',
    padding: 14,
    paddingTop: 8,
  },
  thumbnailContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfInfo: {
    flex: 1,
    marginLeft: 12,
  },
  pdfTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  pdfMarathi: {
    fontSize: 12,
    color: '#4F46E5',
    marginTop: 1,
  },
  pdfSubject: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  chapterText: {
    fontSize: 11,
    color: '#8B5CF6',
    marginTop: 1,
  },
  pageText: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  pdfDate: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flex: 1,
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: '#EEF2FF',
  },
  editButtonText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '500',
  },
  toggleButton: {
    backgroundColor: '#F8FAFC',
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
  deleteButtonText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    width: '80%',
  },
  filterModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  filterOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  filterOptionSelected: {
    backgroundColor: '#EEF2FF',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#64748B',
  },
  filterOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  filterApplyButton: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  filterApplyButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },
});

export default ManagePdfsScreen;
