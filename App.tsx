import 'setimmediate';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';
import { initializeDatabase } from './src/database/database';
import { seedDatabase } from './src/database/seeders/seedDatabase';
import { LogBox, View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';

// Ignore specific warnings
LogBox.ignoreAllLogs();

export default function App() {
  const [isReady, setIsReady] = useState(false);

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

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
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
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
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