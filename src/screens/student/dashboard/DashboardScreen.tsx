import React from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { exportDatabase } from '../../../utils/exportDatabase';

const DashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* HEADER */}

      <View style={styles.header}>
        <Text style={styles.welcome}>
          Welcome, {user?.full_name || 'Student'}!
        </Text>

        <Text style={styles.subtitle}>
          {t('dashboard')}
        </Text>
      </View>

      {/* STATS */}

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            0
          </Text>

          <Text style={styles.statLabel}>
            Chapters Completed
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            0%
          </Text>

          <Text style={styles.statLabel}>
            Progress
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            0
          </Text>

          <Text style={styles.statLabel}>
            Quiz Score
          </Text>
        </View>
      </View>

      {/* CONTINUE LEARNING */}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Continue Learning
        </Text>

        <TouchableOpacity style={styles.card}>
          <Text style={styles.cardTitle}>
            No active courses
          </Text>

          <Text style={styles.cardSubtitle}>
            Start learning today!
          </Text>
        </TouchableOpacity>
      </View>

      {/* RECENT ACTIVITY */}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Recent Activity
        </Text>

        <TouchableOpacity style={styles.card}>
          <Text style={styles.cardTitle}>
            Welcome to SSC Board App
          </Text>

          <Text style={styles.cardSubtitle}>
            Explore your learning journey
          </Text>
        </TouchableOpacity>
      </View>

      {/* DEVELOPER TOOLS */}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Developer Tools
        </Text>

        <TouchableOpacity
          style={styles.exportButton}
          onPress={exportDatabase}
          activeOpacity={0.8}
        >
          <Text style={styles.exportButtonText}>
            Export SQLite Database
          </Text>
        </TouchableOpacity>

        <Text style={styles.developerNote}>
          Export the local SQLite database for testing
          and development.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },

  contentContainer: {
    paddingBottom: 30,
  },

  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 40,
    paddingBottom: 50,
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
    paddingHorizontal: 10,
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

    shadowOffset: {
      width: 0,
      height: 2,
    },

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
    paddingHorizontal: 15,
    paddingTop: 20,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#222',
  },

  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 1,
    },

    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#222',
  },

  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },

  exportButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
  },

  exportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  developerNote: {
    fontSize: 12,
    color: '#777',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default DashboardScreen;