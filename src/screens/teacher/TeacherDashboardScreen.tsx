import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

interface Stats {
  className: string | null;
  totalStudents: number;
  quizzesCreated: number;
  assignmentsCreated: number;
  avgClassScore: number;
}

const TeacherDashboardScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    className: null,
    totalStudents: 0,
    quizzesCreated: 0,
    assignmentsCreated: 0,
    avgClassScore: 0,
  });

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
          } catch (error) {
            console.error('Logout error:', error);
            Alert.alert('Error', 'Failed to logout');
          }
        },
      },
    ]);
  };

  const loadStats = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);

      if (!user.class_id) {
        setStats({
          className: null,
          totalStudents: 0,
          quizzesCreated: 0,
          assignmentsCreated: 0,
          avgClassScore: 0,
        });
        return;
      }

      const classRow = await executeQuery(
        `SELECT class_number, name_english FROM classes WHERE id = ?`,
        [user.class_id]
      );

      const students = await executeQuery(
        `SELECT COUNT(*) as count FROM users WHERE role = 'student' AND class_id = ?`,
        [user.class_id]
      );

      const quizzes = await executeQuery(
        `SELECT COUNT(*) as count FROM quizzes q
         JOIN subjects s ON q.subject_id = s.id
         WHERE s.class_id = ?`,
        [user.class_id]
      );

      const assignments = await executeQuery(
        `SELECT COUNT(*) as count FROM assignments WHERE teacher_id = ? AND class_id = ?`,
        [user.id, user.class_id]
      );

      const scores = await executeQuery(
        `SELECT AVG(quiz_score) as avg FROM progress p
         JOIN users u ON p.user_id = u.id
         WHERE u.class_id = ? AND u.role = 'student' AND p.quiz_completed = 1`,
        [user.class_id]
      );

      setStats({
        className: classRow[0]
          ? `Class ${classRow[0].class_number}`
          : null,
        totalStudents: students[0]?.count || 0,
        quizzesCreated: quizzes[0]?.count || 0,
        assignmentsCreated: assignments[0]?.count || 0,
        avgClassScore: Math.round(scores[0]?.avg || 0),
      });
    } catch (error) {
      console.error('Error loading teacher dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [user?.id, user?.class_id])
  );

  const quickActions = [
    { label: 'Create Quiz', icon: 'checkmark-done-outline', route: 'TeacherQuizzesStack' },
    { label: 'Create Assignment', icon: 'document-text-outline', route: 'TeacherAssignmentsStack' },
    { label: 'Student Reports', icon: 'people-outline', route: 'TeacherReports' },
    { label: 'Send Notification', icon: 'notifications-outline', route: 'TeacherNotifications' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.welcome}>Welcome,</Text>
            <Text style={styles.name}>{user?.full_name || 'Teacher'}</Text>
            {stats.className && (
              <Text style={styles.classText}>Teaching: {stats.className}</Text>
            )}
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color={COLORS.error} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 30 }} color={COLORS.primary} />
        ) : !user?.class_id ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="school-outline" size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>No Class Assigned</Text>
            <Text style={styles.emptyText}>
              Ask the admin to assign you a class before you can create
              quizzes, assignments, or view student reports.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: '#EFF6FF' }]}>
                <Text style={[styles.statValue, { color: COLORS.primary }]}>
                  {stats.totalStudents}
                </Text>
                <Text style={styles.statLabel}>Students</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#F0FDF4' }]}>
                <Text style={[styles.statValue, { color: COLORS.success }]}>
                  {stats.quizzesCreated}
                </Text>
                <Text style={styles.statLabel}>Quizzes</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#FFFBEB' }]}>
                <Text style={[styles.statValue, { color: COLORS.secondary }]}>
                  {stats.assignmentsCreated}
                </Text>
                <Text style={styles.statLabel}>Assignments</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#FEF2F2' }]}>
                <Text style={[styles.statValue, { color: COLORS.error }]}>
                  {stats.avgClassScore}%
                </Text>
                <Text style={styles.statLabel}>Avg. Class Score</Text>
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

export default TeacherDashboardScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 20, paddingTop: 10 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  logoutText: { fontSize: 12, fontWeight: '700', color: COLORS.error },
  welcome: { fontSize: 15, color: COLORS.textSecondary },
  name: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary },
  classText: { fontSize: 13, color: COLORS.primary, fontWeight: '600', marginTop: 4 },
  content: { padding: 20, paddingBottom: 40 },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', padding: 30, marginTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginTop: 14 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  statCard: { width: '47%', borderRadius: 14, padding: 16 },
  statValue: { fontSize: 26, fontWeight: '800' },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginTop: 24, marginBottom: 12 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
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
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  actionLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'center' },
});
