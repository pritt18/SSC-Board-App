import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Language = 'english' | 'marathi';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Simple translation object
const translations: Record<string, Record<Language, string>> = {
  welcome: { english: 'Welcome', marathi: 'स्वागत आहे' },
  login: { english: 'Login', marathi: 'लॉगिन' },
  register: { english: 'Register', marathi: 'नोंदणी' },
  email: { english: 'Email', marathi: 'ईमेल' },
  password: { english: 'Password', marathi: 'पासवर्ड' },
  dashboard: { english: 'Dashboard', marathi: 'डॅशबोर्ड' },
  learning: { english: 'Learning', marathi: 'शिक्षण' },
  progress: { english: 'Progress', marathi: 'प्रगती' },
  games: { english: 'Games', marathi: 'खेळ' },
  profile: { english: 'Profile', marathi: 'प्रोफाइल' },
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('english');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const saved = await AsyncStorage.getItem('language');
        if (saved === 'english' || saved === 'marathi') {
          setLanguageState(saved);
        }
      } catch (error) {
        console.error('Error loading language:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLanguage();
  }, []);

  const setLanguage = async (lang: Language) => {
    try {
      await AsyncStorage.setItem('language', lang);
      setLanguageState(lang);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const t = (key: string): string => {
    if (translations[key] && translations[key][language]) {
      return translations[key][language];
    }
    return key;
  };

  if (isLoading) {
    return null;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};