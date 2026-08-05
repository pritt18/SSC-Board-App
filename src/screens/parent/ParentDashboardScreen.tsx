import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../../constants/colors';
import { executeQuery } from '../../database/database';
import { useAuth } from '../../context/AuthContext';
import { useParentChild } from '../../context/ParentChildContext';
import ChildSwitcher from '../../components/parent/ChildSwitcher';

interface QuickStats {
  totalSubjects: number;
  completedQuizzes: number;
  averageScore: number;
  weakSubjects: number;
  unreadNotifications: number;
}

const ParentDashboardScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();
  const { children, loading: childrenLoading, selectedChild } =
    useParentChild();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<QuickStats>({
    totalSubjects: 0,
    completedQuizzes: 0,
    averageScore: 0,
    weakSubjects: 0,
    unreadNotifications: 0,
  });

  const loadStats = async () => {
    if (!selectedChild || !user?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);

      const progressRows = await executeQuery(
        `SELECT quiz_completed, quiz_score FROM progress WHERE user_id = ?`,
        [selectedChild.id]
      );

      const completed = progressRows.filter((r: any) => r.quiz_completed).length;
      const scores = progressRows
        .filter((r: any) => r.quiz_completed)
        .map((r: any) => r.quiz_score as number);
      const avg =
        scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 0;
      const weak = progressRows.filter(
        (r: any) => r.quiz_completed && r.quiz_score < 40
      ).length;

      const unread = await executeQuery(
        `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0`,
        [user.id]
      );

      setStats({
        totalSubjects: progressRows.length,
        completedQuizzes: completed,
        averageScore: avg,
        weakSubjects: weak,
        unreadNotifications: unread[0]?.count || 0,
      });
    } catch (error) {
      console.error('Error loading parent dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [selectedChild?.id, user?.id])
  );

  if (childrenLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  if (children.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyWrap}>
          <Ionicons name="people-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>No Children Linked</Text>
          <Text style={styles.emptyText}>
            Ask the school admin to link your account to your child's student
            account. Once linked, their progress will show up here.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const quickActions = [
    { label: 'View Progress', icon: 'bar-chart-outline', route: 'ParentProgress' },
    { label: 'Quiz Results', icon: 'checkmark-done-outline', route: 'ParentQuizResults' },
    { label: 'Study Time', icon: 'time-outline', route: 'ParentStudyTime' },
    { label: 'Notifications', icon: 'notifications-outline', route: 'ParentNotifications' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
      <View>
        <Text style={styles.welcome}>Welcome,</Text>
        <Text style={styles.name}>{user?.full_name || 'Parent'}</Text>
      </View>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={logout}
      >
        <Ionicons
          name="log-out-outline"
          size={24}
          color="#FFFFFF"
        />
      </TouchableOpacity>
    </View>

      <ChildSwitcher />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 30 }} color={COLORS.primary} />
        ) : (
          <>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: '#EFF6FF' }]}>
                <Text style={[styles.statValue, { color: COLORS.primary }]}>
                  {stats.averageScore}%
                </Text>
                <Text style={styles.statLabel}>Avg. Quiz Score</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#F0FDF4' }]}>
                <Text style={[styles.statValue, { color: COLORS.success }]}>
                  {stats.completedQuizzes}
                </Text>
                <Text style={styles.statLabel}>Quizzes Done</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#FEF2F2' }]}>
                <Text style={[styles.statValue, { color: COLORS.error }]}>
                  {stats.weakSubjects}
                </Text>
                <Text style={styles.statLabel}>Weak Subjects</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#FFFBEB' }]}>
                <Text style={[styles.statValue, { color: COLORS.secondary }]}>
                  {stats.unreadNotifications}
                </Text>
                <Text style={styles.statLabel}>New Alerts</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
              {quickActions.map((action) => (
                <TouchableOpacity
                  key={action.route}
                  style={styles.actionCard}
                  onPress={() => navigation.navigate(action.route)}
                >
                  <View style={styles.actionIconWrap}>
                    <Ionicons name={action.icon as any} size={22} color={COLORS.primary} />
                  </View>
                  <Text style={styles.actionLabel}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ParentDashboardScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
  paddingHorizontal: 20,
  paddingTop: 10,
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  },
  welcome: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 14,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
  },
  statCard: {
    width: '47%',
    borderRadius: 14,
    padding: 16,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 24,
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '47%',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    alignItems: 'center',
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  logoutButton: {
  width: 42,
  height: 42,
  borderRadius: 21,
  backgroundColor: '#EF4444',
  justifyContent: 'center',
  alignItems: 'center',
  elevation: 3,
},
});
