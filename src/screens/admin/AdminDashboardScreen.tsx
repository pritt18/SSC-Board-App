import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { COLORS } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { AdminStackParamList } from '../../navigation/AdminNavigator';

type Props = NativeStackScreenProps<
  AdminStackParamList,
  'AdminDashboard'
>;

const dashboardItems = [
  {
    id: 'students',
    title: 'Manage Students',
    subtitle: 'View and manage student accounts',
    icon: '👨‍🎓',
  },
  {
    id: 'classes',
    title: 'Class Access',
    subtitle: 'Assign classes to students',
    icon: '🏫',
  },
  {
    id: 'content',
    title: 'Manage Content',
    subtitle: 'Manage learning materials',
    icon: '📚',
  },
  {
    id: 'licenses',
    title: 'Licenses',
    subtitle: 'Manage student licenses',
    icon: '🔑',
  },
  {
    id: 'progress',
    title: 'Student Progress',
    subtitle: 'View learning progress',
    icon: '📊',
  },
  {
    id: 'users',
    title: 'Manage Users',
    subtitle: 'Manage application users',
    icon: '👥',
  },
];

const AdminDashboardScreen: React.FC<Props> = ({
  navigation,
}) => {
  const { user, logout } = useAuth();

  const handleCardPress = (id: string) => {
    switch (id) {
      case 'students':
        navigation.navigate('ManageStudents');
        break;

      default:
        console.log(
          'Screen not implemented yet:',
          id,
        );
        break;
    }
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top']}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.welcome}>
              Welcome,
            </Text>

            <Text style={styles.adminName}>
              {user?.full_name || 'Administrator'}
            </Text>
          </View>

          <Pressable
            style={styles.logoutButton}
            onPress={logout}
          >
            <Text style={styles.logoutText}>
              Logout
            </Text>
          </Pressable>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>
            Admin Panel
          </Text>

          <Text style={styles.summaryTitle}>
            Manage SSC Board App
          </Text>

          <Text style={styles.summaryDescription}>
            Manage students, classes, learning content and application access.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          Management
        </Text>

        <View style={styles.grid}>
          {dashboardItems.map(item => (
            <Pressable
              key={item.id}
              onPress={() =>
                handleCardPress(item.id)
              }
              style={({ pressed }) => [
                styles.card,
                pressed && styles.pressedCard,
              ]}
            >
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>
                  {item.icon}
                </Text>
              </View>

              <Text style={styles.cardTitle}>
                {item.title}
              </Text>

              <Text style={styles.cardSubtitle}>
                {item.subtitle}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AdminDashboardScreen;

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
    marginBottom: 24,
  },

  welcome: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  adminName: {
    fontSize: 25,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 3,
  },

  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  logoutText: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  summaryCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 22,
    marginBottom: 30,
  },

  summaryLabel: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.85,
  },

  summaryTitle: {
    color: COLORS.white,
    fontSize: 23,
    fontWeight: '700',
    marginTop: 6,
  },

  summaryDescription: {
    color: COLORS.white,
    fontSize: 13,
    lineHeight: 20,
    opacity: 0.85,
    marginTop: 8,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 18,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
  },

  card: {
    width: '47%',
    minHeight: 175,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  pressedCard: {
    opacity: 0.75,
  },

  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  icon: {
    fontSize: 25,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 15,
  },

  cardSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
    marginTop: 5,
  },
});