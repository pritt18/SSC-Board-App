import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { executeQuery } from '../../database/database';
import { AdminStackParamList } from '../../navigation/AdminNavigator';

type Props = NativeStackScreenProps<AdminStackParamList, 'ManageLicenses'>;

interface LicenseItem {
  id: number;
  license_key: string;
  user_name: string;
  user_email: string;
  class_number: number;
  device_id: string;
  activated_at: string;
  expires_at: string;
  is_active: number;
  created_at: string;
}

const ManageLicensesScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [licenses, setLicenses] = useState<LicenseItem[]>([]);

  const loadLicenses = async () => {
    try {
      setLoading(true);

      const items = await executeQuery(
        `SELECT 
          l.id,
          l.license_key,
          u.full_name as user_name,
          u.email as user_email,
          c.class_number,
          l.device_id,
          l.activated_at,
          l.expires_at,
          l.is_active,
          l.created_at
        FROM licenses l
        LEFT JOIN users u ON l.user_id = u.id
        LEFT JOIN classes c ON l.class_id = c.id
        ORDER BY l.id DESC`,
        []
      );

      setLicenses(items as LicenseItem[]);
    } catch (error) {
      console.error('Error loading licenses:', error);
      Alert.alert('Error', 'Failed to load licenses');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadLicenses();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadLicenses();
  };

  const handleToggleActive = async (id: number, currentStatus: number) => {
    try {
      await executeQuery(
        `UPDATE licenses SET is_active = ? WHERE id = ?`,
        [currentStatus ? 0 : 1, id]
      );
      loadLicenses();
      Alert.alert('Success', `License ${currentStatus ? 'deactivated' : 'activated'} successfully`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update license status');
    }
  };

  const handleDeleteLicense = async (id: number, key: string) => {
    Alert.alert(
      'Delete License',
      `Are you sure you want to delete license "${key}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await executeQuery(`DELETE FROM licenses WHERE id = ?`, [id]);
              loadLicenses();
              Alert.alert('Success', 'License deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete license');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading licenses...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Manage Licenses</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {licenses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔑</Text>
            <Text style={styles.emptyTitle}>No Licenses Found</Text>
            <Text style={styles.emptyText}>Licenses will appear here when created</Text>
          </View>
        ) : (
          licenses.map((license) => (
            <View key={license.id} style={styles.licenseCard}>
              <View style={styles.cardHeader}>
                <View style={[styles.statusBadge, license.is_active ? styles.activeBadge : styles.inactiveBadge]}>
                  <Text style={[styles.statusText, license.is_active ? styles.activeText : styles.inactiveText]}>
                    {license.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
                <Text style={styles.classText}>Class {license.class_number}</Text>
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.licenseIcon}>🔑</Text>
                <View style={styles.licenseInfo}>
                  <Text style={styles.licenseKey}>{license.license_key}</Text>
                  {license.user_name && (
                    <>
                      <Text style={styles.userName}>{license.user_name}</Text>
                      <Text style={styles.userEmail}>{license.user_email}</Text>
                    </>
                  )}
                  {license.device_id && (
                    <Text style={styles.deviceText}>Device: {license.device_id}</Text>
                  )}
                  <Text style={styles.licenseDate}>Activated: {formatDate(license.activated_at)}</Text>
                  {license.expires_at && (
                    <Text style={styles.expiresText}>Expires: {formatDate(license.expires_at)}</Text>
                  )}
                </View>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.toggleButton]}
                  onPress={() => handleToggleActive(license.id, license.is_active)}
                >
                  <Text style={styles.toggleButtonText}>
                    {license.is_active ? 'Deactivate' : 'Activate'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeleteLicense(license.id, license.license_key)}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 32,
    color: COLORS.textPrimary,
    marginTop: -4,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginLeft: 10,
  },
  content: {
    padding: 15,
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 50,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 15,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  licenseCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#DCFCE7',
  },
  inactiveBadge: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  activeText: {
    color: COLORS.success,
  },
  inactiveText: {
    color: '#DC2626',
  },
  classText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  licenseIcon: {
    fontSize: 30,
    marginRight: 12,
  },
  licenseInfo: {
    flex: 1,
  },
  licenseKey: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: 'monospace',
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  userEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  deviceText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  licenseDate: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  expiresText: {
    fontSize: 11,
    color: '#DC2626',
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toggleButton: {
    backgroundColor: COLORS.primaryLight,
  },
  toggleButtonText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
  deleteButtonText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default ManageLicensesScreen;