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
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, lastLoginError } = useAuth();
  const { t } = useLanguage();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Attempting login...');
      const success = await login(email, password);
      
      if (success) {
        console.log('Login successful!');
        // Navigation will happen automatically via AuthContext
      } else if (lastLoginError === 'This account is already activated on another device.') {
        Alert.alert('Device Not Recognized', lastLoginError + '\n\nPlease contact admin to reset your device.');
      } else {
        Alert.alert('Login Failed', 'Invalid email or password. Please try again.\n\n💡 Demo credentials:\nadmin@sscboard.com / Admin@123');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Login Failed', 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Image
            source={require('../../../assets/images/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.subtitle}>Maharashtra Board Learning</Text>

          <View style={styles.demoInfo}>
            <Text style={styles.demoText}>💡 Demo Credentials:</Text>
            <Text style={styles.demoCreds}>👑 Admin: admin@sscboard.com / Admin@123</Text>
            <Text style={styles.demoCreds}>🎒 Student: student@sscboard.com / Student@123</Text>
            <Text style={styles.demoNote}>Or register a new account below</Text>
          </View>

          <TextInput
            style={styles.input}
            placeholder={t('email') || 'Email'}
            placeholderTextColor="#94A3B8"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder={t('password') || 'Password'}
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color="#64748B"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.button} 
            onPress={handleLogin} 
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>{t('login') || 'Login'}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('Register')} activeOpacity={0.7}>
            <Text style={styles.link}>Don't have an account? Register</Text>
            <Ionicons name="arrow-forward" size={16} color="#007AFF" style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('ForgotPassword')} activeOpacity={0.7}>
            <Text style={styles.link}>Forgot Password?</Text>
            <Ionicons name="arrow-forward" size={16} color="#007AFF" style={{ marginLeft: 6 }} />
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
  logoImage: {
    width: Platform.OS === 'web' ? 270 : 200,
    height: Platform.OS === 'web' ? 180 : 133,
    alignSelf: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
    color: '#64748B',
    fontWeight: '500',
  },
  demoInfo: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  demoText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1D4ED8',
    marginBottom: 6,
  },
  demoCreds: {
    fontSize: 13,
    color: '#334155',
    marginTop: 3,
    fontWeight: '500',
  },
  demoNote: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontSize: 15,
    color: '#0F172A',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    paddingRight: 10,
    fontSize: 15,
    color: '#0F172A',
  },
  eyeButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 12,
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
    marginTop: 10,
    paddingVertical: 4,
  },
  link: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LoginScreen;