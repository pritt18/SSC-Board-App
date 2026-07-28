import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import DashboardScreen from '../screens/student/dashboard/DashboardScreen';
import ProfileScreen from '../screens/student/profile/ProfileScreen';
import ProgressScreen from '../screens/progress/ProgressScreen';
import GamesScreen from '../screens/games/GamesScreen';

//import ClassListScreen from '../screens/student/classes/MyClassesScreen';
//import SubjectListScreen from '../screens/student/subjects/SubjectsScreen';
//import ChapterListScreen from '../screens/student/chapters/ChaptersScreen';
//import ChapterDetailScreen from '../screens/student/chapters/ChapterDetailsScreen';
//import ChapterDetailScreen from '../screens/learning/chapters/ChapterDetailScreen';
import VideoPlayerScreen from '../screens/learning/videos/VideoPlayerScreen';
import PdfViewerScreen from '../screens/learning/PdfViewerScreen';
import QuizListScreen from '../screens/quiz/QuizListScreen';
import QuizScreen from '../screens/quiz/QuizScreen';
import QuizResultScreen from '../screens/quiz/QuizResultScreen';

import ClassListScreen from '../screens/learning/classes/ClassListScreen';
import SubjectListScreen from '../screens/learning/subjects/SubjectListScreen';
//import ChapterListScreen from '../screens/learning/chapters/ChapterListScreen';
//import ChapterDetailScreen from '../screens/learning/chapters/ChapterDetailScreen';
import LearningContentScreen from '../screens/learning/LearningContentScreen';
import NotesScreen from '../screens/learning/notes/NotesScreen';
// File ke upar jahan baaki screens import hain
import PdfDisplayScreen from '../screens/learning/PdfDisplayScreen';

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
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
      />

      <Tab.Screen
        name="Learning"
        component={LearningStack}
      />

      <Tab.Screen
        name="Progress"
        component={ProgressScreen}
      />

      <Tab.Screen
        name="Games"
        component={GamesScreen}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
      />
    </Tab.Navigator>
  );
};

export default StudentNavigator;