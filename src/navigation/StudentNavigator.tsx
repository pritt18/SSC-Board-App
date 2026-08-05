// src/navigation/StudentNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import DashboardScreen from '../screens/student/dashboard/DashboardScreen';
import ProfileScreen from '../screens/student/profile/ProfileScreen';
import ProgressScreen from '../screens/progress/ProgressScreen';
import GamesScreen from '../screens/games/GamesScreen';
import ClassListScreen from '../screens/learning/classes/ClassListScreen';
import SubjectListScreen from '../screens/learning/subjects/SubjectListScreen';
import LearningContentScreen from '../screens/learning/LearningContentScreen';
import VideoPlayerScreen from '../screens/learning/videos/VideoPlayerScreen';
import PdfViewerScreen from '../screens/learning/PdfViewerScreen';
import QuizListScreen from '../screens/quiz/QuizListScreen';
import QuizScreen from '../screens/quiz/QuizScreen';
import QuizResultScreen from '../screens/quiz/QuizResultScreen';
import NotesScreen from '../screens/learning/notes/NotesScreen';
import PdfDisplayScreen from '../screens/learning/PdfDisplayScreen';
import LicenseActivationScreen from '../screens/license/LicenseActivationScreen';
import { COLORS } from '../constants/colors';

import {
  StudentTabParamList,
  LearningStackParamList,
} from './navigationTypes';

const Tab = createBottomTabNavigator<StudentTabParamList>();
const Stack = createNativeStackNavigator<LearningStackParamList>();

const LearningStack: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="ClassList"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="ClassList" component={ClassListScreen} />
      <Stack.Screen name="LicenseActivation" component={LicenseActivationScreen} />
      <Stack.Screen name="SubjectList" component={SubjectListScreen} />
      <Stack.Screen name="LearningContent" component={LearningContentScreen}/>
      <Stack.Screen name="VideoPlayer" component={VideoPlayerScreen} />
      <Stack.Screen name="PdfViewer" component={PdfViewerScreen} />
      <Stack.Screen name="QuizList" component={QuizListScreen} />
      <Stack.Screen name="QuizScreen" component={QuizScreen} />
      <Stack.Screen name="QuizResult" component={QuizResultScreen} />
      <Stack.Screen name="Notes" component={NotesScreen} />
      <Stack.Screen name="PdfDisplay" component={PdfDisplayScreen} />
    </Stack.Navigator>
  );
};

const StudentNavigator: React.FC = () => {
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
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          
          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Learning':
              iconName = focused ? 'book' : 'book-outline';
              break;
            case 'Progress':
              iconName = focused ? 'stats-chart' : 'stats-chart-outline';
              break;
            case 'Games':
              iconName = focused ? 'game-controller' : 'game-controller-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
          }
          
          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{
          title: 'Home',
        }}
      />
      <Tab.Screen 
        name="Learning" 
        component={LearningStack}
        options={{
          title: 'Learning',
        }}
      />
      <Tab.Screen 
        name="Progress" 
        component={ProgressScreen}
        options={{
          title: 'Progress',
        }}
      />
      <Tab.Screen 
        name="Games" 
        component={GamesScreen}
        options={{
          title: 'Games',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          title: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};

export default StudentNavigator;