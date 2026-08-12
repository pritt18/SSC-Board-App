// src/navigation/AdminNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import ManageUsersScreen from '../screens/admin/ManageUsersScreen';
import UserDetailScreen from '../screens/admin/UserDetailScreen';
import AssignClassScreen from '../screens/admin/AssignClassScreen';
import ManageVideosScreen from '../screens/admin/ManageVideosScreen';
import AddVideoScreen from '../screens/admin/AddVideoScreen';
import EditVideoScreen from '../screens/admin/EditVideoScreen';
import ManagePdfsScreen from '../screens/admin/ManagePdfsScreen';
import BulkImportPdfsScreen from '../screens/admin/BulkImportPdfsScreen';
import AddPdfScreen from '../screens/admin/AddPdfScreen';
import EditPdfScreen from '../screens/admin/EditPdfScreen';
import ManageQuizzesScreen from '../screens/admin/ManageQuizzesScreen';
import AddQuizScreen from '../screens/admin/AddQuizScreen';
import EditQuizScreen from '../screens/admin/EditQuizScreen';
import ManageLicensesScreen from '../screens/admin/ManageLicensesScreen';
import GenerateLicenseScreen from '../screens/admin/GenerateLicenseScreen';
import LinkChildScreen from '../screens/admin/LinkChildScreen';
import ViewProgressScreen from '../screens/admin/ViewProgressScreen';
import ManageClassesScreen from '../screens/admin/ManageClassesScreen';
import ManageSubjectsScreen from '../screens/admin/ManageSubjectsScreen';
import AddSubjectScreen from '../screens/admin/AddSubjectScreen';
import EditSubjectScreen from '../screens/admin/EditSubjectScreen';

export type AdminStackParamList = {
  AdminDashboard: undefined;
  ManageUsers: undefined;
  UserDetail: { userId: number };
  AssignClass: { studentId: number };
  ManageVideos: undefined;
  AddVideo: undefined;
  EditVideo: { videoId: number };
  ManagePdfs: undefined;
  BulkImportPdfs: undefined;
  AddPdf: undefined;
  EditPdf: { pdfId: number };
  ManageQuizzes: undefined;
  AddQuiz: undefined;
  EditQuiz: { quizId: number };
  ManageLicenses: undefined;
  GenerateLicense: undefined;
  LinkChild: { parentId: number };
  ViewProgress: undefined;
  ManageClasses: undefined;
  ManageSubjects: { classId: number };
  AddSubject: { classId: number };
  EditSubject: { subjectId: number };
};

const Stack = createNativeStackNavigator<AdminStackParamList>();

const AdminNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="ManageUsers" component={ManageUsersScreen} />
      <Stack.Screen name="UserDetail" component={UserDetailScreen} />
      <Stack.Screen name="AssignClass" component={AssignClassScreen} />
      <Stack.Screen name="ManageVideos" component={ManageVideosScreen} />
      <Stack.Screen name="AddVideo" component={AddVideoScreen} />
      <Stack.Screen name="EditVideo" component={EditVideoScreen} />
      <Stack.Screen name="ManagePdfs" component={ManagePdfsScreen} />
      <Stack.Screen name="BulkImportPdfs" component={BulkImportPdfsScreen} />
      <Stack.Screen name="AddPdf" component={AddPdfScreen} />
      <Stack.Screen name="EditPdf" component={EditPdfScreen} />
      <Stack.Screen name="ManageQuizzes" component={ManageQuizzesScreen} />
      <Stack.Screen name="AddQuiz" component={AddQuizScreen} />
      <Stack.Screen name="EditQuiz" component={EditQuizScreen} />
      <Stack.Screen name="ManageLicenses" component={ManageLicensesScreen} />
      <Stack.Screen name="GenerateLicense" component={GenerateLicenseScreen} />
      <Stack.Screen name="LinkChild" component={LinkChildScreen} />
      <Stack.Screen name="ViewProgress" component={ViewProgressScreen} />
      <Stack.Screen name="ManageClasses" component={ManageClassesScreen} />
      <Stack.Screen name="ManageSubjects" component={ManageSubjectsScreen} />
      <Stack.Screen name="AddSubject" component={AddSubjectScreen} />
      <Stack.Screen name="EditSubject" component={EditSubjectScreen} />
    </Stack.Navigator>
  );
};

export default AdminNavigator;