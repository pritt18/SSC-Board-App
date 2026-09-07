// src/screens/admin/AdminDashboardScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { executeQuery } from '../../database/database';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

type Props = NativeStackScreenProps<AdminStackParamList, 'AdminDashboard'>;

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalParents: number;
  totalAdmins: number;
  totalClasses: number;
  totalSubjects: number;
  totalVideos: number;
  totalPdfs: number;
  totalQuizzes: number;
  activeLicenses: number;
  totalUsers: number;
  recentActivities: Array<{
    id: number;
    type: string;
    title: string;
    user: string;
    timestamp: string;
  }>;
}

interface QuickAction {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
  color: string;
  bgColor: string;
  screen: keyof AdminStackParamList;
  params?: any;
}

// -----------------------------------------------------------------
// React Native's Alert.alert() with multiple buttons + onPress
// callbacks does not work reliably on web (react-native-web has very
// limited/no support for it — the dialog either doesn't show or the
// button callbacks never fire). This small helper uses the browser's
// real window.confirm() on web, and the normal native Alert
// everywhere else, so "Logout" (and any other confirm dialog) always
// actually does something when tapped.
// -----------------------------------------------------------------
const confirmAction = (
  title: string,
  message: string,
  onConfirm: () => void,
  confirmLabel = 'OK'
) => {
  if (Platform.OS === 'web') {
    const confirmed = window.confirm(`${title}\n\n${message}`);
    if (confirmed) onConfirm();
    return;
  }

  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
};

const AdminDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalParents: 0,
    totalAdmins: 0,
    totalClasses: 0,
    totalSubjects: 0,
    totalVideos: 0,
    totalPdfs: 0,
    totalQuizzes: 0,
    activeLicenses: 0,
    totalUsers: 0,
    recentActivities: [],
  });

  const loadStats = async () => {
    try {
      setLoading(true);

      const [
        students, teachers, parents, admins,
        classes, subjects, videos, pdfs,
        quizzes, licenses, users,
        recentActivities
      ] = await Promise.all([
        executeQuery(`SELECT COUNT(*) as count FROM users WHERE role = 'student' AND is_active = 1`, []),
        executeQuery(`SELECT COUNT(*) as count FROM users WHERE role = 'teacher' AND is_active = 1`,[]),
        executeQuery(`SELECT COUNT(*) as count FROM users WHERE role = 'parent' AND is_active = 1`,[]),
        executeQuery(`SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = 1`,[]),
        executeQuery('SELECT COUNT(*) as count FROM classes WHERE is_active = 1', []),
        executeQuery('SELECT COUNT(*) as count FROM subjects WHERE is_active = 1', []),
        executeQuery('SELECT COUNT(*) as count FROM videos WHERE is_active = 1', []),
        executeQuery('SELECT COUNT(*) as count FROM pdfs WHERE is_active = 1', []),
        executeQuery('SELECT COUNT(*) as count FROM quizzes WHERE is_active = 1', []),
        executeQuery('SELECT COUNT(*) as count FROM licenses WHERE is_active = 1', []),
        executeQuery('SELECT COUNT(*) as count FROM users WHERE is_active = 1', []),
        executeQuery(
          `SELECT 
            'user_created' as type,
            u.full_name as user,
            u.created_at as timestamp,
            'New user registered' as title
          FROM users u
          ORDER BY u.created_at DESC
          LIMIT 5`,
          []
        ),
      ]);

      setStats({
        totalStudents: students[0]?.count || 0,
        totalTeachers: teachers[0]?.count || 0,
        totalParents: parents[0]?.count || 0,
        totalAdmins: admins[0]?.count || 0,
        totalClasses: classes[0]?.count || 0,
        totalSubjects: subjects[0]?.count || 0,
        totalVideos: videos[0]?.count || 0,
        totalPdfs: pdfs[0]?.count || 0,
        totalQuizzes: quizzes[0]?.count || 0,
        activeLicenses: licenses[0]?.count || 0,
        totalUsers: users[0]?.count || 0,
        recentActivities: recentActivities || [],
      });
    } catch (error) {
      console.error('Error loading admin stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  // ✅ Logout handler with confirmation (now works on web too)
  const handleLogout = () => {
    confirmAction(
      'Logout',
      'Are you sure you want to logout?',
      async () => {
        try {
          await logout();
          // Navigation will automatically go to Auth screen
        } catch (error) {
          console.error('Logout error:', error);
          if (Platform.OS === 'web') {
            window.alert('Failed to logout');
          } else {
            Alert.alert('Error', 'Failed to logout');
          }
        }
      },
      'Logout'
    );
  };

  const quickActions: QuickAction[] = [
    {
      id: 'users',
      title: 'Manage Users',
      icon: 'people',
      description: 'Add, edit & manage users',
      color: '#4F46E5',
      bgColor: '#EEF2FF',
      screen: 'ManageUsers',
    },
    {
      id: 'videos',
      title: 'Video Content',
      icon: 'videocam',
      description: 'Upload & manage videos',
      color: '#DC2626',
      bgColor: '#FEF2F2',
      screen: 'ManageVideos',
    },
    {
      id: 'pdfs',
      title: 'PDF Content',
      icon: 'document-text',
      description: 'Upload & manage PDFs',
      color: '#D97706',
      bgColor: '#FFFBEB',
      screen: 'ManagePdfs',
    },
    {
      id: 'quizzes',
      title: 'Quiz Content',
      icon: 'checkbox',
      description: 'Create & manage quizzes',
      color: '#7C3AED',
      bgColor: '#F5F3FF',
      screen: 'ManageQuizzes',
    },
    {
      id: 'classes',
      title: 'Classes',
      icon: 'school',
      description: 'Manage classes & subjects',
      color: '#059669',
      bgColor: '#ECFDF5',
      screen: 'ManageClasses',
    },
    {
      id: 'licenses',
      title: 'Licenses',
      icon: 'key',
      description: 'Manage licenses & access',
      color: '#0891B2',
      bgColor: '#ECFEFF',
      screen: 'ManageLicenses',
    },
    {
      id: 'progress',
      title: 'Progress',
      icon: 'stats-chart',
      description: 'View student progress',
      color: '#DC2626',
      bgColor: '#FEF2F2',
      screen: 'ViewProgress',
    },
  ];

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
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header with Gradient */}
        <View style={styles.headerContainer}>
          <View style={styles.headerOverlay}>
            <View style={styles.headerContent}>
              <View>
                <Text style={styles.greeting}>Good Morning,</Text>
                <Text style={styles.adminName}>{user?.full_name || 'Administrator'}</Text>
                <Text style={styles.adminRole}>System Administrator</Text>
              </View>
              
              {/* ✅ Logout Button in Header */}
              <TouchableOpacity 
                style={styles.logoutButton}
                onPress={handleLogout}
              >
                <Ionicons name="log-out-outline" size={22} color={COLORS.white} />
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#4F46E5' }]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="people" size={20} color="#4F46E5" />
            </View>
            <Text style={styles.statNumber}>{stats.totalUsers}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#059669' }]}>
            <View style={[styles.statIconContainer, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="school" size={20} color="#059669" />
            </View>
            <Text style={styles.statNumber}>{stats.totalClasses}</Text>
            <Text style={styles.statLabel}>Classes</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#D97706' }]}>
            <View style={[styles.statIconContainer, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="book" size={20} color="#D97706" />
            </View>
            <Text style={styles.statNumber}>{stats.totalSubjects}</Text>
            <Text style={styles.statLabel}>Subjects</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#DC2626' }]}>
            <View style={[styles.statIconContainer, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="videocam" size={20} color="#DC2626" />
            </View>
            <Text style={styles.statNumber}>{stats.totalVideos}</Text>
            <Text style={styles.statLabel}>Videos</Text>
          </View>
        </View>

        {/* Content Stats Row */}
        <View style={styles.contentStatsRow}>
          <TouchableOpacity 
            style={styles.contentStatItem}
            onPress={() => navigation.navigate('ManagePdfs')}
          >
            <View style={[styles.contentIconContainer, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="document-text" size={24} color="#D97706" />
            </View>
            <View>
              <Text style={styles.contentStatNumber}>{stats.totalPdfs}</Text>
              <Text style={styles.contentStatLabel}>PDFs</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.contentStatItem}
            onPress={() => navigation.navigate('ManageQuizzes')}
          >
            <View style={[styles.contentIconContainer, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="checkbox" size={24} color="#7C3AED" />
            </View>
            <View>
              <Text style={styles.contentStatNumber}>{stats.totalQuizzes}</Text>
              <Text style={styles.contentStatLabel}>Quizzes</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.contentStatItem}
            onPress={() => navigation.navigate('ManageLicenses')}
          >
            <View style={[styles.contentIconContainer, { backgroundColor: '#CFFAFE' }]}>
              <Ionicons name="key" size={24} color="#0891B2" />
            </View>
            <View>
              <Text style={styles.contentStatNumber}>{stats.activeLicenses}</Text>
              <Text style={styles.contentStatLabel}>Licenses</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[styles.actionCard, { backgroundColor: action.bgColor }]}
                onPress={() => {
                  if (action.params) {
                    navigation.navigate(action.screen as any, action.params);
                  } else {
                    navigation.navigate(action.screen as any);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: action.color + '20' }]}>
                  <Ionicons name={action.icon} size={24} color={action.color} />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>{action.title}</Text>
                  <Text style={styles.actionDescription}>{action.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* User Role Distribution */}
        <View style={styles.roleSection}>
          <Text style={styles.sectionTitle}>User Distribution</Text>
          <View style={styles.roleGrid}>
            <View style={styles.roleItem}>
              <View style={[styles.roleIcon, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="person" size={20} color="#2563EB" />
              </View>
              <Text style={styles.roleCount}>{stats.totalStudents}</Text>
              <Text style={styles.roleLabel}>Students</Text>
            </View>
            <View style={styles.roleItem}>
              <View style={[styles.roleIcon, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="person" size={20} color="#059669" />
              </View>
              <Text style={styles.roleCount}>{stats.totalTeachers}</Text>
              <Text style={styles.roleLabel}>Teachers</Text>
            </View>
            <View style={styles.roleItem}>
              <View style={[styles.roleIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="people" size={20} color="#D97706" />
              </View>
              <Text style={styles.roleCount}>{stats.totalParents}</Text>
              <Text style={styles.roleLabel}>Parents</Text>
            </View>
            <View style={styles.roleItem}>
              <View style={[styles.roleIcon, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="shield" size={20} color="#7C3AED" />
              </View>
              <Text style={styles.roleCount}>{stats.totalAdmins}</Text>
              <Text style={styles.roleLabel}>Admins</Text>
            </View>
          </View>
        </View>

        {/* Logout Button at Bottom */}
        <TouchableOpacity 
          style={styles.bottomLogoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={styles.bottomLogoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
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
  headerContainer: {
    backgroundColor: COLORS.primary,
    paddingBottom: 30,
  },
  headerOverlay: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  adminName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: 2,
  },
  adminRole: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  // ✅ Logout Button in Header
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  logoutText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginTop: -20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 1,
  },
  contentStatsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 14,
    gap: 10,
  },
  contentStatItem: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  contentIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentStatNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  contentStatLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  actionsSection: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  actionsGrid: {
    gap: 10,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionContent: {
    flex: 1,
    marginLeft: 12,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  actionDescription: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  roleSection: {
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 30,
  },
  roleGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  roleItem: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleCount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 6,
  },
  roleLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  // ✅ Bottom Logout Button
  bottomLogoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 20,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  bottomLogoutText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AdminDashboardScreen;
