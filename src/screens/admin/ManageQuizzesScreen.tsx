// src/screens/admin/ManageQuizzesScreen.tsx
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

type Props = NativeStackScreenProps<AdminStackParamList, 'ManageQuizzes'>;

interface QuizItem {
  id: number;
  title: string;
  title_marathi: string;
  subject: string;
  subject_id: number;
  classNumber: number;
  className: string;
  isActive: boolean;
  created_at: string;
  total_questions: number;
  time_limit: number;
  passing_percentage: number;
  description: string;
  type: string;
}

const ManageQuizzesScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState<QuizItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);

  const loadQuizzes = async () => {
    try {
      setLoading(true);

      let query = `
        SELECT 
          q.id,
          q.title_english as title,
          q.title_marathi,
          s.name_english as subject,
          q.subject_id,
          c.class_number as classNumber,
          c.name_english as className,
          q.is_active as isActive,
          q.created_at,
          q.total_questions,
          q.time_limit,
          q.passing_percentage,
          q.description_english as description,
          q.type
        FROM quizzes q
        JOIN subjects s ON q.subject_id = s.id
        JOIN classes c ON s.class_id = c.id
      `;
      
      const params: any[] = [];
      
      if (selectedClass !== 'all') {
        query += ' WHERE c.id = ?';
        params.push(parseInt(selectedClass));
      }
      
      query += ' ORDER BY q.id DESC';

      const items = await executeQuery(query, params);
      setQuizzes(items as QuizItem[]);
      setFilteredQuizzes(items as QuizItem[]);
    } catch (error) {
      console.error('Error loading quizzes:', error);
      Alert.alert('Error', 'Failed to load quizzes');
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
      loadQuizzes();
      loadClasses();
    }, [selectedClass])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadQuizzes();
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim() === '') {
      setFilteredQuizzes(quizzes);
    } else {
      const filtered = quizzes.filter(
        (quiz) =>
          quiz.title.toLowerCase().includes(text.toLowerCase()) ||
          quiz.subject.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredQuizzes(filtered);
    }
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    Alert.alert(
      `${currentStatus ? 'Deactivate' : 'Activate'} Quiz`,
      `Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this quiz?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: currentStatus ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await executeQuery(
                `UPDATE quizzes SET is_active = ? WHERE id = ?`,
                [currentStatus ? 0 : 1, id]
              );
              loadQuizzes();
              Alert.alert('Success', `Quiz ${currentStatus ? 'deactivated' : 'activated'}`);
            } catch (error) {
              Alert.alert('Error', 'Failed to update quiz status');
            }
          },
        },
      ]
    );
  };

  // src/screens/admin/ManageQuizzesScreen.tsx - Updated handleDeleteQuiz
const handleDeleteQuiz = async (id: number, title: string) => {
  Alert.alert(
    'Delete Quiz',
    `Are you sure you want to delete "${title}"? This will also delete all associated questions.`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            // First delete questions (if foreign key cascade doesn't work)
            await executeQuery(`DELETE FROM questions WHERE quiz_id = ?`, [id]);
            // Then delete quiz
            await executeQuery(`DELETE FROM quizzes WHERE id = ?`, [id]);
            loadQuizzes();
            Alert.alert('Success', 'Quiz deleted successfully');
          } catch (error) {
            console.error('Error deleting quiz:', error);
            Alert.alert('Error', 'Failed to delete quiz');
          }
        },
      },
    ]
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

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'chapter_quiz': return 'Chapter Quiz';
      case 'practice_mcq': return 'Practice MCQ';
      case 'mock_test': return 'Mock Test';
      case 'previous_paper': return 'Previous Paper';
      default: return type;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading quizzes...</Text>
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
        <Text style={styles.headerTitle}>Manage Quizzes</Text>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => navigation.navigate('AddQuiz')}
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
            placeholder="Search quizzes..."
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
          {selectedClass !== 'all' && (
            <View style={styles.filterBadge} />
          )}
        </TouchableOpacity>
      </View>

      {/* Quiz List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredQuizzes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkbox-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Quizzes Found</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Try a different search' : 'Create your first quiz'}
            </Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => navigation.navigate('AddQuiz')}
            >
              <Text style={styles.emptyButtonText}>Create Quiz</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredQuizzes.map((quiz) => (
            <View key={quiz.id} style={styles.quizCard}>
              <View style={styles.cardHeader}>
                <View style={[styles.statusBadge, quiz.isActive ? styles.activeBadge : styles.inactiveBadge]}>
                  <Text style={[styles.statusText, quiz.isActive ? styles.activeText : styles.inactiveText]}>
                    {quiz.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
                <Text style={styles.classText}>{quiz.className}</Text>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.thumbnailContainer}>
                  <Ionicons name="checkbox" size={32} color={COLORS.primary} />
                </View>
                <View style={styles.quizInfo}>
                  <Text style={styles.quizTitle} numberOfLines={1}>{quiz.title}</Text>
                  {quiz.title_marathi && (
                    <Text style={styles.quizMarathi} numberOfLines={1}>{quiz.title_marathi}</Text>
                  )}
                  <Text style={styles.quizSubject}>{quiz.subject}</Text>
                  <View style={styles.quizMeta}>
                    <Text style={styles.metaText}>📝 {quiz.total_questions} Qs</Text>
                    <Text style={styles.metaText}>⏱ {quiz.time_limit} min</Text>
                    <Text style={styles.metaText}>🎯 {quiz.passing_percentage}%</Text>
                  </View>
                  <Text style={styles.quizType}>{getTypeLabel(quiz.type)}</Text>
                  <Text style={styles.quizDate}>Added: {formatDate(quiz.created_at)}</Text>
                </View>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => navigation.navigate('EditQuiz', { quizId: quiz.id })}
                >
                  <Ionicons name="create-outline" size={16} color="#2563EB" />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.viewButton]}
                  onPress={() => {
                    Alert.alert(
                      'Quiz Questions',
                      `This quiz has ${quiz.total_questions} questions.`,
                      [{ text: 'OK' }]
                    );
                  }}
                >
                  <Ionicons name="list-outline" size={16} color="#7C3AED" />
                  <Text style={[styles.actionButtonText, { color: '#7C3AED' }]}>Questions</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.toggleButton]}
                  onPress={() => handleToggleActive(quiz.id, quiz.isActive)}
                >
                  <Ionicons 
                    name={quiz.isActive ? 'eye-off-outline' : 'eye-outline'} 
                    size={16} 
                    color={quiz.isActive ? '#D97706' : '#16A34A'} 
                  />
                  <Text style={[styles.toggleButtonText, { color: quiz.isActive ? '#D97706' : '#16A34A' }]}>
                    {quiz.isActive ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeleteQuiz(quiz.id, quiz.title)}
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
  quizCard: {
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
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quizInfo: {
    flex: 1,
    marginLeft: 12,
  },
  quizTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  quizMarathi: {
    fontSize: 12,
    color: '#7C3AED',
    marginTop: 1,
  },
  quizSubject: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  quizMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  metaText: {
    fontSize: 10,
    color: '#64748B',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  quizType: {
    fontSize: 11,
    color: '#8B5CF6',
    marginTop: 2,
  },
  quizDate: {
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
    gap: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    flex: 1,
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: '#EEF2FF',
  },
  editButtonText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '500',
  },
  viewButton: {
    backgroundColor: '#EDE9FE',
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: '500',
  },
  toggleButton: {
    backgroundColor: '#F8FAFC',
  },
  toggleButtonText: {
    fontSize: 11,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
  deleteButtonText: {
    fontSize: 11,
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

export default ManageQuizzesScreen;