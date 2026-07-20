import React from 'react';

import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Card from '../../../components/ui/Card';

import { COLORS } from '../../../constants/colors';

const DashboardScreen = () => {
  return (
    <SafeAreaView style={styles.container}>

      <ScrollView
        contentContainerStyle={styles.content}
      >

        <View style={styles.header}>

          <View>

            <Text style={styles.greeting}>
              Hello, Student 👋
            </Text>

            <Text style={styles.subtitle}>
              Continue your learning journey
            </Text>

          </View>

          <View style={styles.profile}>

            <Text style={styles.profileText}>
              S
            </Text>

          </View>

        </View>

        <Card style={styles.continueCard}>

          <Text style={styles.cardLabel}>
            CONTINUE LEARNING
          </Text>

          <Text style={styles.cardTitle}>
            Mathematics
          </Text>

          <Text style={styles.cardSubtitle}>
            Chapter 1
          </Text>

        </Card>

        <Text style={styles.sectionTitle}>
          My Learning
        </Text>

        <View style={styles.grid}>

          <Card style={styles.gridCard}>

            <Text style={styles.gridIcon}>
              📚
            </Text>

            <Text style={styles.gridTitle}>
              My Classes
            </Text>

          </Card>

          <Card style={styles.gridCard}>

            <Text style={styles.gridIcon}>
              📝
            </Text>

            <Text style={styles.gridTitle}>
              Quizzes
            </Text>

          </Card>

          <Card style={styles.gridCard}>

            <Text style={styles.gridIcon}>
              📊
            </Text>

            <Text style={styles.gridTitle}>
              Progress
            </Text>

          </Card>

          <Card style={styles.gridCard}>

            <Text style={styles.gridIcon}>
              🏆
            </Text>

            <Text style={styles.gridTitle}>
              Achievements
            </Text>

          </Card>

        </View>

        <Text style={styles.sectionTitle}>
          Today's Progress
        </Text>

        <Card>

          <View style={styles.progressRow}>

            <View>

              <Text style={styles.progressNumber}>
                45 min
              </Text>

              <Text style={styles.progressLabel}>
                Study Time
              </Text>

            </View>

            <View>

              <Text style={styles.progressNumber}>
                3
              </Text>

              <Text style={styles.progressLabel}>
                Chapters
              </Text>

            </View>

            <View>

              <Text style={styles.progressNumber}>
                80%
              </Text>

              <Text style={styles.progressLabel}>
                Quiz Score
              </Text>

            </View>

          </View>

        </Card>

      </ScrollView>

    </SafeAreaView>
  );
};

export default DashboardScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },

  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  subtitle: {
    color: COLORS.textSecondary,
    marginTop: 5,
  },

  profile: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 18,
  },

  continueCard: {
    backgroundColor: COLORS.primary,
  },

  cardLabel: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.8,
  },

  cardTitle: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 12,
  },

  cardSubtitle: {
    color: COLORS.white,
    marginTop: 5,
    opacity: 0.9,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 30,
    marginBottom: 15,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 15,
  },

  gridCard: {
    width: '47%',
    alignItems: 'center',
  },

  gridIcon: {
    fontSize: 32,
  },

  gridTitle: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginTop: 10,
  },

  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  progressNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
  },

  progressLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
});