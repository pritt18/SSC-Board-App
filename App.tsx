import 'setimmediate';
import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';
import CornerLogo from './src/components/common/CornerLogo';
import SplashScreen from './src/screens/splash/SplashScreen';
import { initializeDatabase } from './src/database/database';
import { seedDatabase } from './src/database/seeders/seedDatabase';
import { LogBox, View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';

// Ignore specific warnings
LogBox.ignoreAllLogs();

// Screens that already have their own logo, or a header button in the same
// top-right corner (Logout / + Add / + Generate) — the watermark is hidden
// here so it never overlaps existing text/buttons.
const CORNER_LOGO_HIDDEN_ROUTES = [
  'Login',
  'Register',
  'ForgotPassword',
  // Every screen in AdminNavigator — nearly all of them have their own
  // header-right button (Add/Save/Generate/Active-Inactive/Logout etc.)
  // that the watermark would otherwise sit on top of.
  'AdminDashboard',
  'ManageUsers',
  'UserDetail',
  'AssignClass',
  'ManageVideos',
  'AddVideo',
  'EditVideo',
  'ManagePdfs',
  'AddPdf',
  'EditPdf',
  'ManageQuizzes',
  'AddQuiz',
  'EditQuiz',
  'ManageLicenses',
  'GenerateLicense',
  'LinkChild',
  'ViewProgress',
  'ManageClasses',
  'ManageSubjects',
  'AddSubject',
  'EditSubject',
  // Parent tabs already show a welcome header with the account name —
  // the corner watermark was clashing there too.
  'ParentDashboard',
  'ParentProgress',
  'ParentQuizResults',
  'ParentStudyTime',
  'ParentNotifications',
];

const navigationRef = createNavigationContainerRef<any>();

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [showCornerLogo, setShowCornerLogo] = useState(true);

  useEffect(() => {
    // Keep the splash visible for at least 1.8s so the logo is
    // actually seen, even if the database initializes instantly.
    const timer = setTimeout(() => setMinTimeElapsed(true), 1800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const setupDatabase = async () => {
      try {
        // Skip SQLite on web (for development)
        if (Platform.OS === 'web') {
          console.log('Web platform - skipping SQLite');
          setIsReady(true);
          return;
        }

        console.log('Initializing database...');
        await initializeDatabase();
        console.log('Seeding database...');
        await seedDatabase();
        console.log('✅ Database initialized successfully');
      } catch (error) {
        console.error('❌ Database initialization failed:', error);
      } finally {
        setIsReady(true);
      }
    };

    setupDatabase();
  }, []);

  if (!isReady || !minTimeElapsed) {
    return <SplashScreen />;
  }

  // For web, show a message
  if (Platform.OS === 'web') {
    return (
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <View style={styles.webContainer}>
          <Text style={styles.webTitle}>SSC Board App</Text>
          <Text style={styles.webSubtitle}>Please use mobile app for full features</Text>
          <Text style={styles.webNote}>Open with Expo Go or development build on Android/iOS</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <LanguageProvider>
        <AuthProvider>
          <View style={styles.appRoot}>
            <NavigationContainer
              ref={navigationRef}
              onReady={() => {
                const routeName = navigationRef.getCurrentRoute()?.name;
                setShowCornerLogo(!CORNER_LOGO_HIDDEN_ROUTES.includes(routeName || ''));
              }}
              onStateChange={() => {
                const routeName = navigationRef.getCurrentRoute()?.name;
                setShowCornerLogo(!CORNER_LOGO_HIDDEN_ROUTES.includes(routeName || ''));
              }}
            >
              <AppNavigator />
            </NavigationContainer>
            {showCornerLogo && <CornerLogo />}
          </View>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  webContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  webTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 10,
  },
  webSubtitle: {
    fontSize: 18,
    color: '#333',
    marginBottom: 20,
  },
  webNote: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});