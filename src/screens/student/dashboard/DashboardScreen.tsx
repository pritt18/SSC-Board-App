import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';

const DashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>Welcome, {user?.full_name || 'Student'}!</Text>
        <Text style={styles.subtitle}>{t('dashboard')}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Chapters Completed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>0%</Text>
          <Text style={styles.statLabel}>Progress</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Quiz Score</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Continue Learning</Text>
        <TouchableOpacity style={styles.card}>
          <Text style={styles.cardTitle}>No active courses</Text>
          <Text style={styles.cardSubtitle}>Start learning today!</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <TouchableOpacity style={styles.card}>
          <Text style={styles.cardTitle}>Welcome to SSC Board App</Text>
          <Text style={styles.cardSubtitle}>Explore your learning journey</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 40,
  },
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 15,
    marginTop: -30,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
});

export default DashboardScreen;