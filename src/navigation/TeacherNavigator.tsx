import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import TeacherDashboardScreen from '../screens/teacher/TeacherDashboardScreen';
import TeacherQuizzesScreen from '../screens/teacher/TeacherQuizzesScreen';
import TeacherCreateQuizScreen from '../screens/teacher/TeacherCreateQuizScreen';
import TeacherAssignmentsScreen from '../screens/teacher/TeacherAssignmentsScreen';
import TeacherCreateAssignmentScreen from '../screens/teacher/TeacherCreateAssignmentScreen';
import TeacherReportsScreen from '../screens/teacher/TeacherReportsScreen';
import TeacherNotificationsScreen from '../screens/teacher/TeacherNotificationsScreen';
import { COLORS } from '../constants/colors';

import {
  TeacherTabParamList,
  TeacherQuizzesStackParamList,
  TeacherAssignmentsStackParamList,
} from './navigationTypes';

const Tab = createBottomTabNavigator<TeacherTabParamList>();
const QuizzesStackNav = createNativeStackNavigator<TeacherQuizzesStackParamList>();
const AssignmentsStackNav = createNativeStackNavigator<TeacherAssignmentsStackParamList>();

const QuizzesStack: React.FC = () => (
  <QuizzesStackNav.Navigator screenOptions={{ headerShown: false }}>
    <QuizzesStackNav.Screen name="TeacherQuizzes" component={TeacherQuizzesScreen} />
    <QuizzesStackNav.Screen name="TeacherCreateQuiz" component={TeacherCreateQuizScreen} />
  </QuizzesStackNav.Navigator>
);

const AssignmentsStack: React.FC = () => (
  <AssignmentsStackNav.Navigator screenOptions={{ headerShown: false }}>
    <AssignmentsStackNav.Screen name="TeacherAssignments" component={TeacherAssignmentsScreen} />
    <AssignmentsStackNav.Screen name="TeacherCreateAssignment" component={TeacherCreateAssignmentScreen} />
  </AssignmentsStackNav.Navigator>
);

const TeacherNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          switch (route.name) {
            case 'TeacherDashboard':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'TeacherQuizzesStack':
              iconName = focused ? 'checkmark-done' : 'checkmark-done-outline';
              break;
            case 'TeacherAssignmentsStack':
              iconName = focused ? 'document-text' : 'document-text-outline';
              break;
            case 'TeacherReports':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'TeacherNotifications':
              iconName = focused ? 'notifications' : 'notifications-outline';
              break;
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="TeacherDashboard" component={TeacherDashboardScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="TeacherQuizzesStack" component={QuizzesStack} options={{ tabBarLabel: 'Quizzes' }} />
      <Tab.Screen name="TeacherAssignmentsStack" component={AssignmentsStack} options={{ tabBarLabel: 'Assignments' }} />
      <Tab.Screen name="TeacherReports" component={TeacherReportsScreen} options={{ tabBarLabel: 'Reports' }} />
      <Tab.Screen name="TeacherNotifications" component={TeacherNotificationsScreen} options={{ tabBarLabel: 'Notify' }} />
    </Tab.Navigator>
  );
};

export default TeacherNavigator;
