// src/screens/admin/UserDetailScreen.tsx

import React, {
  useState,
  useCallback,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import {
  useFocusEffect,
} from '@react-navigation/native';

import { COLORS } from '../../constants/colors';

import {
  executeQuery,
} from '../../database/database';

import {
  AdminStackParamList,
} from '../../navigation/AdminNavigator';

import {
  Ionicons,
} from '@expo/vector-icons';


// ============================================================
// TYPES
// ============================================================

type Props = NativeStackScreenProps<
  AdminStackParamList,
  'UserDetail'
>;

interface UserDetail {
  id: number;

  full_name: string;

  email: string;

  username: string;

  role: string;

  permissions: string;

  medium: string | null;

  class_id: number | null;

  class_name: string | null;

  class_number: number | null;

  is_active: number;

  created_at: string;

  device_id: string | null;
}

interface LinkedChild {
  id: number;

  full_name: string;

  email: string;

  class_number: number | null;
}


// ============================================================
// CONSTANTS
// ============================================================

const ROLES = [
  'admin',
  'teacher',
  'parent',
  'student',
  'distributor',
] as const;

type Role = typeof ROLES[number];

const MEDIUMS = [
  'english',
  'marathi',
] as const;

type Medium = typeof MEDIUMS[number];


// ============================================================
// WEB + NATIVE ALERT HELPERS
// ============================================================

const showMessage = (
  title: string,
  message: string,
) => {
  if (Platform.OS === 'web') {
    window.alert(
      `${title}\n\n${message}`,
    );

    return;
  }

  Alert.alert(
    title,
    message,
  );
};


const confirmAction = (
  title: string,
  message: string,
  onConfirm: () => void | Promise<void>,
  confirmLabel = 'Confirm',
) => {
  if (Platform.OS === 'web') {
    const confirmed =
      window.confirm(
        `${title}\n\n${message}`,
      );

    if (confirmed) {
      void onConfirm();
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
        onPress: () => {
          void onConfirm();
        },
      },
    ],
  );
};


// ============================================================
// SCREEN
// ============================================================

const UserDetailScreen: React.FC<Props> = ({
  navigation,
  route,
}) => {
  const {
    userId,
  } = route.params;


  // ==========================================================
  // STATE
  // ==========================================================

  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    user,
    setUser,
  ] = useState<UserDetail | null>(
    null,
  );


  const [
    linkedChildren,
    setLinkedChildren,
  ] = useState<LinkedChild[]>(
    [],
  );


  const [
    showRoleModal,
    setShowRoleModal,
  ] = useState(false);


  const [
    showMediumModal,
    setShowMediumModal,
  ] = useState(false);


  const [
    savingRole,
    setSavingRole,
  ] = useState(false);


  const [
    savingMedium,
    setSavingMedium,
  ] = useState(false);


  const [
    deleting,
    setDeleting,
  ] = useState(false);


  const [
    resettingDevice,
    setResettingDevice,
  ] = useState(false);


  const [
    stats,
    setStats,
  ] = useState({
    videosWatched: 0,
    quizzesCompleted: 0,
    totalVideos: 0,
    totalQuizzes: 0,
    progress: 0,
  });


  // ==========================================================
  // LOAD USER DATA
  // ==========================================================

  const loadUserData = async () => {
    try {
      setLoading(true);


      // --------------------------------------------------------
      // USER DETAILS
      // --------------------------------------------------------

      const userResult =
        await executeQuery(
          `
          SELECT
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

            c.name_english AS class_name,
            c.class_number

          FROM users u

          LEFT JOIN classes c
            ON u.class_id = c.id

          WHERE u.id = ?

          LIMIT 1
          `,
          [userId],
        );


      if (
        !userResult ||
        userResult.length === 0
      ) {
        showMessage(
          'Error',
          'User not found.',
        );

        navigation.goBack();

        return;
      }


      const currentUser =
        userResult[0] as UserDetail;


      setUser(
        currentUser,
      );


      // --------------------------------------------------------
      // STATISTICS
      // --------------------------------------------------------

      const [
        videosWatched,
        quizzesCompleted,
        totalVideos,
        totalQuizzes,
      ] = await Promise.all([
        executeQuery(
          `
          SELECT COUNT(*) AS count

          FROM video_progress

          WHERE user_id = ?

          AND is_completed = 1
          `,
          [userId],
        ),

        executeQuery(
          `
          SELECT COUNT(*) AS count

          FROM quiz_attempts

          WHERE user_id = ?
          `,
          [userId],
        ),

        executeQuery(
          `
          SELECT COUNT(*) AS count

          FROM videos

          WHERE is_active = 1
          `,
          [],
        ),

        executeQuery(
          `
          SELECT COUNT(*) AS count

          FROM quizzes

          WHERE is_active = 1
          `,
          [],
        ),
      ]);


      const watched =
        Number(
          videosWatched[0]?.count || 0,
        );


      const totalV =
        Number(
          totalVideos[0]?.count || 0,
        );


      const quizzes =
        Number(
          quizzesCompleted[0]?.count || 0,
        );


      const totalQ =
        Number(
          totalQuizzes[0]?.count || 0,
        );


      let progress = 0;


      if (
        totalV > 0 ||
        totalQ > 0
      ) {
        const videoProgress =
          totalV > 0
            ? watched / totalV
            : 0;


        const quizProgress =
          totalQ > 0
            ? quizzes / totalQ
            : 0;


        progress =
          Math.round(
            (
              (
                videoProgress +
                quizProgress
              ) /
              2
            ) *
            100,
          );
      }


      setStats({
        videosWatched: watched,
        quizzesCompleted: quizzes,
        totalVideos: totalV,
        totalQuizzes: totalQ,
        progress,
      });


      // --------------------------------------------------------
      // LINKED CHILDREN
      // --------------------------------------------------------

      if (
        currentUser.role === 'parent'
      ) {
        const children =
          await executeQuery(
            `
            SELECT
              u.id,
              u.full_name,
              u.email,
              c.class_number

            FROM users u

            LEFT JOIN classes c
              ON u.class_id = c.id

            WHERE u.parent_id = ?

            ORDER BY
              u.full_name ASC
            `,
            [userId],
          );


        setLinkedChildren(
          children as LinkedChild[],
        );
      } else {
        setLinkedChildren([]);
      }

    } catch (error: any) {
      console.error(
        'Error loading user details:',
        error,
      );


      showMessage(
        'Error',
        error?.message ||
          'Failed to load user details.',
      );

    } finally {
      setLoading(false);
    }
  };


  // ==========================================================
  // SCREEN FOCUS
  // ==========================================================

  useFocusEffect(
    useCallback(() => {
      void loadUserData();
    }, [userId]),
  );


  // ==========================================================
  // ACTIVATE / DEACTIVATE USER
  // ==========================================================

  const handleToggleActive = () => {
    if (!user) {
      return;
    }


    const nextStatus =
      user.is_active
        ? 0
        : 1;


    const action =
      user.is_active
        ? 'deactivate'
        : 'activate';


    confirmAction(
      user.is_active
        ? 'Deactivate User'
        : 'Activate User',

      `Are you sure you want to ${action} ${user.full_name}?`,

      async () => {
        try {
          await executeQuery(
            `
            UPDATE users

            SET
              is_active = ?,
              updated_at = CURRENT_TIMESTAMP

            WHERE id = ?
            `,
            [
              nextStatus,
              user.id,
            ],
          );


          setUser({
            ...user,
            is_active: nextStatus,
          });


          showMessage(
            'Success',
            `User ${
              user.is_active
                ? 'deactivated'
                : 'activated'
            } successfully.`,
          );

        } catch (error: any) {
          console.error(
            'Update active status error:',
            error,
          );


          showMessage(
            'Error',
            error?.message ||
              'Failed to update user status.',
          );
        }
      },

      'Confirm',
    );
  };


  // ==========================================================
  // CHANGE ROLE
  // ==========================================================

  const handleRoleChange = (
    newRole: Role,
  ) => {
    if (!user) {
      return;
    }


    if (
      newRole === user.role
    ) {
      setShowRoleModal(false);

      return;
    }


    confirmAction(
      'Change Role',

      `Change ${user.full_name}'s role from ${user.role} to ${newRole}?`,

      async () => {
        try {
          setSavingRole(true);


          // ----------------------------------------------------
          // If a parent becomes another role,
          // remove parent relationship from children.
          // ----------------------------------------------------

          if (
            user.role === 'parent' &&
            newRole !== 'parent'
          ) {
            await executeQuery(
              `
              UPDATE users

              SET
                parent_id = NULL,
                updated_at = CURRENT_TIMESTAMP

              WHERE parent_id = ?
              `,
              [user.id],
            );
          }


          // ----------------------------------------------------
          // Update role
          // ----------------------------------------------------

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
            ],
          );


          // ----------------------------------------------------
          // Update local state immediately
          // ----------------------------------------------------

          setUser({
            ...user,
            role: newRole,
          });


          setShowRoleModal(false);


          // Reload complete data
          await loadUserData();


          showMessage(
            'Success',
            `Role changed to ${newRole} successfully.`,
          );

        } catch (error: any) {
          console.error(
            'Change role error:',
            error,
          );


          showMessage(
            'Error',
            error?.message ||
              'Failed to update role.',
          );

        } finally {
          setSavingRole(false);
        }
      },

      'Change',
    );
  };


  // ==========================================================
  // CHANGE MEDIUM
  // ==========================================================

  const handleMediumChange = (
    newMedium: Medium,
  ) => {
    if (!user) {
      return;
    }


    if (
      user.medium === newMedium
    ) {
      setShowMediumModal(false);

      return;
    }


    confirmAction(
      'Change Medium',

      `Set ${user.full_name}'s medium to ${
        newMedium === 'english'
          ? 'English'
          : 'Marathi'
      }?`,

      async () => {
        try {
          setSavingMedium(true);


          await executeQuery(
            `
            UPDATE users

            SET
              medium = ?,
              updated_at = CURRENT_TIMESTAMP

            WHERE id = ?
            `,
            [
              newMedium,
              user.id,
            ],
          );


          setUser({
            ...user,
            medium: newMedium,
          });


          setShowMediumModal(false);


          showMessage(
            'Success',
            `Medium changed to ${
              newMedium === 'english'
                ? 'English'
                : 'Marathi'
            }.`,
          );

        } catch (error: any) {
          console.error(
            'Change medium error:',
            error,
          );


          showMessage(
            'Error',
            error?.message ||
              'Failed to update medium.',
          );

        } finally {
          setSavingMedium(false);
        }
      },

      'Change',
    );
  };


  // ==========================================================
  // RESET DEVICE
  // ==========================================================

  const handleResetDevice = () => {
    if (!user) {
      return;
    }


    if (!user.device_id) {
      showMessage(
        'Device Reset',
        'No device is currently linked with this user.',
      );

      return;
    }


    confirmAction(
      'Reset Device',

      `This will unbind ${user.full_name}'s account from the current device. They will be able to log in on a new device.`,

      async () => {
        try {
          setResettingDevice(true);


          await executeQuery(
            `
            UPDATE users

            SET
              device_id = NULL,
              updated_at = CURRENT_TIMESTAMP

            WHERE id = ?
            `,
            [user.id],
          );


          // ----------------------------------------------------
          // IMPORTANT:
          // Update local state immediately.
          // ----------------------------------------------------

          setUser({
            ...user,
            device_id: null,
          });


          showMessage(
            'Success',
            'Device reset successfully. The user can now log in on a new device.',
          );

        } catch (error: any) {
          console.error(
            'Reset device error:',
            error,
          );


          showMessage(
            'Error',
            error?.message ||
              'Failed to reset device.',
          );

        } finally {
          setResettingDevice(false);
        }
      },

      'Reset Device',
    );
  };


  // ==========================================================
  // DELETE USER
  // ==========================================================

  const handleDeleteUser = () => {
    if (!user) {
      return;
    }


    // ----------------------------------------------------------
    // Do not allow deleting admin account from this screen.
    // This prevents accidental deletion of the main administrator.
    // ----------------------------------------------------------

    if (user.role === 'admin') {
      showMessage(
        'Delete User',
        'The administrator account cannot be deleted from this screen.',
      );

      return;
    }


    confirmAction(
      'Delete User',

      `Are you sure you want to permanently delete ${user.full_name}? This action cannot be undone.`,

      async () => {
        try {
          setDeleting(true);


          const deletingUserId =
            user.id;


          console.log(
            '================================',
          );

          console.log(
            'Starting user deletion:',
            deletingUserId,
          );

          console.log(
            'User:',
            user.full_name,
          );

          console.log(
            '================================',
          );


          // ------------------------------------------------------
          // 1. Remove parent relationship
          // ------------------------------------------------------

          await executeQuery(
            `
            UPDATE users

            SET
              parent_id = NULL,
              updated_at = CURRENT_TIMESTAMP

            WHERE parent_id = ?
            `,
            [deletingUserId],
          );


          // ------------------------------------------------------
          // 2. Delete assignments created by teacher
          //
          // assignments.teacher_id REFERENCES users(id)
          // without ON DELETE CASCADE in current schema.
          // Therefore this must be deleted first.
          // ------------------------------------------------------

          await executeQuery(
            `
            DELETE FROM assignments

            WHERE teacher_id = ?
            `,
            [deletingUserId],
          );


          // ------------------------------------------------------
          // 3. Delete video progress
          //
          // Current schema already has ON DELETE CASCADE,
          // but explicit deletion also handles older databases.
          // ------------------------------------------------------

          await executeQuery(
            `
            DELETE FROM video_progress

            WHERE user_id = ?
            `,
            [deletingUserId],
          );


          // ------------------------------------------------------
          // 4. Delete quiz attempts
          // ------------------------------------------------------

          await executeQuery(
            `
            DELETE FROM quiz_attempts

            WHERE user_id = ?
            `,
            [deletingUserId],
          );


          // ------------------------------------------------------
          // 5. Delete progress
          // ------------------------------------------------------

          await executeQuery(
            `
            DELETE FROM progress

            WHERE user_id = ?
            `,
            [deletingUserId],
          );


          // ------------------------------------------------------
          // 6. Delete bookmarks
          // ------------------------------------------------------

          await executeQuery(
            `
            DELETE FROM bookmarks

            WHERE user_id = ?
            `,
            [deletingUserId],
          );


          // ------------------------------------------------------
          // 7. Delete notifications
          // ------------------------------------------------------

          await executeQuery(
            `
            DELETE FROM notifications

            WHERE user_id = ?
            `,
            [deletingUserId],
          );


          // ------------------------------------------------------
          // 8. Remove license relationship
          //
          // Current schema uses ON DELETE SET NULL,
          // but explicit update is safer for older databases.
          // ------------------------------------------------------

          await executeQuery(
            `
            UPDATE licenses

            SET
              user_id = NULL

            WHERE user_id = ?
            `,
            [deletingUserId],
          );


          // ------------------------------------------------------
          // 9. Finally delete user
          // ------------------------------------------------------

          await executeQuery(
            `
            DELETE FROM users

            WHERE id = ?
            `,
            [deletingUserId],
          );


          // ------------------------------------------------------
          // 10. Verify deletion
          // ------------------------------------------------------

          const verify =
            await executeQuery(
              `
              SELECT id

              FROM users

              WHERE id = ?

              LIMIT 1
              `,
              [deletingUserId],
            );


          if (
            verify.length > 0
          ) {
            throw new Error(
              'User could not be deleted from the database.',
            );
          }


          console.log(
            'User deleted successfully:',
            deletingUserId,
          );


          setUser(null);


          showMessage(
            'Success',
            `${user.full_name} has been deleted successfully.`,
          );


          // ------------------------------------------------------
          // Go back after successful deletion
          // ------------------------------------------------------

          navigation.goBack();

        } catch (error: any) {
          console.error(
            '================================',
          );

          console.error(
            'DELETE USER ERROR:',
            error,
          );

          console.error(
            '================================',
          );


          showMessage(
            'Delete Failed',
            error?.message ||
              'Failed to delete user. Please check the console for details.',
          );

        } finally {
          setDeleting(false);
        }
      },

      'Delete',
    );
  };


  // ==========================================================
  // UNLINK CHILD
  // ==========================================================

  const handleUnlinkChild = (
    child: LinkedChild,
  ) => {
    if (!user) {
      return;
    }


    confirmAction(
      'Unlink Child',

      `Remove ${child.full_name} from ${user.full_name}'s linked children?`,

      async () => {
        try {
          await executeQuery(
            `
            UPDATE users

            SET
              parent_id = NULL,
              updated_at = CURRENT_TIMESTAMP

            WHERE id = ?
            `,
            [child.id],
          );


          await loadUserData();


          showMessage(
            'Success',
            `${child.full_name} has been unlinked.`,
          );

        } catch (error: any) {
          console.error(
            'Unlink child error:',
            error,
          );


          showMessage(
            'Error',
            error?.message ||
              'Failed to unlink child.',
          );
        }
      },

      'Unlink',
    );
  };


  // ==========================================================
  // ROLE COLOR
  // ==========================================================

  const getRoleColor = (
    role: string,
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


  // ==========================================================
  // LOADING
  // ==========================================================

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
          Loading user details...
        </Text>
      </SafeAreaView>
    );
  }


  if (!user) {
    return null;
  }


  // ==========================================================
  // UI
  // ==========================================================

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top']}
    >

      {/* ======================================================
          HEADER
      ====================================================== */}

      <View
        style={styles.header}
      >

        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            navigation.goBack()
          }
          disabled={deleting}
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
          User Details
        </Text>


        <TouchableOpacity
          style={[
            styles.statusToggle,

            user.is_active
              ? styles.activeToggle
              : styles.inactiveToggle,
          ]}
          onPress={
            handleToggleActive
          }
          disabled={deleting}
        >

          <Text
            style={[
              styles.statusToggleText,

              {
                color: user.is_active
                  ? '#166534'
                  : '#991B1B',
              },
            ]}
          >
            {user.is_active
              ? 'Active'
              : 'Inactive'}
          </Text>

        </TouchableOpacity>

      </View>


      {/* ======================================================
          MAIN CONTENT
      ====================================================== */}

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.content
        }
      >

        {/* ====================================================
            PROFILE
        ==================================================== */}

        <View
          style={styles.profileCard}
        >

          <View
            style={styles.profileAvatar}
          >

            <Text
              style={styles.avatarText}
            >
              {user.full_name
                .charAt(0)
                .toUpperCase()}
            </Text>

          </View>


          <View
            style={styles.profileInfo}
          >

            <Text
              style={styles.profileName}
            >
              {user.full_name}
            </Text>


            <View
              style={[
                styles.roleBadge,

                {
                  backgroundColor:
                    getRoleColor(
                      user.role,
                    ) + '20',
                },
              ]}
            >

              <Text
                style={[
                  styles.roleBadgeText,

                  {
                    color:
                      getRoleColor(
                        user.role,
                      ),
                  },
                ]}
              >
                {user.role.toUpperCase()}
              </Text>

            </View>


            <Text
              style={styles.profileEmail}
            >
              {user.email}
            </Text>


            <Text
              style={styles.profileUsername}
            >
              @{user.username}
            </Text>

          </View>

        </View>


        {/* ====================================================
            LEARNING PROGRESS
        ==================================================== */}

        <View
          style={styles.statsSection}
        >

          <Text
            style={styles.sectionTitle}
          >
            Learning Progress
          </Text>


          <View
            style={styles.statsGrid}
          >

            <View
              style={styles.statItem}
            >
              <Text
                style={styles.statNumber}
              >
                {stats.videosWatched}
              </Text>

              <Text
                style={styles.statLabel}
              >
                Videos Watched
              </Text>
            </View>


            <View
              style={styles.statDivider}
            />


            <View
              style={styles.statItem}
            >
              <Text
                style={styles.statNumber}
              >
                {stats.quizzesCompleted}
              </Text>

              <Text
                style={styles.statLabel}
              >
                Quizzes Done
              </Text>
            </View>


            <View
              style={styles.statDivider}
            />


            <View
              style={styles.statItem}
            >
              <Text
                style={styles.statNumber}
              >
                {stats.progress}%
              </Text>

              <Text
                style={styles.statLabel}
              >
                Overall Progress
              </Text>
            </View>

          </View>


          <View
            style={styles.progressBar}
          >

            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(
                    100,
                    Math.max(
                      0,
                      stats.progress,
                    ),
                  )}%`,
                },
              ]}
            />

          </View>

        </View>


        {/* ====================================================
            USER DETAILS
        ==================================================== */}

        <View
          style={styles.detailsSection}
        >

          <Text
            style={styles.sectionTitle}
          >
            User Details
          </Text>


          {/* FULL NAME */}

          <View
            style={styles.detailItem}
          >

            <Ionicons
              name="person-outline"
              size={20}
              color="#64748B"
            />

            <Text
              style={styles.detailLabel}
            >
              Full Name
            </Text>

            <Text
              style={styles.detailValue}
            >
              {user.full_name}
            </Text>

          </View>


          {/* EMAIL */}

          <View
            style={styles.detailItem}
          >

            <Ionicons
              name="mail-outline"
              size={20}
              color="#64748B"
            />

            <Text
              style={styles.detailLabel}
            >
              Email
            </Text>

            <Text
              style={styles.detailValue}
            >
              {user.email}
            </Text>

          </View>


          {/* USERNAME */}

          <View
            style={styles.detailItem}
          >

            <Ionicons
              name="person-outline"
              size={20}
              color="#64748B"
            />

            <Text
              style={styles.detailLabel}
            >
              Username
            </Text>

            <Text
              style={styles.detailValue}
            >
              @{user.username}
            </Text>

          </View>


          {/* PERMISSIONS */}

          <View
            style={styles.detailItem}
          >

            <Ionicons
              name="shield-outline"
              size={20}
              color="#64748B"
            />

            <Text
              style={styles.detailLabel}
            >
              Permissions
            </Text>

            <Text
              style={styles.detailValue}
            >
              {user.permissions ||
                'user'}
            </Text>

          </View>


          {/* ==================================================
              MEDIUM
              NOW SHOWS BOTH ENGLISH + MARATHI OPTIONS
          ================================================== */}

          <TouchableOpacity
            style={[
              styles.detailItem,
              styles.mediumDetailItem,
            ]}
            onPress={() =>
              setShowMediumModal(true)
            }
            disabled={
              savingMedium ||
              deleting
            }
          >

            <Ionicons
              name="language-outline"
              size={20}
              color="#64748B"
            />

            <Text
              style={styles.detailLabel}
            >
              Medium
            </Text>


            <View
              style={styles.mediumPreview}
            >

              <View
                style={[
                  styles.mediumBadge,

                  user.medium ===
                    'english' &&
                    styles.mediumBadgeSelected,
                ]}
              >

                <Text
                  style={[
                    styles.mediumBadgeText,

                    user.medium ===
                      'english' &&
                      styles.mediumBadgeTextSelected,
                  ]}
                >
                  English
                </Text>

              </View>


              <View
                style={[
                  styles.mediumBadge,

                  user.medium ===
                    'marathi' &&
                    styles.mediumBadgeSelected,
                ]}
              >

                <Text
                  style={[
                    styles.mediumBadgeText,

                    user.medium ===
                      'marathi' &&
                      styles.mediumBadgeTextSelected,
                  ]}
                >
                  Marathi
                </Text>

              </View>

            </View>


            <Ionicons
              name="chevron-forward"
              size={18}
              color="#94A3B8"
            />

          </TouchableOpacity>


          {/* CLASS */}

          <View
            style={styles.detailItem}
          >

            <Ionicons
              name="school-outline"
              size={20}
              color="#64748B"
            />

            <Text
              style={styles.detailLabel}
            >
              Class
            </Text>

            <Text
              style={styles.detailValue}
            >
              {user.class_name
                ? `${user.class_name} (${user.class_number})`
                : 'Not assigned'}
            </Text>

          </View>


          {/* DEVICE ID */}

          {user.device_id && (
            <View
              style={styles.detailItem}
            >

              <Ionicons
                name="phone-portrait-outline"
                size={20}
                color="#64748B"
              />

              <Text
                style={styles.detailLabel}
              >
                Device ID
              </Text>

              <Text
                style={styles.detailValue}
                numberOfLines={1}
              >
                {user.device_id}
              </Text>

            </View>
          )}


          {/* JOINED */}

          <View
            style={styles.detailItem}
          >

            <Ionicons
              name="calendar-outline"
              size={20}
              color="#64748B"
            />

            <Text
              style={styles.detailLabel}
            >
              Joined
            </Text>

            <Text
              style={styles.detailValue}
            >
              {new Date(
                user.created_at,
              ).toLocaleDateString(
                'en-US',
                {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                },
              )}
            </Text>

          </View>

        </View>


        {/* ====================================================
            ACTIONS
        ==================================================== */}

        <View
          style={styles.actionsSection}
        >

          <Text
            style={styles.sectionTitle}
          >
            Actions
          </Text>


          {/* ==================================================
              ASSIGN CLASS
              ONLY STUDENT / TEACHER
          ================================================== */}

          {(user.role === 'student' ||
            user.role === 'teacher') && (

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                navigation.navigate(
                  'AssignClass',
                  {
                    studentId: user.id,
                  },
                );
              }}
              disabled={
                deleting
              }
            >

              <Ionicons
                name="school-outline"
                size={20}
                color="#2563EB"
              />

              <Text
                style={[
                  styles.actionButtonText,
                  {
                    color: '#2563EB',
                  },
                ]}
              >
                Assign Class
              </Text>

            </TouchableOpacity>
          )}


          {/* ==================================================
              CHANGE ROLE
              ONLY ONE BUTTON
          ================================================== */}

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              setShowRoleModal(true)
            }
            disabled={
              savingRole ||
              deleting
            }
          >

            <Ionicons
              name="swap-horizontal-outline"
              size={20}
              color="#7C3AED"
            />

            <Text
              style={[
                styles.actionButtonText,
                {
                  color: '#7C3AED',
                },
              ]}
            >
              Change Role
            </Text>

          </TouchableOpacity>


          {/* ==================================================
              RESET DEVICE
          ================================================== */}

          {user.device_id && (

            <TouchableOpacity
              style={styles.actionButton}
              onPress={
                handleResetDevice
              }
              disabled={
                resettingDevice ||
                deleting
              }
            >

              {resettingDevice ? (
                <ActivityIndicator
                  size="small"
                  color="#F59E0B"
                />
              ) : (
                <Ionicons
                  name="phone-portrait-outline"
                  size={20}
                  color="#F59E0B"
                />
              )}


              <Text
                style={[
                  styles.actionButtonText,
                  {
                    color: '#F59E0B',
                  },
                ]}
              >
                {resettingDevice
                  ? 'Resetting Device...'
                  : 'Reset Device'}
              </Text>

            </TouchableOpacity>
          )}


          {/* ==================================================
              DELETE USER
          ================================================== */}

          {user.role !== 'admin' && (

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.deleteAction,
              ]}
              onPress={
                handleDeleteUser
              }
              disabled={
                deleting
              }
            >

              {deleting ? (
                <ActivityIndicator
                  size="small"
                  color="#DC2626"
                />
              ) : (
                <Ionicons
                  name="trash-outline"
                  size={20}
                  color="#DC2626"
                />
              )}


              <Text
                style={[
                  styles.actionButtonText,
                  {
                    color: '#DC2626',
                  },
                ]}
              >
                {deleting
                  ? 'Deleting User...'
                  : 'Delete User'}
              </Text>

            </TouchableOpacity>
          )}

        </View>


        {/* ====================================================
            LINKED CHILDREN
            PARENT ONLY
        ==================================================== */}

        {user.role === 'parent' && (

          <View
            style={styles.actionsSection}
          >

            <View
              style={
                styles.linkedChildrenHeader
              }
            >

              <Text
                style={styles.sectionTitle}
              >
                Linked Children
              </Text>


              <TouchableOpacity
                style={
                  styles.linkChildButton
                }
                onPress={() =>
                  navigation.navigate(
                    'LinkChild',
                    {
                      parentId:
                        user.id,
                    },
                  )
                }
              >

                <Ionicons
                  name="add"
                  size={16}
                  color={COLORS.white}
                />

                <Text
                  style={
                    styles.linkChildButtonText
                  }
                >
                  Link Child
                </Text>

              </TouchableOpacity>

            </View>


            {linkedChildren.length ===
            0 ? (

              <Text
                style={
                  styles.noChildrenText
                }
              >
                No children linked yet.
                Tap "Link Child" to
                connect a student account.
              </Text>

            ) : (

              linkedChildren.map(
                child => (

                  <View
                    key={child.id}
                    style={styles.childRow}
                  >

                    <View
                      style={{
                        flex: 1,
                      }}
                    >

                      <Text
                        style={
                          styles.childName
                        }
                      >
                        {child.full_name}
                      </Text>


                      <Text
                        style={
                          styles.childMeta
                        }
                      >
                        {child.email}

                        {child.class_number
                          ? ` • Class ${child.class_number}`
                          : ''}
                      </Text>

                    </View>


                    <TouchableOpacity
                      onPress={() =>
                        handleUnlinkChild(
                          child,
                        )
                      }
                    >

                      <Text
                        style={
                          styles.unlinkText
                        }
                      >
                        Unlink
                      </Text>

                    </TouchableOpacity>

                  </View>
                ),
              )
            )}

          </View>
        )}

      </ScrollView>


      {/* ======================================================
          ROLE MODAL
      ====================================================== */}

      <Modal
        visible={showRoleModal}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setShowRoleModal(false)
        }
      >

        <View
          style={styles.modalOverlay}
        >

          <View
            style={styles.modalCard}
          >

            <View
              style={styles.modalHeader}
            >

              <Text
                style={styles.modalTitle}
              >
                Change Role
              </Text>


              <TouchableOpacity
                onPress={() =>
                  setShowRoleModal(false)
                }
              >

                <Ionicons
                  name="close"
                  size={24}
                  color="#64748B"
                />

              </TouchableOpacity>

            </View>


            <Text
              style={styles.modalSubtitle}
            >
              Select a new role for{' '}
              {user.full_name}
            </Text>


            {ROLES.map(
              role => {

                const selected =
                  user.role === role;


                return (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.roleOption,

                      selected &&
                        styles.roleOptionSelected,
                    ]}
                    onPress={() =>
                      handleRoleChange(
                        role,
                      )
                    }
                    disabled={
                      savingRole
                    }
                  >

                    <View
                      style={[
                        styles.roleOptionIcon,
                        {
                          backgroundColor:
                            getRoleColor(
                              role,
                            ) + '20',
                        },
                      ]}
                    >

                      <Ionicons
                        name={
                          role ===
                          'admin'
                            ? 'shield-outline'
                            : role ===
                              'teacher'
                            ? 'school-outline'
                            : role ===
                              'parent'
                            ? 'people-outline'
                            : role ===
                              'student'
                            ? 'person-outline'
                            : 'business-outline'
                        }
                        size={20}
                        color={
                          getRoleColor(
                            role,
                          )
                        }
                      />

                    </View>


                    <Text
                      style={[
                        styles.roleOptionText,

                        selected &&
                          styles.roleOptionTextSelected,
                      ]}
                    >
                      {role
                        .charAt(0)
                        .toUpperCase() +
                        role.slice(1)}
                    </Text>


                    {selected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={
                          COLORS.primary
                        }
                      />
                    )}

                  </TouchableOpacity>
                );
              },
            )}


            {savingRole && (
              <View
                style={
                  styles.modalLoading
                }
              >

                <ActivityIndicator
                  size="small"
                  color={
                    COLORS.primary
                  }
                />

                <Text
                  style={
                    styles.modalLoadingText
                  }
                >
                  Updating role...
                </Text>

              </View>
            )}

          </View>

        </View>

      </Modal>


      {/* ======================================================
          MEDIUM MODAL
      ====================================================== */}

      <Modal
        visible={showMediumModal}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setShowMediumModal(false)
        }
      >

        <View
          style={styles.modalOverlay}
        >

          <View
            style={styles.modalCard}
          >

            <View
              style={styles.modalHeader}
            >

              <Text
                style={styles.modalTitle}
              >
                Select Medium
              </Text>


              <TouchableOpacity
                onPress={() =>
                  setShowMediumModal(false)
                }
              >

                <Ionicons
                  name="close"
                  size={24}
                  color="#64748B"
                />

              </TouchableOpacity>

            </View>


            <Text
              style={styles.modalSubtitle}
            >
              Choose the learning medium
            </Text>


            {/* ENGLISH */}

            <TouchableOpacity
              style={[
                styles.mediumOption,

                user.medium ===
                  'english' &&
                  styles.mediumOptionSelected,
              ]}
              onPress={() =>
                handleMediumChange(
                  'english',
                )
              }
              disabled={
                savingMedium
              }
            >

              <View
                style={[
                  styles.mediumOptionIcon,

                  user.medium ===
                    'english' &&
                    styles.mediumOptionIconSelected,
                ]}
              >

                <Ionicons
                  name="language-outline"
                  size={22}
                  color={
                    user.medium ===
                    'english'
                      ? COLORS.white
                      : '#2563EB'
                  }
                />

              </View>


              <View
                style={{
                  flex: 1,
                }}
              >

                <Text
                  style={[
                    styles.mediumOptionTitle,

                    user.medium ===
                      'english' &&
                      styles.mediumOptionTitleSelected,
                  ]}
                >
                  English
                </Text>

                <Text
                  style={
                    styles.mediumOptionSubtitle
                  }
                >
                  English medium
                </Text>

              </View>


              {user.medium ===
                'english' && (
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={
                    COLORS.primary
                  }
                />
              )}

            </TouchableOpacity>


            {/* MARATHI */}

            <TouchableOpacity
              style={[
                styles.mediumOption,

                user.medium ===
                  'marathi' &&
                  styles.mediumOptionSelected,
              ]}
              onPress={() =>
                handleMediumChange(
                  'marathi',
                )
              }
              disabled={
                savingMedium
              }
            >

              <View
                style={[
                  styles.mediumOptionIcon,

                  user.medium ===
                    'marathi' &&
                    styles.mediumOptionIconSelected,
                ]}
              >

                <Ionicons
                  name="language-outline"
                  size={22}
                  color={
                    user.medium ===
                    'marathi'
                      ? COLORS.white
                      : '#D97706'
                  }
                />

              </View>


              <View
                style={{
                  flex: 1,
                }}
              >

                <Text
                  style={[
                    styles.mediumOptionTitle,

                    user.medium ===
                      'marathi' &&
                      styles.mediumOptionTitleSelected,
                  ]}
                >
                  Marathi
                </Text>

                <Text
                  style={
                    styles.mediumOptionSubtitle
                  }
                >
                  Marathi medium
                </Text>

              </View>


              {user.medium ===
                'marathi' && (
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={
                    COLORS.primary
                  }
                />
              )}

            </TouchableOpacity>


            {savingMedium && (
              <View
                style={
                  styles.modalLoading
                }
              >

                <ActivityIndicator
                  size="small"
                  color={
                    COLORS.primary
                  }
                />

                <Text
                  style={
                    styles.modalLoadingText
                  }
                >
                  Updating medium...
                </Text>

              </View>
            )}

          </View>

        </View>

      </Modal>

    </SafeAreaView>
  );
};


// ============================================================
// STYLES
// ============================================================

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


  // ----------------------------------------------------------
  // HEADER
  // ----------------------------------------------------------

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


  // ----------------------------------------------------------
  // CONTENT
  // ----------------------------------------------------------

  content: {
    padding: 16,
    paddingBottom: 40,
  },


  // ----------------------------------------------------------
  // PROFILE
  // ----------------------------------------------------------

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


  // ----------------------------------------------------------
  // STATS
  // ----------------------------------------------------------

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


  // ----------------------------------------------------------
  // DETAILS
  // ----------------------------------------------------------

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


  // ----------------------------------------------------------
  // MEDIUM
  // ----------------------------------------------------------

  mediumDetailItem: {
    minHeight: 48,
  },


  mediumPreview: {
    flex: 1,

    flexDirection: 'row',

    alignItems: 'center',

    gap: 6,
  },


  mediumBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,

    borderRadius: 10,

    backgroundColor: '#F1F5F9',

    borderWidth: 1,
    borderColor: '#E2E8F0',
  },


  mediumBadgeSelected: {
    backgroundColor: '#EEF2FF',

    borderColor: '#4F46E5',
  },


  mediumBadgeText: {
    fontSize: 11,

    fontWeight: '600',

    color: '#64748B',
  },


  mediumBadgeTextSelected: {
    color: '#4F46E5',
  },


  // ----------------------------------------------------------
  // ACTIONS
  // ----------------------------------------------------------

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


  // ----------------------------------------------------------
  // LINKED CHILDREN
  // ----------------------------------------------------------

  linkedChildrenHeader: {
    flexDirection: 'row',

    justifyContent: 'space-between',

    alignItems: 'center',

    marginBottom: 12,
  },


  linkChildButton: {
    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor:
      COLORS.primary,

    paddingHorizontal: 12,
    paddingVertical: 6,

    borderRadius: 16,

    gap: 4,
  },


  linkChildButtonText: {
    color: COLORS.white,

    fontSize: 12,

    fontWeight: '700',
  },


  noChildrenText: {
    color: COLORS.textSecondary,

    fontSize: 13,

    lineHeight: 18,
  },


  childRow: {
    flexDirection: 'row',

    alignItems: 'center',

    paddingVertical: 10,

    borderBottomWidth: 1,

    borderBottomColor: '#F1F5F9',
  },


  childName: {
    fontSize: 14,

    fontWeight: '600',

    color: COLORS.textPrimary,
  },


  childMeta: {
    fontSize: 12,

    color: COLORS.textSecondary,

    marginTop: 2,
  },


  unlinkText: {
    color: '#DC2626',

    fontSize: 13,

    fontWeight: '600',
  },


  // ----------------------------------------------------------
  // MODAL
  // ----------------------------------------------------------

  modalOverlay: {
    flex: 1,

    backgroundColor:
      'rgba(15, 23, 42, 0.45)',

    justifyContent: 'center',

    alignItems: 'center',

    padding: 20,
  },


  modalCard: {
    width: '100%',

    maxWidth: 480,

    backgroundColor: COLORS.white,

    borderRadius: 18,

    padding: 20,

    elevation: 8,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 4,
    },

    shadowOpacity: 0.15,

    shadowRadius: 10,
  },


  modalHeader: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    marginBottom: 8,
  },


  modalTitle: {
    fontSize: 20,

    fontWeight: '700',

    color: '#0F172A',
  },


  modalSubtitle: {
    fontSize: 13,

    color: '#64748B',

    marginBottom: 16,
  },


  // ----------------------------------------------------------
  // ROLE OPTIONS
  // ----------------------------------------------------------

  roleOption: {
    flexDirection: 'row',

    alignItems: 'center',

    padding: 12,

    borderRadius: 12,

    borderWidth: 1,

    borderColor: '#E2E8F0',

    marginBottom: 8,
  },


  roleOptionSelected: {
    borderColor: COLORS.primary,

    backgroundColor: '#EEF2FF',
  },


  roleOptionIcon: {
    width: 40,
    height: 40,

    borderRadius: 20,

    alignItems: 'center',
    justifyContent: 'center',
  },


  roleOptionText: {
    flex: 1,

    marginLeft: 12,

    fontSize: 15,

    fontWeight: '600',

    color: '#334155',
  },


  roleOptionTextSelected: {
    color: '#4F46E5',
  },


  // ----------------------------------------------------------
  // MEDIUM OPTIONS
  // ----------------------------------------------------------

  mediumOption: {
    flexDirection: 'row',

    alignItems: 'center',

    padding: 14,

    borderRadius: 14,

    borderWidth: 1,

    borderColor: '#E2E8F0',

    marginBottom: 10,
  },


  mediumOptionSelected: {
    backgroundColor: '#EEF2FF',

    borderColor: COLORS.primary,
  },


  mediumOptionIcon: {
    width: 44,
    height: 44,

    borderRadius: 22,

    backgroundColor: '#F1F5F9',

    alignItems: 'center',
    justifyContent: 'center',
  },


  mediumOptionIconSelected: {
    backgroundColor: COLORS.primary,
  },


  mediumOptionTitle: {
    fontSize: 16,

    fontWeight: '700',

    color: '#334155',

    marginLeft: 12,
  },


  mediumOptionTitleSelected: {
    color: '#4F46E5',
  },


  mediumOptionSubtitle: {
    fontSize: 12,

    color: '#64748B',

    marginLeft: 12,

    marginTop: 2,
  },


  // ----------------------------------------------------------
  // MODAL LOADING
  // ----------------------------------------------------------

  modalLoading: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    paddingTop: 8,
  },


  modalLoadingText: {
    marginLeft: 8,

    fontSize: 13,

    color: '#64748B',
  },
});


export default UserDetailScreen;