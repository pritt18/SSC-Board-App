import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import ParentDashboardScreen from '../screens/parent/ParentDashboardScreen';
import ParentProgressScreen from '../screens/parent/ParentProgressScreen';
import ParentQuizResultsScreen from '../screens/parent/ParentQuizResultsScreen';
import ParentStudyTimeScreen from '../screens/parent/ParentStudyTimeScreen';
import ParentNotificationsScreen from '../screens/parent/ParentNotificationsScreen';
import { COLORS } from '../constants/colors';
import { ParentChildProvider } from '../context/ParentChildContext';

import { ParentTabParamList } from './navigationTypes';

const Tab = createBottomTabNavigator<ParentTabParamList>();

const ParentNavigator: React.FC = () => {
  return (
    <ParentChildProvider>
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
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '500',
          },
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap = 'home';

            switch (route.name) {
              case 'ParentDashboard':
                iconName = focused ? 'home' : 'home-outline';
                break;
              case 'ParentProgress':
                iconName = focused ? 'bar-chart' : 'bar-chart-outline';
                break;
              case 'ParentQuizResults':
                iconName = focused ? 'checkmark-done' : 'checkmark-done-outline';
                break;
              case 'ParentStudyTime':
                iconName = focused ? 'time' : 'time-outline';
                break;
              case 'ParentNotifications':
                iconName = focused ? 'notifications' : 'notifications-outline';
                break;
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen
          name="ParentDashboard"
          component={ParentDashboardScreen}
          options={{ tabBarLabel: 'Home' }}
        />
        <Tab.Screen
          name="ParentProgress"
          component={ParentProgressScreen}
          options={{ tabBarLabel: 'Progress' }}
        />
        <Tab.Screen
          name="ParentQuizResults"
          component={ParentQuizResultsScreen}
          options={{ tabBarLabel: 'Quizzes' }}
        />
        <Tab.Screen
          name="ParentStudyTime"
          component={ParentStudyTimeScreen}
          options={{ tabBarLabel: 'Study Time' }}
        />
        <Tab.Screen
          name="ParentNotifications"
          component={ParentNotificationsScreen}
          options={{ tabBarLabel: 'Alerts' }}
        />
      </Tab.Navigator>
    </ParentChildProvider>
  );
};

export default ParentNavigator;
