import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const ProgressScreen: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Progress</Text>
        <Text style={styles.subtitle}>Track your learning journey</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Overall Progress</Text>
        <View style={styles.progressCard}>
          <Text style={styles.progressText}>Chapters Completed: 0</Text>
          <Text style={styles.progressText}>Quizzes Taken: 0</Text>
          <Text style={styles.progressText}>Study Time: 0 hours</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subject Progress</Text>
        <View style={styles.subjectCard}>
          <Text style={styles.subjectName}>No subjects started yet</Text>
          <Text style={styles.subjectProgress}>Start learning to track progress</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Achievements</Text>
        <View style={styles.achievementCard}>
          <Text style={styles.achievementText}>🚀 Getting Started</Text>
          <Text style={styles.achievementText}>Complete your first chapter</Text>
        </View>
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  progressCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
  },
  progressText: {
    fontSize: 16,
    paddingVertical: 5,
  },
  subjectCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '500',
  },
  subjectProgress: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  achievementCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
  },
  achievementText: {
    fontSize: 16,
    paddingVertical: 5,
  },
});

export default ProgressScreen;