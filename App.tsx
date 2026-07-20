import React, {
  useEffect,
  useState,
} from 'react';

import {
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';

import SplashScreen from './src/screens/splash/SplashScreen';

import LanguageSelectionScreen from './src/screens/language/LanguageSelectionScreen';

import LoginScreen from './src/screens/auth/LoginScreen';

import RegisterScreen from './src/screens/auth/RegisterScreen';

import LicenseActivationScreen from './src/screens/license/LicenseActivationScreen';

import DashboardScreen from './src/screens/student/dashboard/DashboardScreen';

import { COLORS } from './src/constants/colors';

type Screen =
  | 'splash'
  | 'language'
  | 'login'
  | 'register'
  | 'license'
  | 'dashboard';

export default function App() {
  const [
    currentScreen,
    setCurrentScreen,
  ] = useState<Screen>('splash');

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentScreen('language');
    }, 2500);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  const renderScreen = () => {
    switch (currentScreen) {

      case 'splash':

        return (
          <SplashScreen />
        );

      case 'language':

        return (
          <LanguageSelectionScreen
            onContinue={() =>
              setCurrentScreen('login')
            }
          />
        );

      case 'login':

        return (
          <LoginScreen
            onRegister={() =>
              setCurrentScreen('register')
            }

            onLoginSuccess={() =>
              setCurrentScreen('license')
            }
          />
        );

      case 'register':

        return (
          <RegisterScreen
            onLogin={() =>
              setCurrentScreen('login')
            }

            onRegisterSuccess={() =>
              setCurrentScreen('license')
            }
          />
        );

      case 'license':

        return (
          <LicenseActivationScreen
            onActivated={() =>
              setCurrentScreen('dashboard')
            }
          />
        );

      case 'dashboard':

        return (
          <DashboardScreen />
        );

      default:

        return (
          <SplashScreen />
        );
    }
  };

  const isSplash =
    currentScreen === 'splash';

  return (
    <View style={styles.container}>

      <StatusBar
        barStyle={
          isSplash
            ? 'light-content'
            : 'dark-content'
        }

        backgroundColor={
          isSplash
            ? COLORS.primary
            : COLORS.background
        }
      />

      {renderScreen()}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});