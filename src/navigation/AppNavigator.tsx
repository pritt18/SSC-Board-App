import React, { useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import AuthNavigator from './AuthNavigator';
import StudentNavigator from './StudentNavigator';
import LanguageSelectionScreen from '../screens/language/LanguageSelectionScreen';

import { RootStackParamList } from './navigationTypes';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const { isAuthenticated } = useAuth();

  const [isMediumSelected, setIsMediumSelected] =
    useState(false);

  const handleMediumContinue = () => {
    setIsMediumSelected(true);
  };

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {!isAuthenticated ? (
        <Stack.Screen
          name="Auth"
          component={AuthNavigator}
        />
      ) : !isMediumSelected ? (
        <Stack.Screen name="LanguageSelection">
          {() => (
            <LanguageSelectionScreen
              onContinue={handleMediumContinue}
            />
          )}
        </Stack.Screen>
      ) : (
        <Stack.Screen
          name="Main"
          component={StudentNavigator}
        />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;