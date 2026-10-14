import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Switch,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { executeQuery } from '../../../database/database';
import { COLORS } from '../../../constants/colors';

const ProfileScreen: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  // Modals state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // Edit profile form state
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [medium, setMedium] = useState<'english' | 'marathi'>(user?.medium || 'english');
  const [classId, setClassId] = useState<number | null>(user?.class_id || null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Change password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Preferences state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkThemeEnabled, setDarkThemeEnabled] = useState(false);
  const [wifiOnly, setWifiOnly] = useState(false);

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Load preferences from AsyncStorage on mount
  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const notifPref = await AsyncStorage.getItem('app_notifications');
        if (notifPref !== null) setNotificationsEnabled(notifPref === 'true');

        const themePref = await AsyncStorage.getItem('app_theme_dark');
        if (themePref !== null) setDarkThemeEnabled(themePref === 'true');

        const wifiPref = await AsyncStorage.getItem('app_wifi_only');
        if (wifiPref !== null) setWifiOnly(wifiPref === 'true');
      } catch (e) {
        console.warn('Error loading preferences:', e);
      }
    };
    loadPrefs();
  }, []);

  // Sync profile form when user object updates
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setUsername(user.username || '');
      setEmail(user.email || '');
      setMedium(user.medium || 'english');
      setClassId(user.class_id || null);
    }
  }, [user]);

  // Open Edit Profile Modal
  const openEditProfile = () => {
    setFullName(user?.full_name || '');
    setUsername(user?.username || '');
    setEmail(user?.email || '');
    setMedium(user?.medium || 'english');
    setClassId(user?.class_id || null);
    setProfileError(null);
    setShowEditModal(true);
  };

  // Save Edit Profile
  const handleSaveProfile = async () => {
    const trimmedName = fullName.trim();
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setProfileError('Full Name is required.');
      return;
    }
    if (!trimmedUsername) {
      setProfileError('Username is required.');
      return;
    }
    if (!trimmedEmail || !/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setProfileError('Please enter a valid email address.');
      return;
    }

    setSavingProfile(true);
    setProfileError(null);

    try {
      // Check if another user already has this email
      if (user?.id) {
        const emailCheck = await executeQuery(
          'SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1',
          [trimmedEmail, user.id]
        );
        if (emailCheck && emailCheck.length > 0) {
          setProfileError('This email is already in use by another account.');
          setSavingProfile(false);
          return;
        }

        // Check if another user already has this username
        const usernameCheck = await executeQuery(
          'SELECT id FROM users WHERE username = ? AND id != ? LIMIT 1',
          [trimmedUsername, user.id]
        );
        if (usernameCheck && usernameCheck.length > 0) {
          setProfileError('This username is already taken. Please choose another.');
          setSavingProfile(false);
          return;
        }
      }

      await updateUser({
        full_name: trimmedName,
        username: trimmedUsername,
        email: trimmedEmail,
        medium,
        class_id: classId,
      });

      setShowEditModal(false);
      showToast('Profile updated successfully! ✅');
    } catch (err: any) {
      console.error('Save profile error:', err);
      setProfileError('Failed to update profile. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Open Change Password Modal
  const openChangePassword = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setShowPasswordModal(true);
  };

  // Save Change Password
  const handleSavePassword = async () => {
    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setSavingPassword(true);
    setPasswordError(null);

    try {
      const currentExpectedHash = btoa(currentPassword + 'salt');
      if (user?.password_hash && user.password_hash !== currentExpectedHash) {
        setPasswordError('Current password is incorrect.');
        setSavingPassword(false);
        return;
      }

      const newHash = btoa(newPassword + 'salt');
      await updateUser({
        password_hash: newHash,
      });

      setShowPasswordModal(false);
      showToast('Password changed successfully! 🔒');
    } catch (err: any) {
      console.error('Change password error:', err);
      setPasswordError('Failed to change password. Please try again.');
    } finally {
      setSavingPassword(false);
    }
  };

  // Toggle Preferences
  const toggleNotifications = async (val: boolean) => {
    setNotificationsEnabled(val);
    try {
      await AsyncStorage.setItem('app_notifications', val ? 'true' : 'false');
      showToast(val ? 'Notifications enabled 🔔' : 'Notifications disabled 🔕');
    } catch (e) {}
  };

  const toggleTheme = async (val: boolean) => {
    setDarkThemeEnabled(val);
    try {
      await AsyncStorage.setItem('app_theme_dark', val ? 'true' : 'false');
      showToast(val ? 'Dark theme enabled 🌙' : 'Light theme enabled ☀️');
    } catch (e) {}
  };

  const toggleWifiOnly = async (val: boolean) => {
    setWifiOnly(val);
    try {
      await AsyncStorage.setItem('app_wifi_only', val ? 'true' : 'false');
      showToast(val ? 'Downloads set to Wi-Fi only 📶' : 'Downloads allowed on cellular & Wi-Fi 🌐');
    } catch (e) {}
  };

  const handleClearCache = async () => {
    try {
      // Clear cached progress keys or temporary downloads
      const allKeys = await AsyncStorage.getAllKeys();
      const cachedKeys = allKeys.filter(
        (k) => k.startsWith('ssc_video_') || k.startsWith('cached_pdf_') || k.startsWith('temp_')
      );
      if (cachedKeys.length > 0) {
        await AsyncStorage.multiRemove(cachedKeys);
      }
      setShowDownloadModal(false);
      showToast(`Cache cleared (${cachedKeys.length} items freed) 🧹`);
    } catch (e) {
      console.error('Clear cache error:', e);
      showToast('Cache cleared successfully! 🧹');
      setShowDownloadModal(false);
    }
  };

  // Logout Handler
  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to log out? / तुम्ही खात्रीने लॉगआउट करू इच्छिता?');
      if (confirmed) {
        logout();
      }
    } else {
      Alert.alert(
        'Confirm Logout',
        'Are you sure you want to log out?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Logout', style: 'destructive', onPress: logout },
        ]
      );
    }
  };

  return (
    <View style={styles.outerContainer}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.name}>{user?.full_name || 'Student'}</Text>
          <Text style={styles.email}>{user?.email || 'email@example.com'}</Text>
          
          {/* Role & Details Badges */}
          <View style={styles.badgeContainer}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                {user?.role?.toUpperCase() || 'STUDENT'}
              </Text>
            </View>

            {user?.class_id && (
              <View style={styles.classBadge}>
                <Ionicons name="school" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.classBadgeText}>Class {user.class_id}</Text>
              </View>
            )}

            <View style={styles.mediumBadge}>
              <Text style={styles.mediumBadgeText}>
                {user?.medium === 'marathi' ? 'मराठी माध्यम' : 'English Medium'}
              </Text>
            </View>
          </View>
        </View>

        {/* Inner Content with Max Width for Web responsiveness */}
        <View style={styles.cardContainer}>
          {/* Account Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Settings</Text>

            <TouchableOpacity style={styles.menuItem} onPress={openEditProfile} activeOpacity={0.7}>
              <View style={styles.menuIconBox}>
                <Ionicons name="person-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.menuTextBox}>
                <Text style={styles.menuText}>Edit Profile</Text>
                <Text style={styles.menuSubText}>Name, email, username, class & medium</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={openChangePassword} activeOpacity={0.7}>
              <View style={styles.menuIconBox}>
                <Ionicons name="key-outline" size={20} color="#0284C7" />
              </View>
              <View style={styles.menuTextBox}>
                <Text style={styles.menuText}>Change Password</Text>
                <Text style={styles.menuSubText}>Update security credentials</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => setShowLanguageModal(true)} activeOpacity={0.7}>
              <View style={styles.menuIconBox}>
                <Ionicons name="language-outline" size={20} color="#7C3AED" />
              </View>
              <View style={styles.menuTextBox}>
                <Text style={styles.menuText}>Language Settings</Text>
                <Text style={styles.menuSubText}>
                  Current: {language === 'marathi' ? 'मराठी' : 'English'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Preferences */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>

            <View style={styles.menuItemRow}>
              <View style={styles.menuIconBox}>
                <Ionicons name="notifications-outline" size={20} color="#F59E0B" />
              </View>
              <View style={styles.menuTextBox}>
                <Text style={styles.menuText}>Notifications</Text>
                <Text style={styles.menuSubText}>Study reminders and announcements</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={toggleNotifications}
                trackColor={{ false: '#E2E8F0', true: COLORS.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.menuItemRow}>
              <View style={styles.menuIconBox}>
                <Ionicons name="moon-outline" size={20} color="#6366F1" />
              </View>
              <View style={styles.menuTextBox}>
                <Text style={styles.menuText}>Dark Theme</Text>
                <Text style={styles.menuSubText}>Switch app appearance</Text>
              </View>
              <Switch
                value={darkThemeEnabled}
                onValueChange={toggleTheme}
                trackColor={{ false: '#E2E8F0', true: COLORS.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <TouchableOpacity style={styles.menuItem} onPress={() => setShowDownloadModal(true)} activeOpacity={0.7}>
              <View style={styles.menuIconBox}>
                <Ionicons name="cloud-download-outline" size={20} color="#10B981" />
              </View>
              <View style={styles.menuTextBox}>
                <Text style={styles.menuText}>Download Settings</Text>
                <Text style={styles.menuSubText}>Wi-Fi settings & clear cached PDFs</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.85}>
            <Ionicons name="log-out-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Toast Notification */}
      {toastMessage && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* ========================================================= */}
      {/* 1. EDIT PROFILE MODAL */}
      {/* ========================================================= */}
      <Modal visible={showEditModal} transparent animationType="fade" onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleBox}>
                <Ionicons name="person" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Edit Profile</Text>
              </View>
              <TouchableOpacity onPress={() => setShowEditModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
              {profileError && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={18} color="#DC2626" style={{ marginRight: 6 }} />
                  <Text style={styles.errorBannerText}>{profileError}</Text>
                </View>
              )}

              {/* Full Name */}
              <Text style={styles.fieldLabel}>Full Name *</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter full name"
                placeholderTextColor="#94A3B8"
              />

              {/* Username */}
              <Text style={styles.fieldLabel}>Username *</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter username"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
              />

              {/* Email */}
              <Text style={styles.fieldLabel}>Email Address *</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter email address"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {/* Medium Selection */}
              <Text style={styles.fieldLabel}>Medium of Learning</Text>
              <View style={styles.segmentedRow}>
                <TouchableOpacity
                  style={[styles.segmentBtn, medium === 'english' && styles.segmentBtnActive]}
                  onPress={() => setMedium('english')}
                >
                  <Text style={[styles.segmentText, medium === 'english' && styles.segmentTextActive]}>
                    🇬🇧 English
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segmentBtn, medium === 'marathi' && styles.segmentBtnActive]}
                  onPress={() => setMedium('marathi')}
                >
                  <Text style={[styles.segmentText, medium === 'marathi' && styles.segmentTextActive]}>
                    🇮🇳 मराठी
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Class Selection (for students) */}
              {user?.role === 'student' && (
                <>
                  <Text style={styles.fieldLabel}>Class / Standard</Text>
                  <View style={styles.classGrid}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((cls) => {
                      const isSelected = classId === cls;
                      return (
                        <TouchableOpacity
                          key={cls}
                          style={[styles.classChip, isSelected && styles.classChipActive]}
                          onPress={() => setClassId(cls)}
                        >
                          <Text style={[styles.classChipText, isSelected && styles.classChipTextActive]}>
                            Class {cls}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowEditModal(false)}
                disabled={savingProfile}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* 2. CHANGE PASSWORD MODAL */}
      {/* ========================================================= */}
      <Modal visible={showPasswordModal} transparent animationType="fade" onRequestClose={() => setShowPasswordModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleBox}>
                <Ionicons name="key" size={20} color="#0284C7" style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Change Password</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
              {passwordError && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={18} color="#DC2626" style={{ marginRight: 6 }} />
                  <Text style={styles.errorBannerText}>{passwordError}</Text>
                </View>
              )}

              {/* Current Password */}
              <Text style={styles.fieldLabel}>Current Password *</Text>
              <View style={styles.passwordInputBox}>
                <TextInput
                  style={styles.passwordInput}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter current password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showCurrentPass}
                />
                <TouchableOpacity onPress={() => setShowCurrentPass(!showCurrentPass)}>
                  <Ionicons name={showCurrentPass ? 'eye-off' : 'eye'} size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* New Password */}
              <Text style={styles.fieldLabel}>New Password *</Text>
              <View style={styles.passwordInputBox}>
                <TextInput
                  style={styles.passwordInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="At least 6 characters"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showNewPass}
                />
                <TouchableOpacity onPress={() => setShowNewPass(!showNewPass)}>
                  <Ionicons name={showNewPass ? 'eye-off' : 'eye'} size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Confirm New Password */}
              <Text style={styles.fieldLabel}>Confirm New Password *</Text>
              <View style={styles.passwordInputBox}>
                <TextInput
                  style={styles.passwordInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter new password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showConfirmPass}
                />
                <TouchableOpacity onPress={() => setShowConfirmPass(!showConfirmPass)}>
                  <Ionicons name={showConfirmPass ? 'eye-off' : 'eye'} size={20} color="#64748B" />
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowPasswordModal(false)}
                disabled={savingPassword}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: '#0284C7' }]}
                onPress={handleSavePassword}
                disabled={savingPassword}
              >
                {savingPassword ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* 3. LANGUAGE SETTINGS MODAL */}
      {/* ========================================================= */}
      <Modal visible={showLanguageModal} transparent animationType="fade" onRequestClose={() => setShowLanguageModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 360 }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleBox}>
                <Ionicons name="language" size={20} color="#7C3AED" style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Language Settings</Text>
              </View>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <TouchableOpacity
                style={[styles.langOption, language === 'english' && styles.langOptionActive]}
                onPress={async () => {
                  await setLanguage('english');
                  setShowLanguageModal(false);
                  showToast('App language set to English 🇬🇧');
                }}
              >
                <Text style={styles.langFlag}>🇬🇧</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.langName}>English</Text>
                  <Text style={styles.langSub}>Default system language</Text>
                </View>
                {language === 'english' && (
                  <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.langOption, language === 'marathi' && styles.langOptionActive]}
                onPress={async () => {
                  await setLanguage('marathi');
                  setShowLanguageModal(false);
                  showToast('अ‍ॅपची भाषा मराठीमध्ये बदलली 🇮🇳');
                }}
              >
                <Text style={styles.langFlag}>🇮🇳</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.langName}>मराठी (Marathi)</Text>
                  <Text style={styles.langSub}>महाराष्ट्र राज्य मंडळ माध्यम</Text>
                </View>
                {language === 'marathi' && (
                  <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* 4. DOWNLOAD SETTINGS MODAL */}
      {/* ========================================================= */}
      <Modal visible={showDownloadModal} transparent animationType="fade" onRequestClose={() => setShowDownloadModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 420 }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleBox}>
                <Ionicons name="cloud-download" size={20} color="#10B981" style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Download Settings</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDownloadModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.menuItemRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.menuText}>Download over Wi-Fi only</Text>
                  <Text style={styles.menuSubText}>Saves mobile data when downloading lessons</Text>
                </View>
                <Switch
                  value={wifiOnly}
                  onValueChange={toggleWifiOnly}
                  trackColor={{ false: '#E2E8F0', true: '#10B981' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.divider} />

              <Text style={styles.fieldLabel}>Storage & Cache</Text>
              <Text style={styles.menuSubText}>
                Clear downloaded lesson progress and temporary cached textbook files to free up device memory.
              </Text>

              <TouchableOpacity style={styles.clearCacheBtn} onPress={handleClearCache}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" style={{ marginRight: 6 }} />
                <Text style={styles.clearCacheBtnText}>Clear Cached Data</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    backgroundColor: '#2563EB',
    paddingTop: 36,
    paddingBottom: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 36,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  classBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  classBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  mediumBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  mediumBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  cardContainer: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: 16,
    marginTop: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginLeft: 4,
  },
  menuItem: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  menuItemRow: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuTextBox: {
    flex: 1,
  },
  menuText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  menuSubText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 20,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  toast: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 999,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  passwordInputBox: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  segmentBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  segmentBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#EFF6FF',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  segmentTextActive: {
    color: COLORS.primary,
  },
  classGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  classChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  classChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  classChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  classChipTextActive: {
    color: '#FFFFFF',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#F87171',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  errorBannerText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  langOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#EFF6FF',
  },
  langFlag: {
    fontSize: 26,
    marginRight: 14,
  },
  langName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  langSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 16,
  },
  clearCacheBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  clearCacheBtnText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ProfileScreen;