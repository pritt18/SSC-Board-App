// src/screens/admin/ManageVideosScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
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

type Props = NativeStackScreenProps<AdminStackParamList, 'ManageVideos'>;

interface VideoItem {
  id: number;
  title: string;
  title_marathi: string | null;
  subject: string;
  subject_id: number;
  classNumber: number;
  className: string;
  isActive: boolean;
  created_at: string;
  video_url: string;
  description: string | null;
}

const ManageVideosScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<VideoItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);

  const loadVideos = async () => {
    try {
      setLoading(true);

      let query = `
        SELECT 
          v.id,
          v.title_english as title,
          v.title_marathi,
          s.name_english as subject,
          v.subject_id,
          c.class_number as classNumber,
          c.name_english as className,
          v.is_active as isActive,
          v.created_at,
          v.video_url,
          v.description_english as description
        FROM videos v
        JOIN subjects s ON v.subject_id = s.id
        JOIN classes c ON s.class_id = c.id
      `;
      
      const params: any[] = [];
      
      if (selectedClass !== 'all') {
        query += ' WHERE c.id = ?';
        params.push(parseInt(selectedClass));
      }
      
      query += ' ORDER BY v.id DESC';

      const items = await executeQuery(query, params);
      setVideos(items as VideoItem[]);
      setFilteredVideos(items as VideoItem[]);
    } catch (error) {
      console.error('Error loading videos:', error);
      showAlert('Error', 'Failed to load videos');
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
      loadVideos();
      loadClasses();
    }, [selectedClass])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadVideos();
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim() === '') {
      setFilteredVideos(videos);
    } else {
      const filtered = videos.filter(
        (video) =>
          video.title.toLowerCase().includes(text.toLowerCase()) ||
          video.subject.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredVideos(filtered);
    }
  };

  // Fixed: Alert.alert() with multiple buttons + callbacks doesn't
  // work on web — this now uses confirmAction(), which falls back to
  // the browser's real confirm() dialog on web.
  const handleToggleActive = (id: number, currentStatus: boolean) => {
    confirmAction(
      `${currentStatus ? 'Deactivate' : 'Activate'} Video`,
      `Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this video?`,
      async () => {
        try {
          await executeQuery(
            `UPDATE videos SET is_active = ? WHERE id = ?`,
            [currentStatus ? 0 : 1, id]
          );
          loadVideos();
          showAlert('Success', `Video ${currentStatus ? 'deactivated' : 'activated'}`);
        } catch (error) {
          showAlert('Error', 'Failed to update video status');
        }
      },
      'Confirm',
      currentStatus
    );
  };

  const handleDeleteVideo = (id: number, title: string, videoUrl: string) => {
    confirmAction(
      'Delete Video',
      `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      async () => {
        try {
          await executeQuery(`DELETE FROM videos WHERE id = ?`, [id]);
          // Also clean up the actual stored file (native file or web
          // IndexedDB entry) — safe to call even if it's already gone.
          await deleteFile(videoUrl);
          loadVideos();
          showAlert('Success', 'Video deleted successfully');
        } catch (error) {
          showAlert('Error', 'Failed to delete video');
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
        <Text style={styles.loadingText}>Loading videos...</Text>
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
        <Text style={styles.headerTitle}>Manage Videos</Text>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => navigation.navigate('AddVideo')}
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
            placeholder="Search videos..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#94A3B8"
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
          {selectedClass !== 'all' && (
            <View style={styles.filterBadge} />
          )}
        </TouchableOpacity>
      </View>

      {/* Video List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredVideos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="videocam-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Videos Found</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Try a different search' : 'Upload your first video'}
            </Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => navigation.navigate('AddVideo')}
            >
              <Text style={styles.emptyButtonText}>Upload Video</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredVideos.map((video) => (
            <View key={video.id} style={styles.videoCard}>
              <View style={styles.cardHeader}>
                <View style={[styles.statusBadge, video.isActive ? styles.activeBadge : styles.inactiveBadge]}>
                  <Text style={[styles.statusText, video.isActive ? styles.activeText : styles.inactiveText]}>
                    {video.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
                <Text style={styles.classText}>{video.className}</Text>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.thumbnailContainer}>
                  <Ionicons name="play-circle" size={40} color={COLORS.primary} />
                </View>
                <View style={styles.videoInfo}>
                  <Text style={styles.videoTitle} numberOfLines={1}>{video.title}</Text>
                  {video.title_marathi && (
                    <Text style={styles.videoMarathi} numberOfLines={1}>{video.title_marathi}</Text>
                  )}
                  <Text style={styles.videoSubject}>{video.subject}</Text>
                  <Text style={styles.videoDate}>Added: {formatDate(video.created_at)}</Text>
                </View>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.viewButton]}
                  onPress={() => navigation.navigate('VideoPlayer', { subjectId: video.subject_id, videoId: video.id })}
                >
                  <Ionicons name="play-outline" size={16} color={COLORS.primary} />
                  <Text style={[styles.editButtonText, { color: COLORS.primary }]}>View</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => navigation.navigate('EditVideo', { videoId: video.id })}
                >
                  <Ionicons name="create-outline" size={16} color="#2563EB" />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.toggleButton]}
                  onPress={() => handleToggleActive(video.id, video.isActive)}
                >
                  <Ionicons 
                    name={video.isActive ? 'eye-off-outline' : 'eye-outline'} 
                    size={16} 
                    color={video.isActive ? '#D97706' : '#16A34A'} 
                  />
                  <Text style={[styles.toggleButtonText, { color: video.isActive ? '#D97706' : '#16A34A' }]}>
                    {video.isActive ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeleteVideo(video.id, video.title, video.video_url)}
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
                setShowFilterModal(false);
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
                  setShowFilterModal(false);
                }}
              >
                <Text style={[styles.filterOptionText, selectedClass === String(cls.id) && styles.filterOptionTextSelected]}>
                  {cls.name}
                </Text>
              </TouchableOpacity>
            ))}
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
  videoCard: {
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
  videoInfo: {
    flex: 1,
    marginLeft: 12,
  },
  videoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  videoMarathi: {
    fontSize: 12,
    color: '#4F46E5',
    marginTop: 1,
  },
  videoSubject: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  videoDate: {
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
  viewButton: {
    backgroundColor: '#EFF6FF',
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
});

export default ManageVideosScreen;
