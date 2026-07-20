import React, { useState } from 'react';

import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

import { COLORS } from '../../constants/colors';

interface Props {
  onRegister: () => void;
  onLoginSuccess: () => void;
}

const LoginScreen: React.FC<Props> = ({
  onRegister,
  onLoginSuccess,
}) => {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (!mobile || !password) {
      return;
    }

    // Temporary frontend flow.
    // Actual offline authentication Yash integrate karel.

    onLoginSuccess();
  };

  return (
    <SafeAreaView style={styles.container}>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >

          <View style={styles.logo}>
            <Text style={styles.logoText}>
              SSC
            </Text>
          </View>

          <Text style={styles.title}>
            Welcome Back!
          </Text>

          <Text style={styles.subtitle}>
            Login to continue your learning journey
          </Text>

          <Input
            label="Mobile Number"
            placeholder="Enter your mobile number"
            keyboardType="phone-pad"
            maxLength={10}
            value={mobile}
            onChangeText={setMobile}
          />

          <Input
            label="Password"
            placeholder="Enter your password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={styles.forgot}
          >
            <Text style={styles.forgotText}>
              Forgot Password?
            </Text>
          </TouchableOpacity>

          <Button
            title="Login"
            onPress={handleLogin}
            disabled={!mobile || !password}
          />

          <View style={styles.registerRow}>

            <Text style={styles.registerText}>
              Don't have an account?{' '}
            </Text>

            <TouchableOpacity
              onPress={onRegister}
            >
              <Text style={styles.registerLink}>
                Register
              </Text>
            </TouchableOpacity>

          </View>

        </ScrollView>

      </KeyboardAvoidingView>

    </SafeAreaView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },

  logo: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 25,
  },

  logoText: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: '800',
  },

  title: {
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
    color: COLORS.textPrimary,
  },

  subtitle: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginTop: 10,
    marginBottom: 35,
  },

  forgot: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },

  forgotText: {
    color: COLORS.primary,
    fontWeight: '600',
  },

  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },

  registerText: {
    color: COLORS.textSecondary,
  },

  registerLink: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});