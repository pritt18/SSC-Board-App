import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserModel } from '../database/models/User';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: any) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
          console.log('User loaded from storage:', JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      console.log('Attempting login with:', email);
      
      // Try to find user in database
      const userData = await UserModel.findByEmail(email);
      console.log('User found:', userData);
      
      if (userData) {
        // Simple password check
        const expectedHash = btoa(password + 'salt');
        console.log('Expected hash:', expectedHash);
        console.log('Stored hash:', userData.password_hash);
        
        if (userData.password_hash === expectedHash) {
          setUser(userData);
          await AsyncStorage.setItem('user', JSON.stringify(userData));
          console.log('Login successful!');
          return true;
        } else {
          console.log('Password mismatch');
          return false;
        }
      }
      
      console.log('User not found');
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: any): Promise<boolean> => {
    setIsLoading(true);
    try {
      console.log('Registering user:', userData);
      
      // Check if user already exists
      const existingUser = await UserModel.findByEmail(userData.email);
      if (existingUser) {
        console.log('User already exists with this email');
        return false;
      }

      // Create user in database
      const userId = await UserModel.create({
        username: userData.username,
        email: userData.email,
        password_hash: btoa(userData.password + 'salt'),
        full_name: userData.full_name,
        role: userData.role || 'student',
        medium: userData.medium || 'english',
        class_id: userData.class_id || null,
        device_id: userData.device_id || null,
      });

      console.log('User created with ID:', userId);

      // Fetch the newly created user
      const newUser = await UserModel.findByEmail(userData.email);
      if (newUser) {
        setUser(newUser);
        await AsyncStorage.setItem('user', JSON.stringify(newUser));
        console.log('Registration successful!');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      setUser(null);
      await AsyncStorage.removeItem('user');
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        updateUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};