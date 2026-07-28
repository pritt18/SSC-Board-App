import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import ManageStudentsScreen from '../screens/admin/ManageStudentsScreen';
import AssignClassScreen from '../screens/admin/AssignClassScreen';

export type AdminStackParamList = {
  AdminDashboard: undefined;
  ManageStudents: undefined;

  AssignClass: {
    studentId: number;
  };
};

const Stack =
  createNativeStackNavigator<AdminStackParamList>();

const AdminNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
      />

      <Stack.Screen
        name="ManageStudents"
        component={ManageStudentsScreen}
      />

      <Stack.Screen
        name="AssignClass"
        component={AssignClassScreen}
      />
    </Stack.Navigator>
  );
};

export default AdminNavigator;