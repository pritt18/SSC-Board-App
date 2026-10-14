import React, { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { LicenseService } from '../../services/licenseService';
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
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const classId = propClassId || route?.params?.classId || user?.class_id || 1;

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
      const success = await LicenseService.activateLicense(
        licenseKey.trim().toUpperCase(),
        user.id,
        classId
      );

      if (success) {
        Alert.alert('Success', 'License activated successfully!');
        if (onActivated) {
          onActivated();
        } else if (navigation) {
          navigation.replace('SubjectList', { classId });
        }
      } else {
        Alert.alert('Error', 'Invalid or already used activation code.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to activate license. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
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
          <Text style={styles.icon}>🔐</Text>
        </View>

        <Text style={styles.title}>Activate Your Learning</Text>
        <Text style={styles.subtitle}>
          Enter your activation code to unlock your purchased class content.
        </Text>

        <Input
          label="Activation Code"
          placeholder="XXXX-XXXX-XXXX-XXXX"
          value={licenseKey}
          onChangeText={setLicenseKey}
          autoCapitalize="characters"
          style={styles.input}
        />

        <Button
          title={isLoading ? 'Activating...' : 'Activate'}
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

        <Text style={styles.note}>
          Your license will be securely stored on this device for offline access.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backButton: {
    paddingHorizontal: 16,
    paddingTop: 12,
    alignSelf: 'flex-start',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 55,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 12,
    marginBottom: 35,
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
  note: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 25,
  },
});

export default LicenseActivationScreen;