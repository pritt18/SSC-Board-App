import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';
import { initializeDatabase } from './src/database/database';
import { seedDatabase } from './src/database/seeders/seedDatabase';
import { LogBox, View, Text, ActivityIndicator, StyleSheet } from 'react-native';

// Ignore specific warnings
LogBox.ignoreAllLogs();

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const setupDatabase = async () => {
      try {
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
});