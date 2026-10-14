import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { executeQuery } from '../../database/database';
import { COLORS } from '../../constants/colors';
import { ensureProgressTables } from '../../services/progressService';

interface RecentActivityItem {
  title: string;
  type: 'video' | 'quiz' | 'pdf';
  date: string;
}

interface ProgressData {
  total_videos: number;
  watched_videos: number;
  completed_quizzes: number;
  total_quizzes: number;
  total_pdfs: number;
  viewed_pdfs: number;
  recent_activity: RecentActivityItem[];
}

const ProgressScreen: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<ProgressData>({
    total_videos: 0,
    watched_videos: 0,
    completed_quizzes: 0,
    total_quizzes: 0,
    total_pdfs: 0,
    viewed_pdfs: 0,
    recent_activity: [],
  });

  const loadProgress = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      await ensureProgressTables();

      // Get total videos
      const totalVideos = await executeQuery(
        'SELECT COUNT(*) as count FROM videos WHERE is_active = 1',
        []
      );

      // Get watched videos
      const watchedVideos = await executeQuery(
        `SELECT COUNT(DISTINCT video_id) as count FROM video_progress 
         WHERE user_id = ? AND is_completed = 1`,
        [user.id]
      );

      // Get total quizzes
      const totalQuizzes = await executeQuery(
        'SELECT COUNT(*) as count FROM quizzes WHERE is_active = 1',
        []
      );

      // Get completed quizzes (count distinct quizzes attempted)
      const completedQuizzes = await executeQuery(
        `SELECT COUNT(DISTINCT quiz_id) as count FROM quiz_attempts 
         WHERE user_id = ?`,
        [user.id]
      );

      // Get total PDFs
      const totalPdfs = await executeQuery(
        'SELECT COUNT(*) as count FROM pdfs WHERE is_active = 1',
        []
      );

      // Get viewed PDFs from pdf_progress, fallback to progress table
      const viewedPdfs = await executeQuery(
        `SELECT COUNT(DISTINCT pdf_id) as count FROM pdf_progress 
         WHERE user_id = ?`,
        [user.id]
      );

      const legacyPdfs = await executeQuery(
        `SELECT COUNT(*) as count FROM progress 
         WHERE user_id = ? AND pdf_viewed = 1`,
        [user.id]
      );

      const effectiveViewedPdfs = Math.max(viewedPdfs[0]?.count || 0, legacyPdfs[0]?.count || 0);

      // Recent Activity across videos, quizzes, and books
      const recentRows = await executeQuery(
        `SELECT title, type, date FROM (
           SELECT 
             v.title_english as title,
             'video' as type,
             vp.last_watched_at as date
           FROM video_progress vp
           JOIN videos v ON vp.video_id = v.id
           WHERE vp.user_id = ?

           UNION ALL

           SELECT 
             q.title_english as title,
             'quiz' as type,
             qa.attempted_at as date
           FROM quiz_attempts qa
           JOIN quizzes q ON qa.quiz_id = q.id
           WHERE qa.user_id = ?

           UNION ALL

           SELECT 
             p.title_english as title,
             'pdf' as type,
             pp.last_read_at as date
           FROM pdf_progress pp
           JOIN pdfs p ON pp.pdf_id = p.id
           WHERE pp.user_id = ?
         )
         ORDER BY date DESC
         LIMIT 5`,
        [user.id, user.id, user.id]
      );

      setProgress({
        total_videos: totalVideos[0]?.count || 0,
        watched_videos: watchedVideos[0]?.count || 0,
        total_quizzes: totalQuizzes[0]?.count || 0,
        completed_quizzes: completedQuizzes[0]?.count || 0,
        total_pdfs: totalPdfs[0]?.count || 0,
        viewed_pdfs: effectiveViewedPdfs,
        recent_activity: (recentRows as any[]) || [],
      });

    } catch (error) {
      console.error('Error loading progress:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProgress();
    }, [user?.id])
  );

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

  const videoProgress = calculatePercentage(progress.watched_videos, progress.total_videos);
  const quizProgress = calculatePercentage(progress.completed_quizzes, progress.total_quizzes);
  const pdfProgress = calculatePercentage(progress.viewed_pdfs, progress.total_pdfs);
  const overallProgress = Math.round(
    (videoProgress + quizProgress + pdfProgress) / 3
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Your Progress</Text>
          <Text style={styles.subtitle}>Track your learning journey</Text>
        </View>

        {/* Overall Progress */}
        <View style={styles.overallCard}>
          <Text style={styles.overallLabel}>Overall Progress</Text>
          <Text style={styles.overallPercentage}>{overallProgress}%</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${overallProgress}%` }]} />
          </View>
        </View>

        {/* Progress Stats */}
        <View style={styles.statsGrid}>
          {/* Videos */}
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🎬</Text>
            <Text style={styles.statTitle}>Videos</Text>
            <Text style={styles.statValue}>
              {progress.watched_videos}/{progress.total_videos}
            </Text>
            <View style={styles.smallProgressBar}>
              <View style={[styles.smallProgressFill, { width: `${videoProgress}%` }]} />
            </View>
            <Text style={styles.statPercentage}>{videoProgress}%</Text>
          </View>

          {/* Quizzes */}
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📝</Text>
            <Text style={styles.statTitle}>Quizzes</Text>
            <Text style={styles.statValue}>
              {progress.completed_quizzes}/{progress.total_quizzes}
            </Text>
            <View style={styles.smallProgressBar}>
              <View style={[styles.smallProgressFill, { width: `${quizProgress}%` }]} />
            </View>
            <Text style={styles.statPercentage}>{quizProgress}%</Text>
          </View>

          {/* PDFs */}
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📄</Text>
            <Text style={styles.statTitle}>PDFs</Text>
            <Text style={styles.statValue}>
              {progress.viewed_pdfs}/{progress.total_pdfs}
            </Text>
            <View style={styles.smallProgressBar}>
              <View style={[styles.smallProgressFill, { width: `${pdfProgress}%` }]} />
            </View>
            <Text style={styles.statPercentage}>{pdfProgress}%</Text>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {progress.recent_activity.length > 0 ? (
            progress.recent_activity.map((item, index) => {
              const icon = item.type === 'video' ? '🎬' : item.type === 'quiz' ? '📝' : '📄';
              const typeLabel = item.type === 'video' ? 'Watched Video' : item.type === 'quiz' ? 'Completed Quiz' : 'Read Textbook';
              return (
                <View key={index} style={styles.activityItem}>
                  <View style={styles.activityIcon}>
                    <Text style={{ fontSize: 18 }}>{icon}</Text>
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.activityMeta}>{typeLabel} • {new Date(item.date).toLocaleDateString()}</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.activityCard}>
              <Text style={styles.activityText}>
                Start watching videos, taking quizzes, or reading textbooks to track your progress!
              </Text>
            </View>
          )}
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
    backgroundColor: COLORS.primary,
    padding: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  overallCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    margin: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  overallLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  overallPercentage: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
    marginVertical: 10,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
    gap: 15,
  },
  statCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 15,
    width: '31%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  statTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 3,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 5,
  },
  smallProgressBar: {
    width: '100%',
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  smallProgressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  statPercentage: {
    fontSize: 11,
    color: COLORS.primary,
    marginTop: 3,
    fontWeight: '600',
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  activityCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activityText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 3,
  },
  activityMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});

export default ProgressScreen;