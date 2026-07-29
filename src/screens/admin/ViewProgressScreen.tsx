import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { executeQuery } from '../../database/database';
import { AdminStackParamList } from '../../navigation/AdminNavigator';

type Props = NativeStackScreenProps<AdminStackParamList, 'ViewProgress'>;

interface StudentProgress {
  id: number;
  name: string;
  email: string;
  class_number: number;
  videos_watched: number;
  total_videos: number;
  quizzes_completed: number;
  total_quizzes: number;
  pdfs_viewed: number;
  total_pdfs: number;
}

const ViewProgressScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [students, setStudents] = useState<StudentProgress[]>([]);

  const loadProgress = async () => {
    try {
      setLoading(true);

      const items = await executeQuery(
        `SELECT 
          u.id,
          u.full_name as name,
          u.email,
          c.class_number,
          (
            SELECT COUNT(*) FROM video_progress vp 
            WHERE vp.user_id = u.id AND vp.is_completed = 1
          ) as videos_watched,
          (
            SELECT COUNT(*) FROM videos v WHERE v.is_active = 1
          ) as total_videos,
          (
            SELECT COUNT(*) FROM quiz_attempts qa 
            WHERE qa.user_id = u.id
          ) as quizzes_completed,
          (
            SELECT COUNT(*) FROM quizzes q WHERE q.is_active = 1
          ) as total_quizzes,
          (
            SELECT COUNT(*) FROM progress p 
            WHERE p.user_id = u.id AND p.pdf_viewed = 1
          ) as pdfs_viewed,
          (
            SELECT COUNT(*) FROM pdfs pd WHERE pd.is_active = 1
          ) as total_pdfs
        FROM users u
        LEFT JOIN classes c ON u.class_id = c.id
        WHERE u.role = 'student'
        ORDER BY u.full_name`,
        []
      );

      setStudents(items as StudentProgress[]);
    } catch (error) {
      console.error('Error loading progress:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProgress();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadProgress();
  };

  const calculatePercentage = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading progress...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Student Progress</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {students.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyTitle}>No Students Found</Text>
            <Text style={styles.emptyText}>Students will appear here when they start learning</Text>
          </View>
        ) : (
          students.map((student) => {
            const videoProgress = calculatePercentage(student.videos_watched, student.total_videos);
            const quizProgress = calculatePercentage(student.quizzes_completed, student.total_quizzes);
            const pdfProgress = calculatePercentage(student.pdfs_viewed, student.total_pdfs);
            const overallProgress = Math.round((videoProgress + quizProgress + pdfProgress) / 3);

            return (
              <View key={student.id} style={styles.studentCard}>
                <View style={styles.studentHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {student.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{student.name}</Text>
                    <Text style={styles.studentEmail}>{student.email}</Text>
                    <Text style={styles.studentClass}>Class {student.class_number || 'Not Assigned'}</Text>
                  </View>
                </View>

                <View style={styles.progressStats}>
                  <View style={styles.progressItem}>
                    <Text style={styles.progressLabel}>Overall</Text>
                    <Text style={styles.progressValue}>{overallProgress}%</Text>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${overallProgress}%`, backgroundColor: COLORS.primary }]} />
                    </View>
                  </View>

                  <View style={styles.progressRow}>
                    <View style={styles.progressItemSmall}>
                      <Text style={styles.progressLabelSmall}>🎬 Videos</Text>
                      <Text style={styles.progressValueSmall}>
                        {student.videos_watched}/{student.total_videos}
                      </Text>
                      <View style={styles.smallProgressBar}>
                        <View style={[styles.smallProgressFill, { width: `${videoProgress}%`, backgroundColor: '#4F46E5' }]} />
                      </View>
                    </View>

                    <View style={styles.progressItemSmall}>
                      <Text style={styles.progressLabelSmall}>📝 Quizzes</Text>
                      <Text style={styles.progressValueSmall}>
                        {student.quizzes_completed}/{student.total_quizzes}
                      </Text>
                      <View style={styles.smallProgressBar}>
                        <View style={[styles.smallProgressFill, { width: `${quizProgress}%`, backgroundColor: '#D97706' }]} />
                      </View>
                    </View>

                    <View style={styles.progressItemSmall}>
                      <Text style={styles.progressLabelSmall}>📄 PDFs</Text>
                      <Text style={styles.progressValueSmall}>
                        {student.pdfs_viewed}/{student.total_pdfs}
                      </Text>
                      <View style={styles.smallProgressBar}>
                        <View style={[styles.smallProgressFill, { width: `${pdfProgress}%`, backgroundColor: '#059669' }]} />
                      </View>
                    </View>
                  </View>
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
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
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
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginLeft: 10,
  },
  content: {
    padding: 15,
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 50,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 15,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  studentCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  studentEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  studentClass: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  progressStats: {
    marginTop: 8,
  },
  progressItem: {
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  progressValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  progressItemSmall: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 8,
  },
  progressLabelSmall: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  progressValueSmall: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginVertical: 2,
  },
  smallProgressBar: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  smallProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
});

export default ViewProgressScreen;