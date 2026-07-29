// src/screens/admin/UserDetailScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { executeQuery } from '../../database/database';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<AdminStackParamList, 'UserDetail'>;

interface UserDetail {
  id: number;
  full_name: string;
  email: string;
  username: string;
  role: string;
  permissions: string;
  medium: string;
  class_id: number | null;
  class_name: string | null;
  class_number: number | null;
  is_active: number;
  created_at: string;
  device_id: string | null;
}

const UserDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { userId } = route.params;
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserDetail | null>(null);
  const [stats, setStats] = useState({
    videosWatched: 0,
    quizzesCompleted: 0,
    totalVideos: 0,
    totalQuizzes: 0,
    progress: 0,
  });

  const loadUserData = async () => {
    try {
      setLoading(true);

      // Load user details
      const userResult = await executeQuery(
        `SELECT 
          u.id,
          u.full_name,
          u.email,
          u.username,
          u.role,
          u.permissions,
          u.medium,
          u.class_id,
          u.is_active,
          u.created_at,
          u.device_id,
          c.name_english as class_name,
          c.class_number
        FROM users u
        LEFT JOIN classes c ON u.class_id = c.id
        WHERE u.id = ?`,
        [userId]
      );

      if (userResult.length === 0) {
        Alert.alert('Error', 'User not found');
        navigation.goBack();
        return;
      }

      setUser(userResult[0] as UserDetail);

      // Load user statistics
      const [videosWatched, quizzesCompleted, totalVideos, totalQuizzes] = await Promise.all([
        executeQuery(
          'SELECT COUNT(*) as count FROM video_progress WHERE user_id = ? AND is_completed = 1',
          [userId]
        ),
        executeQuery(
          'SELECT COUNT(*) as count FROM quiz_attempts WHERE user_id = ?',
          [userId]
        ),
        executeQuery('SELECT COUNT(*) as count FROM videos WHERE is_active = 1', []),
        executeQuery('SELECT COUNT(*) as count FROM quizzes WHERE is_active = 1', []),
      ]);

      const watched = videosWatched[0]?.count || 0;
      const totalV = totalVideos[0]?.count || 1;
      const quizzes = quizzesCompleted[0]?.count || 0;
      const totalQ = totalQuizzes[0]?.count || 1;

      const progress = Math.round(((watched / totalV) + (quizzes / totalQ)) / 2 * 100);

      setStats({
        videosWatched: watched,
        quizzesCompleted: quizzes,
        totalVideos: totalV,
        totalQuizzes: totalQ,
        progress,
      });

    } catch (error) {
      console.error('Error loading user details:', error);
      Alert.alert('Error', 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [userId])
  );

  const handleToggleActive = async () => {
    if (!user) return;

    Alert.alert(
      `${user.is_active ? 'Deactivate' : 'Activate'} User`,
      `Are you sure you want to ${user.is_active ? 'deactivate' : 'activate'} ${user.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: user.is_active ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await executeQuery(
                `UPDATE users SET is_active = ? WHERE id = ?`,
                [user.is_active ? 0 : 1, user.id]
              );
              loadUserData();
              Alert.alert('Success', `User ${user.is_active ? 'deactivated' : 'activated'}`);
            } catch (error) {
              Alert.alert('Error', 'Failed to update user status');
            }
          },
        },
      ]
    );
  };

  const handleRoleChange = async (newRole: string) => {
    if (!user) return;

    Alert.alert(
      'Change Role',
      `Change ${user.full_name}'s role to ${newRole}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await executeQuery(
                `UPDATE users SET role = ? WHERE id = ?`,
                [newRole, user.id]
              );
              loadUserData();
              Alert.alert('Success', 'Role updated successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to update role');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading user details...</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return null;
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return '#DC2626';
      case 'teacher': return '#2563EB';
      case 'student': return '#16A34A';
      case 'parent': return '#D97706';
      default: return '#6B7280';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Details</Text>
        <TouchableOpacity 
          style={[styles.statusToggle, user.is_active ? styles.activeToggle : styles.inactiveToggle]}
          onPress={handleToggleActive}
        >
          <Text style={styles.statusToggleText}>
            {user.is_active ? 'Active' : 'Inactive'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Profile Section */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.avatarText}>
              {user.full_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user.full_name}</Text>
            <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) + '20' }]}>
              <Text style={[styles.roleBadgeText, { color: getRoleColor(user.role) }]}>
                {user.role.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.profileEmail}>{user.email}</Text>
            <Text style={styles.profileUsername}>@{user.username}</Text>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Learning Progress</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.videosWatched}</Text>
              <Text style={styles.statLabel}>Videos Watched</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.quizzesCompleted}</Text>
              <Text style={styles.statLabel}>Quizzes Done</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.progress}%</Text>
              <Text style={styles.statLabel}>Overall Progress</Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${stats.progress}%` }]} />
          </View>
        </View>

        {/* Details Section */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>User Details</Text>
          
          <View style={styles.detailItem}>
            <Ionicons name="person-outline" size={20} color="#64748B" />
            <Text style={styles.detailLabel}>Full Name</Text>
            <Text style={styles.detailValue}>{user.full_name}</Text>
          </View>

          <View style={styles.detailItem}>
            <Ionicons name="mail-outline" size={20} color="#64748B" />
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue}>{user.email}</Text>
          </View>

          <View style={styles.detailItem}>
            <Ionicons name="person-outline" size={20} color="#64748B" />
            <Text style={styles.detailLabel}>Username</Text>
            <Text style={styles.detailValue}>@{user.username}</Text>
          </View>

          <View style={styles.detailItem}>
            <Ionicons name="shield-outline" size={20} color="#64748B" />
            <Text style={styles.detailLabel}>Permissions</Text>
            <Text style={styles.detailValue}>{user.permissions || 'user'}</Text>
          </View>

          <View style={styles.detailItem}>
            <Ionicons name="language-outline" size={20} color="#64748B" />
            <Text style={styles.detailLabel}>Medium</Text>
            <Text style={styles.detailValue}>{user.medium || 'Not set'}</Text>
          </View>

          <View style={styles.detailItem}>
            <Ionicons name="school-outline" size={20} color="#64748B" />
            <Text style={styles.detailLabel}>Class</Text>
            <Text style={styles.detailValue}>
              {user.class_name ? `${user.class_name} (${user.class_number})` : 'Not assigned'}
            </Text>
          </View>

          {user.device_id && (
            <View style={styles.detailItem}>
              <Ionicons name="phone-portrait-outline" size={20} color="#64748B" />
              <Text style={styles.detailLabel}>Device ID</Text>
              <Text style={styles.detailValue} numberOfLines={1}>{user.device_id}</Text>
            </View>
          )}

          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={20} color="#64748B" />
            <Text style={styles.detailLabel}>Joined</Text>
            <Text style={styles.detailValue}>
              {new Date(user.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
        </View>

        {/* Actions Section */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              if (user.role === 'student') {
                navigation.navigate('AssignClass', { studentId: user.id });
              } else {
                Alert.alert('Info', 'Class assignment is only available for students');
              }
            }}
          >
            <Ionicons name="school-outline" size={20} color="#2563EB" />
            <Text style={[styles.actionButtonText, { color: '#2563EB' }]}>
              {user.role === 'student' ? 'Assign Class' : 'Change Role'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              const roles = ['admin', 'teacher', 'parent', 'student', 'distributor'];
              const currentIndex = roles.indexOf(user.role);
              const nextRole = roles[(currentIndex + 1) % roles.length];
              handleRoleChange(nextRole);
            }}
          >
            <Ionicons name="swap-horizontal-outline" size={20} color="#7C3AED" />
            <Text style={[styles.actionButtonText, { color: '#7C3AED' }]}>
              Change Role
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteAction]}
            onPress={() => {
              Alert.alert(
                'Delete User',
                `Are you sure you want to delete ${user.full_name}? This action cannot be undone.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await executeQuery(`DELETE FROM users WHERE id = ?`, [user.id]);
                        Alert.alert('Success', 'User deleted successfully');
                        navigation.goBack();
                      } catch (error) {
                        Alert.alert('Error', 'Failed to delete user');
                      }
                    },
                  },
                ]
              );
            }}
          >
            <Ionicons name="trash-outline" size={20} color="#DC2626" />
            <Text style={[styles.actionButtonText, { color: '#DC2626' }]}>
              Delete User
            </Text>
          </TouchableOpacity>
        </View>
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
  statusToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  activeToggle: {
    backgroundColor: '#DCFCE7',
  },
  inactiveToggle: {
    backgroundColor: '#FEE2E2',
  },
  statusToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4F46E5',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  profileEmail: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  profileUsername: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 1,
  },
  statsSection: {
    marginTop: 16,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4F46E5',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E2E8F0',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 3,
  },
  detailsSection: {
    marginTop: 16,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748B',
    marginLeft: 12,
    width: 100,
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
  },
  actionsSection: {
    marginTop: 16,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 12,
  },
  deleteAction: {
    borderBottomWidth: 0,
  },
});

export default UserDetailScreen;