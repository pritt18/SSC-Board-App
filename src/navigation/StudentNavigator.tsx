import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DashboardScreen from '../screens/student/dashboard/DashboardScreen';
import ProfileScreen from '../screens/student/profile/ProfileScreen';
import ProgressScreen from '../screens/progress/ProgressScreen';
import GamesScreen from '../screens/games/GamesScreen';
import { StudentTabParamList, LearningStackParamList } from './navigationTypes';

const Tab = createBottomTabNavigator<StudentTabParamList>();
const Stack = createNativeStackNavigator<LearningStackParamList>();

const LearningStack: React.FC = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="ClassList" component={DashboardScreen} />
    </Stack.Navigator>
  );
};

const StudentNavigator: React.FC = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Learning" component={LearningStack} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Games" component={GamesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default StudentNavigator;