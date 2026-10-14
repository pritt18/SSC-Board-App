import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';

const ForgotPasswordScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useLanguage();

  const handleReset = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      Alert.alert(
        'Password Reset',
        'If an account exists with this email, you will receive reset instructions.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error) {
      Alert.alert('Error', 'Could not process request');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Back to Login"
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#007AFF" />
            <Text style={styles.backButtonText}>Back to Login</Text>
          </TouchableOpacity>

          <Image
            source={require('../../../assets/images/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>Enter your email to receive reset instructions</Text>

          <TextInput
            style={styles.input}
            placeholder={t('email') || 'Email'}
            placeholderTextColor="#94A3B8"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TouchableOpacity 
            style={styles.button} 
            onPress={handleReset} 
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Send Reset Instructions</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.linkRow} 
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={16} color="#007AFF" style={{ marginRight: 6 }} />
            <Text style={styles.link}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 32 : 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: Platform.OS === 'web' ? 36 : 22,
    maxWidth: 480,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
        } as any)
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 4,
        }),
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 16,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  backButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  logoImage: {
    width: Platform.OS === 'web' ? 260 : 190,
    height: Platform.OS === 'web' ? 173 : 127,
    alignSelf: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    color: '#64748B',
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontSize: 15,
    color: '#0F172A',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 4px 6px -1px rgba(0, 122, 255, 0.25)',
        } as any)
      : {
          elevation: 2,
        }),
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    paddingVertical: 6,
  },
  link: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ForgotPasswordScreen;