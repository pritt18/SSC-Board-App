// src/screens/admin/ManageUsersScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS } from '../../constants/colors';
import { executeQuery } from '../../database/database';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<AdminStackParamList, 'ManageUsers'>;

interface UserItem {
  id: number;
  full_name: string;
  email: string;
  username: string;
  role: string;
  class_id: number | null;
  class_name: string | null;
  is_active: number;
  created_at: string;
}

const ROLES = ['admin', 'teacher', 'parent', 'student', 'distributor'];

const ManageUsersScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    role: 'student',
    class_id: '',
  });
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);

  const loadUsers = async () => {
    try {
      setLoading(true);

      let query = `
        SELECT 
          u.id,
          u.full_name,
          u.email,
          u.username,
          u.role,
          u.class_id,
          u.is_active,
          u.created_at,
          c.name_english as class_name
        FROM users u
        LEFT JOIN classes c ON u.class_id = c.id
      `;
      
      const params: any[] = [];
      
      if (filterRole !== 'all') {
        query += ' WHERE u.role = ?';
        params.push(filterRole);
      }
      
      query += ' ORDER BY u.created_at DESC';

      const userData = await executeQuery(query, params);
      setUsers(userData as UserItem[]);
      setFilteredUsers(userData as UserItem[]);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
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
      loadUsers();
      loadClasses();
    }, [filterRole])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(
        (user) =>
          user.full_name.toLowerCase().includes(text.toLowerCase()) ||
          user.email.toLowerCase().includes(text.toLowerCase()) ||
          user.username.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  };

  const handleAddUser = async () => {
    if (!formData.username || !formData.email || !formData.password || !formData.full_name) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    try {
      // Simple hash for demo - use proper hashing in production
      const hashedPassword = btoa(formData.password + 'salt');
      
      await executeQuery(
        `INSERT INTO users (
          username, email, password_hash, full_name, 
          role, class_id, is_active, is_approved
        ) VALUES (?, ?, ?, ?, ?, ?, 1, 1)`,
        [
          formData.username,
          formData.email,
          hashedPassword,
          formData.full_name,
          formData.role,
          formData.class_id ? parseInt(formData.class_id) : null,
        ]
      );

      Alert.alert('Success', 'User added successfully');
      setShowAddModal(false);
      setFormData({
        username: '',
        email: '',
        password: '',
        full_name: '',
        role: 'student',
        class_id: '',
      });
      loadUsers();
    } catch (error) {
      console.error('Error adding user:', error);
      Alert.alert('Error', 'Failed to add user');
    }
  };

  const handleToggleActive = async (user: UserItem) => {
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
              loadUsers();
              Alert.alert('Success', `User ${user.is_active ? 'deactivated' : 'activated'}`);
            } catch (error) {
              Alert.alert('Error', 'Failed to update user');
            }
          },
        },
      ]
    );
  };

  const handleChangeRole = async (user: UserItem, newRole: string) => {
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
              loadUsers();
              Alert.alert('Success', 'Role updated successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to update role');
            }
          },
        },
      ]
    );
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return '#DC2626';
      case 'teacher': return '#2563EB';
      case 'student': return '#16A34A';
      case 'parent': return '#D97706';
      case 'distributor': return '#7C3AED';
      default: return '#6B7280';
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'admin': return styles.adminBadge;
      case 'teacher': return styles.teacherBadge;
      case 'student': return styles.studentBadge;
      case 'parent': return styles.parentBadge;
      case 'distributor': return styles.distributorBadge;
      default: return styles.defaultBadge;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading users...</Text>
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
        <Text style={styles.headerTitle}>Manage Users</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Search & Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
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
        </TouchableOpacity>
      </View>

      {/* User List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredUsers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Users Found</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Try a different search' : 'Add your first user'}
            </Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => setShowAddModal(true)}
            >
              <Text style={styles.emptyButtonText}>Add User</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredUsers.map((user) => (
            <View key={user.id} style={styles.userCard}>
              <TouchableOpacity
                style={styles.userCardContent}
                onPress={() => navigation.navigate('UserDetail', { userId: user.id })}
                activeOpacity={0.7}
              >
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>
                    {user.full_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <View style={styles.userNameRow}>
                    <Text style={styles.userName}>{user.full_name}</Text>
                    <View style={[styles.roleBadge, getRoleBadgeStyle(user.role)]}>
                      <Text style={styles.roleText}>{user.role}</Text>
                    </View>
                  </View>
                  <Text style={styles.userEmail}>{user.email}</Text>
                  <View style={styles.userMeta}>
                    <Text style={styles.userMetaText}>@{user.username}</Text>
                    {user.class_name && (
                      <>
                        <Text style={styles.userMetaDot}>•</Text>
                        <Text style={styles.userMetaText}>{user.class_name}</Text>
                      </>
                    )}
                  </View>
                </View>
                <View style={[styles.statusDot, user.is_active ? styles.activeDot : styles.inactiveDot]} />
              </TouchableOpacity>
              
              <View style={styles.userActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    const currentIndex = ROLES.indexOf(user.role);
                    const nextRole = ROLES[(currentIndex + 1) % ROLES.length];
                    handleChangeRole(user, nextRole);
                  }}
                >
                  <Ionicons name="swap-horizontal" size={16} color="#2563EB" />
                  <Text style={styles.actionButtonText}>Change Role</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, user.is_active ? styles.deactivateButton : styles.activateButton]}
                  onPress={() => handleToggleActive(user)}
                >
                  <Ionicons 
                    name={user.is_active ? 'close-circle' : 'checkmark-circle'} 
                    size={16} 
                    color={user.is_active ? '#DC2626' : '#16A34A'} 
                  />
                  <Text style={[styles.actionButtonText, { color: user.is_active ? '#DC2626' : '#16A34A' }]}>
                    {user.is_active ? 'Deactivate' : 'Activate'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add User Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New User</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.full_name}
                  onChangeText={(text) => setFormData({ ...formData, full_name: text })}
                  placeholder="Enter full name"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Username *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.username}
                  onChangeText={(text) => setFormData({ ...formData, username: text })}
                  placeholder="Enter username"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  placeholder="Enter email"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Password *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.password}
                  onChangeText={(text) => setFormData({ ...formData, password: text })}
                  placeholder="Min 6 characters"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Role</Text>
                <View style={styles.radioGroup}>
                  {ROLES.map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.radioOption,
                        formData.role === role && styles.radioOptionSelected,
                      ]}
                      onPress={() => setFormData({ ...formData, role })}
                    >
                      <Text
                        style={[
                          styles.radioOptionText,
                          formData.role === role && styles.radioOptionTextSelected,
                        ]}
                      >
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Class (Optional)</Text>
                <View style={styles.classPicker}>
                  {classes.map((cls) => (
                    <TouchableOpacity
                      key={cls.id}
                      style={[
                        styles.classOption,
                        formData.class_id === String(cls.id) && styles.classOptionSelected,
                      ]}
                      onPress={() => setFormData({ ...formData, class_id: String(cls.id) })}
                    >
                      <Text
                        style={[
                          styles.classOptionText,
                          formData.class_id === String(cls.id) && styles.classOptionTextSelected,
                        ]}
                      >
                        {cls.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleAddUser}>
                <Text style={styles.submitButtonText}>Add User</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
            <Text style={styles.filterModalTitle}>Filter by Role</Text>
            <TouchableOpacity
              style={[styles.filterOption, filterRole === 'all' && styles.filterOptionSelected]}
              onPress={() => {
                setFilterRole('all');
                setShowFilterModal(false);
              }}
            >
              <Text style={[styles.filterOptionText, filterRole === 'all' && styles.filterOptionTextSelected]}>
                All Users
              </Text>
            </TouchableOpacity>
            {ROLES.map((role) => (
              <TouchableOpacity
                key={role}
                style={[styles.filterOption, filterRole === role && styles.filterOptionSelected]}
                onPress={() => {
                  setFilterRole(role);
                  setShowFilterModal(false);
                }}
              >
                <Text style={[styles.filterOptionText, filterRole === role && styles.filterOptionTextSelected]}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}s
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
  },
  content: {
    flex: 1,
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
  userCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  userCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4F46E5',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  adminBadge: {
    backgroundColor: '#FEE2E2',
  },
  teacherBadge: {
    backgroundColor: '#DBEAFE',
  },
  studentBadge: {
    backgroundColor: '#DCFCE7',
  },
  parentBadge: {
    backgroundColor: '#FEF3C7',
  },
  distributorBadge: {
    backgroundColor: '#EDE9FE',
  },
  defaultBadge: {
    backgroundColor: '#F3F4F6',
  },
  roleText: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  userEmail: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 1,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 2,
  },
  userMetaText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  userMetaDot: {
    fontSize: 11,
    color: '#94A3B8',
    marginHorizontal: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    backgroundColor: '#16A34A',
  },
  inactiveDot: {
    backgroundColor: '#DC2626',
  },
  userActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    flex: 1,
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '500',
  },
  deactivateButton: {
    backgroundColor: '#FEE2E2',
  },
  activateButton: {
    backgroundColor: '#DCFCE7',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  radioOption: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  radioOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#EEF2FF',
  },
  radioOptionText: {
    fontSize: 12,
    color: '#64748B',
  },
  radioOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  classPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  classOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  classOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#EEF2FF',
  },
  classOptionText: {
    fontSize: 12,
    color: '#64748B',
  },
  classOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
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

export default ManageUsersScreen;