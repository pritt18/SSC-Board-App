import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Alert,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { LicenseService } from '../../services/licenseService';
import { secureContentManager } from '../../utils/secureContentManager';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { COLORS } from '../../constants/colors';

interface Props {
  onActivated?: () => void;
  classId?: number;
  navigation?: any;
  route?: { params?: { classId?: number } };
}

const LicenseActivationScreen: React.FC<Props> = ({
  onActivated,
  classId: propClassId,
  navigation,
  route,
}) => {
  const [licenseKey, setLicenseKey] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const classId = propClassId || route?.params?.classId || user?.class_id || 10;

  useEffect(() => {
    let isMounted = true;
    const fetchDeviceId = async () => {
      try {
        const id = await LicenseService.getDeviceId();
        if (isMounted) setDeviceId(id);
      } catch (e) {
        console.warn('Error loading device ID:', e);
      }
    };
    fetchDeviceId();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCopyDeviceId = async () => {
    if (!deviceId) return;
    const success = await secureContentManager.copyToClipboard(deviceId);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } else {
      Alert.alert('Device ID', deviceId);
    }
  };

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      Alert.alert('Error', 'Please enter a valid activation code.');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'Please login first.');
      return;
    }

    setIsLoading(true);
    try {
      const cleanKey = licenseKey.trim().toUpperCase();
      const success = await LicenseService.activateLicense(
        cleanKey,
        user.id,
        classId
      );

      if (success) {
        Alert.alert('Success 🎉', `License activated successfully for Class ${classId}! Content is unlocked offline.`);
        if (onActivated) {
          onActivated();
        } else if (navigation) {
          navigation.replace('SubjectList', { classId });
        }
      } else {
        Alert.alert(
          'Activation Failed',
          'Invalid activation code or code does not match this device/class.\n\nPlease ensure you provided your Device ID to your distributor.'
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to activate license. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {navigation?.canGoBack && navigation.canGoBack() && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          )}

          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name="shield-checkmark" size={38} color={COLORS.primary} />
              </View>
            </View>

            <Text style={styles.title}>Activate Class {classId}</Text>
            <Text style={styles.subtitle}>
              Offline DRM Protected Learning Pack. Enter your hardware activation code to unlock full course content.
            </Text>

            {/* Hardware Device ID Card */}
            <View style={styles.deviceCard}>
              <View style={styles.deviceCardHeader}>
                <Ionicons name="hardware-chip-outline" size={18} color="#475569" style={{ marginRight: 6 }} />
                <Text style={styles.deviceCardTitle}>Your Hardware Device ID</Text>
              </View>
              <Text style={styles.deviceCardSubtext}>
                Share this ID with your school or distributor to receive your unique activation code:
              </Text>
              <View style={styles.deviceCodeRow}>
                <Text style={styles.deviceCodeText} numberOfLines={1} ellipsizeMode="middle">
                  {deviceId || 'Loading hardware ID...'}
                </Text>
                <TouchableOpacity
                  style={[styles.copyButton, copied && styles.copyButtonActive]}
                  onPress={handleCopyDeviceId}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={copied ? 'checkmark-circle' : 'copy-outline'}
                    size={16}
                    color={copied ? '#10B981' : '#2563EB'}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.copyButtonText, copied && styles.copyButtonTextActive]}>
                    {copied ? 'Copied' : 'Copy ID'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Activation Code Input */}
            <Input
              label="Activation Code"
              placeholder="e.g. CL10-XXXX-XXXX-XXXX"
              value={licenseKey}
              onChangeText={(txt) => setLicenseKey(txt.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              style={styles.input}
            />

            <Button
              title={isLoading ? 'Activating Offline Pack...' : 'Activate Content'}
              onPress={handleActivate}
              disabled={isLoading || !licenseKey.trim()}
              loading={isLoading}
            />

            {navigation?.canGoBack && navigation.canGoBack() && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.cancelButtonText}>Go Back</Text>
              </TouchableOpacity>
            )}

            <View style={styles.offlineNoticeBox}>
              <Ionicons name="lock-closed" size={14} color="#64748B" style={{ marginRight: 6 }} />
              <Text style={styles.note}>
                100% Offline Secure DRM. No internet connection required to activate or study.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  backButton: {
    paddingTop: 12,
    alignSelf: 'flex-start',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E7FF',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 14,
    marginTop: 8,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  deviceCard: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 14,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deviceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  deviceCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  deviceCardSubtext: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 10,
  },
  deviceCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  deviceCodeText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
    color: '#1E293B',
    marginRight: 8,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  copyButtonActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  copyButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  copyButtonTextActive: {
    color: '#10B981',
  },
  input: {
    marginBottom: 20,
  },
  cancelButton: {
    marginTop: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  offlineNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingHorizontal: 16,
  },
  note: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 16,
  },
});

export default LicenseActivationScreen;