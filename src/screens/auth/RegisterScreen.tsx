import React, { useState } from 'react';

import {
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
  onLogin: () => void;
  onRegisterSuccess: () => void;
}

const RegisterScreen: React.FC<Props> = ({
  onLogin,
  onRegisterSuccess,
}) => {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');

  const valid =
    name.trim() !== '' &&
    mobile.trim() !== '' &&
    password.trim() !== '';

  return (
    <SafeAreaView style={styles.container}>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >

        <Text style={styles.title}>
          Create Account
        </Text>

        <Text style={styles.subtitle}>
          Start your learning journey today
        </Text>

        <Input
          label="Full Name"
          placeholder="Enter your full name"
          value={name}
          onChangeText={setName}
        />

        <Input
          label="Mobile Number"
          placeholder="Enter mobile number"
          keyboardType="phone-pad"
          maxLength={10}
          value={mobile}
          onChangeText={setMobile}
        />

        <Input
          label="Password"
          placeholder="Create password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Button
          title="Create Account"
          onPress={onRegisterSuccess}
          disabled={!valid}
        />

        <View style={styles.loginRow}>

          <Text style={styles.loginText}>
            Already have an account?{' '}
          </Text>

          <TouchableOpacity
            onPress={onLogin}
          >

            <Text style={styles.loginLink}>
              Login
            </Text>

          </TouchableOpacity>

        </View>

      </ScrollView>

    </SafeAreaView>
  );
};

export default RegisterScreen;

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

  title: {
    fontSize: 30,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },

  subtitle: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 35,
  },

  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },

  loginText: {
    color: COLORS.textSecondary,
  },

  loginLink: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});