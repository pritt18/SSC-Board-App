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
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const RegisterScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const { t, language } = useLanguage();
  const [medium, setMedium] = useState<'english' | 'marathi'>(language);

  const handleRegister = async () => {
    if (!username || !email || !password || !fullName) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Attempting registration...');
      const success = await register({
        username,
        email,
        password,
        full_name: fullName,
        role: 'student',
        medium,
      });
      
      if (success) {
        console.log('Registration successful!');
        Alert.alert('Success', 'Account created successfully!');
        // Navigation will happen automatically via AuthContext
      } else {
        Alert.alert('Registration Failed', 'Email or username already exists. Please try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Registration Failed', 'Could not create account. Please try again.');
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
          <Text style={styles.subtitle}>Join SSC Board Learning</Text>

          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor="#94A3B8"
            value={fullName}
            onChangeText={setFullName}
          />

          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#94A3B8"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

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
              placeholder={t('password') || 'Password (min 6 chars)'}
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

          <Text style={styles.mediumLabel}>Select Medium</Text>
          <View style={styles.mediumRow}>
            <TouchableOpacity
              style={[styles.mediumChip, medium === 'english' && styles.mediumChipSelected]}
              onPress={() => setMedium('english')}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="book-outline" 
                size={16} 
                color={medium === 'english' ? '#007AFF' : '#64748B'} 
                style={{ marginRight: 6 }} 
              />
              <Text style={[styles.mediumChipText, medium === 'english' && styles.mediumChipTextSelected]}>
                English
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.mediumChip, medium === 'marathi' && styles.mediumChipSelected]}
              onPress={() => setMedium('marathi')}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="book-outline" 
                size={16} 
                color={medium === 'marathi' ? '#007AFF' : '#64748B'} 
                style={{ marginRight: 6 }} 
              />
              <Text style={[styles.mediumChipText, medium === 'marathi' && styles.mediumChipTextSelected]}>
                Marathi
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.button} 
            onPress={handleRegister} 
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Register</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.linkRow} 
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.7}
          >
            <Text style={styles.link}>Already have an account? Login</Text>
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
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
    color: '#64748B',
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 14,
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
    marginBottom: 14,
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
  mediumLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    marginTop: 2,
  },
  mediumRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  mediumChip: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  mediumChipSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#EFF6FF',
  },
  mediumChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  mediumChipTextSelected: {
    color: '#007AFF',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 14,
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

export default RegisterScreen;