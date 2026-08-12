import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { executeQuery } from '../../../database/database';
import { COLORS } from '../../../constants/colors';

interface DashboardStats {
  totalVideos: number;
  watchedVideos: number;
  totalQuizzes: number;
  completedQuizzes: number;
  totalPdfs: number;
  viewedPdfs: number;
  recentActivity: Array<{
    id: number;
    title: string;
    type: string;
    date: string;
  }>;
}

const DashboardScreen: React.FC = ({ navigation }: any) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalVideos: 0,
    watchedVideos: 0,
    totalQuizzes: 0,
    completedQuizzes: 0,
    totalPdfs: 0,
    viewedPdfs: 0,
    recentActivity: [],
  });

  const loadDashboardData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Get all stats in parallel
      const [
        totalVideos,
        watchedVideos,
        totalQuizzes,
        completedQuizzes,
        totalPdfs,
        viewedPdfs,
        recentActivity,
      ] = await Promise.all([
        executeQuery('SELECT COUNT(*) as count FROM videos WHERE is_active = 1', []),
        executeQuery(
          'SELECT COUNT(*) as count FROM video_progress WHERE user_id = ? AND is_completed = 1',
          [user.id]
        ),
        executeQuery('SELECT COUNT(*) as count FROM quizzes WHERE is_active = 1', []),
        executeQuery(
          'SELECT COUNT(*) as count FROM quiz_attempts WHERE user_id = ?',
          [user.id]
        ),
        executeQuery('SELECT COUNT(*) as count FROM pdfs WHERE is_active = 1', []),
        executeQuery(
          'SELECT COUNT(*) as count FROM progress WHERE user_id = ? AND pdf_viewed = 1',
          [user.id]
        ),
        // Get recent activity
        executeQuery(
          `SELECT 
            v.title_english as title,
            'video' as type,
            vp.last_watched_at as date
          FROM video_progress vp
          JOIN videos v ON vp.video_id = v.id
          WHERE vp.user_id = ?
          ORDER BY vp.last_watched_at DESC
          LIMIT 5`,
          [user.id]
        ),
      ]);

      setStats({
        totalVideos: totalVideos[0]?.count || 0,
        watchedVideos: watchedVideos[0]?.count || 0,
        totalQuizzes: totalQuizzes[0]?.count || 0,
        completedQuizzes: completedQuizzes[0]?.count || 0,
        totalPdfs: totalPdfs[0]?.count || 0,
        viewedPdfs: viewedPdfs[0]?.count || 0,
        recentActivity: recentActivity || [],
      });

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [user?.id])
  );

  const calculatePercentage = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const videoProgress = calculatePercentage(stats.watchedVideos, stats.totalVideos);
  const quizProgress = calculatePercentage(stats.completedQuizzes, stats.totalQuizzes);
  const pdfProgress = calculatePercentage(stats.viewedPdfs, stats.totalPdfs);
  const overallProgress = Math.round((videoProgress + quizProgress + pdfProgress) / 3);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcome}>Welcome,</Text>
            <Text style={styles.userName}>{user?.full_name || 'Student'}!</Text>
            <Text style={styles.classText}>Class {user?.class_id || 'Not Assigned'}</Text>
          </View>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
        </View>

        {/* Overall Progress */}
        <TouchableOpacity 
          style={styles.overallCard}
          onPress={() => navigation.navigate('Progress')}
          activeOpacity={0.8}
        >
          <Text style={styles.overallLabel}>Overall Progress</Text>
          <Text style={styles.overallPercentage}>{overallProgress}%</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${overallProgress}%` }]} />
          </View>
          <Text style={styles.overallSubtext}>
            {stats.watchedVideos} videos • {stats.completedQuizzes} quizzes • {stats.viewedPdfs} PDFs
          </Text>
        </TouchableOpacity>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => navigation.navigate('Learning')}
            activeOpacity={0.7}
          >
            <Text style={styles.statIcon}>🎬</Text>
            <Text style={styles.statValue}>{stats.watchedVideos}</Text>
            <Text style={styles.statLabel}>Videos Watched</Text>
            <Text style={styles.statProgress}>{videoProgress}%</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => navigation.navigate('Progress')}
            activeOpacity={0.7}
          >
            <Text style={styles.statIcon}>📝</Text>
            <Text style={styles.statValue}>{stats.completedQuizzes}</Text>
            <Text style={styles.statLabel}>Quizzes Done</Text>
            <Text style={styles.statProgress}>{quizProgress}%</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => navigation.navigate('Learning')}
            activeOpacity={0.7}
          >
            <Text style={styles.statIcon}>📄</Text>
            <Text style={styles.statValue}>{stats.viewedPdfs}</Text>
            <Text style={styles.statLabel}>PDFs Viewed</Text>
            <Text style={styles.statProgress}>{pdfProgress}%</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('Learning')}
            >
              <Text style={styles.actionIcon}>📚</Text>
              <Text style={styles.actionText}>Continue Learning</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('Progress')}
            >
              <Text style={styles.actionIcon}>📊</Text>
              <Text style={styles.actionText}>View Progress</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('Games')}
            >
              <Text style={styles.actionIcon}>🎮</Text>
              <Text style={styles.actionText}>Play Games</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.actionIcon}>👤</Text>
              <Text style={styles.actionText}>Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('StudentAssignments')}
            >
              <Text style={styles.actionIcon}>📋</Text>
              <Text style={styles.actionText}>Assignments</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('StudentNotifications')}
            >
              <Text style={styles.actionIcon}>🔔</Text>
              <Text style={styles.actionText}>Notifications</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {stats.recentActivity.length > 0 ? (
            stats.recentActivity.map((item, index) => (
              <View key={index} style={styles.activityItem}>
                <View style={styles.activityIcon}>
                  <Text>{item.type === 'video' ? '▶️' : '📄'}</Text>
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>{item.title}</Text>
                  <Text style={styles.activityDate}>
                    {new Date(item.date).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyActivity}>
              <Text style={styles.emptyText}>No recent activity</Text>
              <Text style={styles.emptySubtext}>Start learning to see your progress!</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcome: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: 2,
  },
  classText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  overallCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 15,
    marginTop: -15,
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
    fontSize: 40,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
    marginVertical: 5,
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
  overallSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginTop: 15,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
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
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  statProgress: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 15,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  activityDate: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  emptyActivity: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 5,
  },
});

export default DashboardScreen;