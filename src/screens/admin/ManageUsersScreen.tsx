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
  Platform,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS } from '../../constants/colors';
import { executeQuery } from '../../database/database';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<
  AdminStackParamList,
  'ManageUsers'
>;

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

interface ClassItem {
  id: number;
  name: string;
}

const ROLES = [
  'admin',
  'teacher',
  'parent',
  'student',
  'distributor',
];

/*
|--------------------------------------------------------------------------
| Web + Native confirmation helper
|--------------------------------------------------------------------------
| Alert.alert() with multiple buttons is not reliable on React Native Web.
| On web we use browser window.confirm().
| On Android/iOS we continue using Alert.alert().
*/
const confirmAction = (
  title: string,
  message: string,
  onConfirm: () => void,
  confirmLabel: string = 'Confirm'
) => {
  if (Platform.OS === 'web') {
    const confirmed = window.confirm(
      `${title}\n\n${message}`
    );

    if (confirmed) {
      onConfirm();
    }

    return;
  }

  Alert.alert(
    title,
    message,
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: confirmLabel,
        style: 'destructive',
        onPress: onConfirm,
      },
    ]
  );
};

const ManageUsersScreen: React.FC<Props> = ({
  navigation,
}) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [users, setUsers] = useState<UserItem[]>([]);
  const [filteredUsers, setFilteredUsers] =
    useState<UserItem[]>([]);

  const [searchQuery, setSearchQuery] =
    useState('');

  const [showAddModal, setShowAddModal] =
    useState(false);

  const [showFilterModal, setShowFilterModal] =
    useState(false);

  const [filterRole, setFilterRole] =
    useState<string>('all');

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    role: 'student',
    class_id: '',
  });

  const [classes, setClasses] =
    useState<ClassItem[]>([]);

  // -----------------------------------------------------------------------
  // LOAD USERS
  // -----------------------------------------------------------------------

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
          c.name_english AS class_name
        FROM users u
        LEFT JOIN classes c
          ON u.class_id = c.id
      `;

      const params: any[] = [];

      if (filterRole !== 'all') {
        query += ` WHERE u.role = ?`;
        params.push(filterRole);
      }

      query += `
        ORDER BY u.created_at DESC
      `;

      console.log(
        'Executing users query:',
        query,
        params
      );

      const userData = await executeQuery(
        query,
        params
      );

      console.log(
        'Users loaded:',
        userData.length
      );

      const loadedUsers =
        userData as UserItem[];

      setUsers(loadedUsers);

      // Apply current search after loading users
      if (searchQuery.trim() === '') {
        setFilteredUsers(loadedUsers);
      } else {
        const search =
          searchQuery.toLowerCase().trim();

        const filtered = loadedUsers.filter(
          (user) =>
            user.full_name
              .toLowerCase()
              .includes(search) ||
            user.email
              .toLowerCase()
              .includes(search) ||
            user.username
              .toLowerCase()
              .includes(search)
        );

        setFilteredUsers(filtered);
      }
    } catch (error) {
      console.error(
        'Error loading users:',
        error
      );

      if (Platform.OS === 'web') {
        window.alert(
          'Failed to load users.'
        );
      } else {
        Alert.alert(
          'Error',
          'Failed to load users'
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // -----------------------------------------------------------------------
  // LOAD CLASSES
  // -----------------------------------------------------------------------

  const loadClasses = async () => {
    try {
      const classData =
        await executeQuery(
          `
          SELECT
            id,
            name_english AS name
          FROM classes
          WHERE is_active = 1
          ORDER BY class_number ASC
          `,
          []
        );

      setClasses(
        classData as ClassItem[]
      );
    } catch (error) {
      console.error(
        'Error loading classes:',
        error
      );
    }
  };

  // -----------------------------------------------------------------------
  // SCREEN FOCUS
  // -----------------------------------------------------------------------

  useFocusEffect(
    useCallback(() => {
      loadUsers();
      loadClasses();
    }, [filterRole])
  );

  // -----------------------------------------------------------------------
  // REFRESH
  // -----------------------------------------------------------------------

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  // -----------------------------------------------------------------------
  // SEARCH
  // -----------------------------------------------------------------------

  const handleSearch = (
    text: string
  ) => {
    setSearchQuery(text);

    if (text.trim() === '') {
      setFilteredUsers(users);
      return;
    }

    const search =
      text.toLowerCase().trim();

    const filtered = users.filter(
      (user) =>
        user.full_name
          .toLowerCase()
          .includes(search) ||
        user.email
          .toLowerCase()
          .includes(search) ||
        user.username
          .toLowerCase()
          .includes(search)
    );

    setFilteredUsers(filtered);
  };

  // -----------------------------------------------------------------------
  // ADD USER
  // -----------------------------------------------------------------------

  const handleAddUser = async () => {
    if (
      !formData.username.trim() ||
      !formData.email.trim() ||
      !formData.password ||
      !formData.full_name.trim()
    ) {
      if (Platform.OS === 'web') {
        window.alert(
          'Please fill all required fields.'
        );
      } else {
        Alert.alert(
          'Error',
          'Please fill all required fields'
        );
      }

      return;
    }

    if (formData.password.length < 6) {
      if (Platform.OS === 'web') {
        window.alert(
          'Password must be at least 6 characters.'
        );
      } else {
        Alert.alert(
          'Error',
          'Password must be at least 6 characters'
        );
      }

      return;
    }

    try {
      /*
       * Simple hash for current project/demo.
       * Replace with proper password hashing for production.
       */
      const hashedPassword = btoa(
        formData.password + 'salt'
      );

      console.log(
        'Adding user:',
        formData.username
      );

      await executeQuery(
        `
        INSERT INTO users (
          username,
          email,
          password_hash,
          full_name,
          role,
          class_id,
          is_active,
          is_approved
        )
        VALUES (?, ?, ?, ?, ?, ?, 1, 1)
        `,
        [
          formData.username.trim(),
          formData.email.trim(),
          hashedPassword,
          formData.full_name.trim(),
          formData.role,
          formData.class_id
            ? parseInt(
                formData.class_id,
                10
              )
            : null,
        ]
      );

      console.log(
        'User added successfully'
      );

      setShowAddModal(false);

      setFormData({
        username: '',
        email: '',
        password: '',
        full_name: '',
        role: 'student',
        class_id: '',
      });

      await loadUsers();

      if (Platform.OS === 'web') {
        window.alert(
          'User added successfully.'
        );
      } else {
        Alert.alert(
          'Success',
          'User added successfully'
        );
      }
    } catch (error) {
      console.error(
        'Error adding user:',
        error
      );

      let message =
        'Failed to add user.';

      if (
        error instanceof Error
      ) {
        message =
          error.message ||
          message;
      }

      if (Platform.OS === 'web') {
        window.alert(
          `Failed to add user.\n\n${message}`
        );
      } else {
        Alert.alert(
          'Error',
          message
        );
      }
    }
  };

  // -----------------------------------------------------------------------
  // ACTIVATE / DEACTIVATE USER
  // -----------------------------------------------------------------------

  const handleToggleActive = async (
    user: UserItem
  ) => {
    const isCurrentlyActive =
      Number(user.is_active) === 1;

    const newStatus =
      isCurrentlyActive ? 0 : 1;

    const action =
      isCurrentlyActive
        ? 'deactivate'
        : 'activate';

    const actionTitle =
      isCurrentlyActive
        ? 'Deactivate User'
        : 'Activate User';

    const updateUserStatus =
      async () => {
        try {
          console.log(
            `Updating user ${user.id} status:`,
            newStatus
          );

          const result =
            await executeQuery(
              `
              UPDATE users
              SET
                is_active = ?,
                updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
              `,
              [
                newStatus,
                user.id,
              ]
            );

          console.log(
            'User status update result:',
            result
          );

          await loadUsers();

          const successMessage =
            `User ${newStatus === 1 ? 'activated' : 'deactivated'} successfully.`;

          if (Platform.OS === 'web') {
            window.alert(
              successMessage
            );
          } else {
            Alert.alert(
              'Success',
              successMessage
            );
          }
        } catch (error) {
          console.error(
            'Error updating user status:',
            error
          );

          let message =
            `Failed to ${action} user.`;

          if (
            error instanceof Error
          ) {
            message =
              error.message ||
              message;
          }

          if (Platform.OS === 'web') {
            window.alert(
              `${message}`
            );
          } else {
            Alert.alert(
              'Error',
              message
            );
          }
        }
      };

    confirmAction(
      actionTitle,
      `Are you sure you want to ${action} ${user.full_name}?`,
      updateUserStatus,
      isCurrentlyActive
        ? 'Deactivate'
        : 'Activate'
    );
  };

  // -----------------------------------------------------------------------
  // CHANGE ROLE
  // -----------------------------------------------------------------------

  const handleChangeRole = async (
    user: UserItem,
    newRole: string
  ) => {
    if (
      !newRole ||
      user.role === newRole
    ) {
      return;
    }

    const updateRole =
      async () => {
        try {
          console.log(
            `Changing user ${user.id} role: ${user.role} -> ${newRole}`
          );

          const result =
            await executeQuery(
              `
              UPDATE users
              SET
                role = ?,
                updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
              `,
              [
                newRole,
                user.id,
              ]
            );

          console.log(
            'Role update result:',
            result
          );

          await loadUsers();

          if (Platform.OS === 'web') {
            window.alert(
              `${user.full_name}'s role changed to ${newRole}.`
            );
          } else {
            Alert.alert(
              'Success',
              `Role changed to ${newRole} successfully`
            );
          }
        } catch (error) {
          console.error(
            'Error changing role:',
            error
          );

          let message =
            'Failed to change role.';

          if (
            error instanceof Error
          ) {
            message =
              error.message ||
              message;
          }

          if (Platform.OS === 'web') {
            window.alert(
              `${message}`
            );
          } else {
            Alert.alert(
              'Error',
              message
            );
          }
        }
      };

    confirmAction(
      'Change Role',
      `Change ${user.full_name}'s role from "${user.role}" to "${newRole}"?`,
      updateRole,
      'Change Role'
    );
  };

  // -----------------------------------------------------------------------
  // ROLE COLOR
  // -----------------------------------------------------------------------

  const getRoleColor = (
    role: string
  ) => {
    switch (role) {
      case 'admin':
        return '#DC2626';

      case 'teacher':
        return '#2563EB';

      case 'student':
        return '#16A34A';

      case 'parent':
        return '#D97706';

      case 'distributor':
        return '#7C3AED';

      default:
        return '#6B7280';
    }
  };

  // -----------------------------------------------------------------------
  // ROLE BADGE STYLE
  // -----------------------------------------------------------------------

  const getRoleBadgeStyle = (
    role: string
  ) => {
    switch (role) {
      case 'admin':
        return styles.adminBadge;

      case 'teacher':
        return styles.teacherBadge;

      case 'student':
        return styles.studentBadge;

      case 'parent':
        return styles.parentBadge;

      case 'distributor':
        return styles.distributorBadge;

      default:
        return styles.defaultBadge;
    }
  };

  // -----------------------------------------------------------------------
  // LOADING
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <SafeAreaView
        style={styles.loadingContainer}
      >
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />

        <Text
          style={styles.loadingText}
        >
          Loading users...
        </Text>
      </SafeAreaView>
    );
  }

  // -----------------------------------------------------------------------
  // UI
  // -----------------------------------------------------------------------

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top']}
    >
      {/* ================================================================ */}
      {/* HEADER */}
      {/* ================================================================ */}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            navigation.goBack()
          }
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={COLORS.textPrimary}
          />
        </TouchableOpacity>

        <Text
          style={styles.headerTitle}
        >
          Manage Users
        </Text>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() =>
            setShowAddModal(true)
          }
        >
          <Ionicons
            name="add"
            size={24}
            color={COLORS.white}
          />
        </TouchableOpacity>
      </View>

      {/* ================================================================ */}
      {/* SEARCH + FILTER */}
      {/* ================================================================ */}

      <View
        style={styles.searchContainer}
      >
        <View
          style={styles.searchBar}
        >
          <Ionicons
            name="search"
            size={20}
            color="#94A3B8"
          />

          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            value={searchQuery}
            onChangeText={
              handleSearch
            }
            placeholderTextColor="#94A3B8"
          />

          {searchQuery ? (
            <TouchableOpacity
              onPress={() =>
                handleSearch('')
              }
            >
              <Ionicons
                name="close-circle"
                size={20}
                color="#94A3B8"
              />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() =>
            setShowFilterModal(true)
          }
        >
          <Ionicons
            name="filter"
            size={20}
            color={COLORS.primary}
          />
        </TouchableOpacity>
      </View>

      {/* ================================================================ */}
      {/* USER LIST */}
      {/* ================================================================ */}

      <ScrollView
        style={styles.content}
        contentContainerStyle={
          styles.contentContainer
        }
        showsVerticalScrollIndicator
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        {filteredUsers.length === 0 ? (
          <View
            style={styles.emptyContainer}
          >
            <Ionicons
              name="people-outline"
              size={64}
              color="#CBD5E1"
            />

            <Text
              style={styles.emptyTitle}
            >
              No Users Found
            </Text>

            <Text
              style={styles.emptyText}
            >
              {searchQuery
                ? 'Try a different search'
                : 'Add your first user'}
            </Text>

            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() =>
                setShowAddModal(true)
              }
            >
              <Text
                style={styles.emptyButtonText}
              >
                Add User
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredUsers.map(
            (user) => (
              <View
                key={user.id}
                style={styles.userCard}
              >
                {/* ==================================================== */}
                {/* USER INFO */}
                {/* ==================================================== */}

                <TouchableOpacity
                  style={
                    styles.userCardContent
                  }
                  onPress={() =>
                    navigation.navigate(
                      'UserDetail',
                      {
                        userId:
                          user.id,
                      }
                    )
                  }
                  activeOpacity={0.7}
                >
                  <View
                    style={
                      styles.userAvatar
                    }
                  >
                    <Text
                      style={
                        styles.userAvatarText
                      }
                    >
                      {user.full_name
                        .charAt(0)
                        .toUpperCase()}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.userInfo
                    }
                  >
                    <View
                      style={
                        styles.userNameRow
                      }
                    >
                      <Text
                        style={
                          styles.userName
                        }
                        numberOfLines={1}
                      >
                        {user.full_name}
                      </Text>

                      <View
                        style={[
                          styles.roleBadge,
                          getRoleBadgeStyle(
                            user.role
                          ),
                        ]}
                      >
                        <Text
                          style={
                            styles.roleText
                          }
                        >
                          {user.role.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={
                        styles.userEmail
                      }
                      numberOfLines={1}
                    >
                      {user.email}
                    </Text>

                    <View
                      style={
                        styles.userMeta
                      }
                    >
                      <Text
                        style={
                          styles.userMetaText
                        }
                      >
                        @{user.username}
                      </Text>

                      {user.class_name ? (
                        <>
                          <Text
                            style={
                              styles.userMetaDot
                            }
                          >
                            •
                          </Text>

                          <Text
                            style={
                              styles.userMetaText
                            }
                          >
                            {user.class_name}
                          </Text>
                        </>
                      ) : null}
                    </View>
                  </View>

                  {/* ACTIVE / INACTIVE DOT */}

                  <View
                    style={[
                      styles.statusDot,
                      Number(
                        user.is_active
                      ) === 1
                        ? styles.activeDot
                        : styles.inactiveDot,
                    ]}
                  />
                </TouchableOpacity>

                {/* ==================================================== */}
                {/* ACTION BUTTONS */}
                {/* ==================================================== */}

                <View
                  style={
                    styles.userActions
                  }
                >
                  {/* CHANGE ROLE */}

                  <TouchableOpacity
                    style={
                      styles.actionButton
                    }
                    onPress={() => {
                      const currentIndex =
                        ROLES.indexOf(
                          user.role
                        );

                      const nextRole =
                        ROLES[
                          (
                            currentIndex +
                            1
                          ) %
                            ROLES.length
                        ];

                      handleChangeRole(
                        user,
                        nextRole
                      );
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="swap-horizontal"
                      size={16}
                      color="#2563EB"
                    />

                    <Text
                      style={
                        styles.actionButtonText
                      }
                    >
                      Change Role
                    </Text>
                  </TouchableOpacity>

                  {/* ACTIVATE / DEACTIVATE */}

                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      Number(
                        user.is_active
                      ) === 1
                        ? styles.deactivateButton
                        : styles.activateButton,
                    ]}
                    onPress={() =>
                      handleToggleActive(
                        user
                      )
                    }
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={
                        Number(
                          user.is_active
                        ) === 1
                          ? 'close-circle'
                          : 'checkmark-circle'
                      }
                      size={16}
                      color={
                        Number(
                          user.is_active
                        ) === 1
                          ? '#DC2626'
                          : '#16A34A'
                      }
                    />

                    <Text
                      style={[
                        styles.actionButtonText,
                        {
                          color:
                            Number(
                              user.is_active
                            ) === 1
                              ? '#DC2626'
                              : '#16A34A',
                        },
                      ]}
                    >
                      {Number(
                        user.is_active
                      ) === 1
                        ? 'Deactivate'
                        : 'Activate'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          )
        )}
      </ScrollView>

      {/* ================================================================ */}
      {/* ADD USER MODAL */}
      {/* ================================================================ */}

      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() =>
          setShowAddModal(false)
        }
      >
        <View
          style={styles.modalOverlay}
        >
          <View
            style={styles.modalContent}
          >
            {/* MODAL HEADER */}

            <View
              style={styles.modalHeader}
            >
              <Text
                style={styles.modalTitle}
              >
                Add New User
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setShowAddModal(false)
                }
              >
                <Ionicons
                  name="close"
                  size={24}
                  color="#64748B"
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={
                false
              }
              keyboardShouldPersistTaps="handled"
            >
              {/* FULL NAME */}

              <View
                style={styles.formGroup}
              >
                <Text
                  style={styles.label}
                >
                  Full Name *
                </Text>

                <TextInput
                  style={styles.input}
                  value={
                    formData.full_name
                  }
                  onChangeText={(
                    text
                  ) =>
                    setFormData({
                      ...formData,
                      full_name:
                        text,
                    })
                  }
                  placeholder="Enter full name"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* USERNAME */}

              <View
                style={styles.formGroup}
              >
                <Text
                  style={styles.label}
                >
                  Username *
                </Text>

                <TextInput
                  style={styles.input}
                  value={
                    formData.username
                  }
                  onChangeText={(
                    text
                  ) =>
                    setFormData({
                      ...formData,
                      username:
                        text,
                    })
                  }
                  placeholder="Enter username"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                />
              </View>

              {/* EMAIL */}

              <View
                style={styles.formGroup}
              >
                <Text
                  style={styles.label}
                >
                  Email *
                </Text>

                <TextInput
                  style={styles.input}
                  value={
                    formData.email
                  }
                  onChangeText={(
                    text
                  ) =>
                    setFormData({
                      ...formData,
                      email:
                        text,
                    })
                  }
                  placeholder="Enter email"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              {/* PASSWORD */}

              <View
                style={styles.formGroup}
              >
                <Text
                  style={styles.label}
                >
                  Password *
                </Text>

                <TextInput
                  style={styles.input}
                  value={
                    formData.password
                  }
                  onChangeText={(
                    text
                  ) =>
                    setFormData({
                      ...formData,
                      password:
                        text,
                    })
                  }
                  placeholder="Min 6 characters"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry
                />
              </View>

              {/* ROLE */}

              <View
                style={styles.formGroup}
              >
                <Text
                  style={styles.label}
                >
                  Role
                </Text>

                <View
                  style={
                    styles.radioGroup
                  }
                >
                  {ROLES.map(
                    (role) => (
                      <TouchableOpacity
                        key={role}
                        style={[
                          styles.radioOption,
                          formData.role ===
                            role &&
                            styles.radioOptionSelected,
                        ]}
                        onPress={() =>
                          setFormData({
                            ...formData,
                            role,
                          })
                        }
                      >
                        <Text
                          style={[
                            styles.radioOptionText,
                            formData.role ===
                              role &&
                              styles.radioOptionTextSelected,
                          ]}
                        >
                          {role
                            .charAt(
                              0
                            )
                            .toUpperCase() +
                            role.slice(
                              1
                            )}
                        </Text>
                      </TouchableOpacity>
                    )
                  )}
                </View>
              </View>

              {/* CLASS */}

              <View
                style={styles.formGroup}
              >
                <Text
                  style={styles.label}
                >
                  Class (Optional)
                </Text>

                {classes.length ===
                0 ? (
                  <Text
                    style={
                      styles.noClassesText
                    }
                  >
                    No active classes
                    available.
                  </Text>
                ) : (
                  <View
                    style={
                      styles.classPicker
                    }
                  >
                    {classes.map(
                      (cls) => (
                        <TouchableOpacity
                          key={
                            cls.id
                          }
                          style={[
                            styles.classOption,
                            formData.class_id ===
                              String(
                                cls.id
                              ) &&
                              styles.classOptionSelected,
                          ]}
                          onPress={() =>
                            setFormData(
                              {
                                ...formData,
                                class_id:
                                  String(
                                    cls.id
                                  ),
                              }
                            )
                          }
                        >
                          <Text
                            style={[
                              styles.classOptionText,
                              formData.class_id ===
                                String(
                                  cls.id
                                ) &&
                                styles.classOptionTextSelected,
                            ]}
                          >
                            {
                              cls.name
                            }
                          </Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                )}
              </View>

              {/* ADD BUTTON */}

              <TouchableOpacity
                style={
                  styles.submitButton
                }
                onPress={
                  handleAddUser
                }
                activeOpacity={0.8}
              >
                <Text
                  style={
                    styles.submitButtonText
                  }
                >
                  Add User
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================================================================ */}
      {/* FILTER MODAL */}
      {/* ================================================================ */}

      <Modal
        visible={
          showFilterModal
        }
        animationType="fade"
        transparent
        onRequestClose={() =>
          setShowFilterModal(
            false
          )
        }
      >
        <TouchableOpacity
          style={
            styles.filterModalOverlay
          }
          activeOpacity={1}
          onPress={() =>
            setShowFilterModal(
              false
            )
          }
        >
          <View
            style={
              styles.filterModalContent
            }
            onStartShouldSetResponder={() =>
              true
            }
          >
            <Text
              style={
                styles.filterModalTitle
              }
            >
              Filter by Role
            </Text>

            {/* ALL */}

            <TouchableOpacity
              style={[
                styles.filterOption,
                filterRole ===
                  'all' &&
                  styles.filterOptionSelected,
              ]}
              onPress={() => {
                setFilterRole(
                  'all'
                );
                setShowFilterModal(
                  false
                );
              }}
            >
              <Text
                style={[
                  styles.filterOptionText,
                  filterRole ===
                    'all' &&
                    styles.filterOptionTextSelected,
                ]}
              >
                All Users
              </Text>
            </TouchableOpacity>

            {/* ROLES */}

            {ROLES.map(
              (role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.filterOption,
                    filterRole ===
                      role &&
                      styles.filterOptionSelected,
                  ]}
                  onPress={() => {
                    setFilterRole(
                      role
                    );
                    setShowFilterModal(
                      false
                    );
                  }}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      filterRole ===
                        role &&
                        styles.filterOptionTextSelected,
                    ]}
                  >
                    {role
                      .charAt(
                        0
                      )
                      .toUpperCase() +
                      role.slice(
                        1
                      ) +
                      's'}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

// ============================================================================
// STYLES
// ============================================================================

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
    fontSize: 14,
  },

  // -------------------------------------------------------------------------
  // HEADER
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // SEARCH
  // -------------------------------------------------------------------------

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
    outlineStyle: 'none' as any,
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

  // -------------------------------------------------------------------------
  // CONTENT
  // -------------------------------------------------------------------------

  content: {
    flex: 1,
    paddingHorizontal: 16,
  },

  contentContainer: {
    paddingBottom: 30,
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
    fontSize: 14,
    fontWeight: '600',
  },

  // -------------------------------------------------------------------------
  // USER CARD
  // -------------------------------------------------------------------------

  userCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },

  userCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    minHeight: 82,
  },

  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  userAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },

  userInfo: {
    flex: 1,
    minWidth: 0,
  },

  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 4,
  },

  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
  },

  userEmail: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 3,
  },

  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  userMetaText: {
    fontSize: 11,
    color: '#94A3B8',
  },

  userMetaDot: {
    fontSize: 11,
    color: '#94A3B8',
    marginHorizontal: 5,
  },

  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginLeft: 10,
  },

  activeDot: {
    backgroundColor: '#16A34A',
  },

  inactiveDot: {
    backgroundColor: '#DC2626',
  },

  // -------------------------------------------------------------------------
  // ROLE BADGES
  // -------------------------------------------------------------------------

  roleBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },

  roleText: {
    fontSize: 9,
    fontWeight: '700',
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
    backgroundColor: '#F1F5F9',
  },

  // -------------------------------------------------------------------------
  // ACTIONS
  // -------------------------------------------------------------------------

  userActions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 2,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },

  actionButton: {
    flex: 1,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    gap: 6,
  },

  actionButtonText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '600',
  },

  deactivateButton: {
    backgroundColor: '#FEE2E2',
  },

  activateButton: {
    backgroundColor: '#DCFCE7',
  },

  // -------------------------------------------------------------------------
  // ADD USER MODAL
  // -------------------------------------------------------------------------

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
    maxHeight: '92%',
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
    paddingVertical: 7,
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
    paddingVertical: 7,
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

  noClassesText: {
    fontSize: 12,
    color: '#94A3B8',
    paddingVertical: 8,
  },

  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 10,
  },

  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },

  // -------------------------------------------------------------------------
  // FILTER MODAL
  // -------------------------------------------------------------------------

  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  filterModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 420,
  },

  filterModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },

  filterOption: {
    paddingVertical: 11,
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