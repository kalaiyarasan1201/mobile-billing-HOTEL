import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { en, ta } from '../locales';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const storedLanguage = await AsyncStorage.getItem('@app_language');
      if (storedLanguage) {
        setLanguage(storedLanguage);
      }
    } catch (e) {
      console.log('Error loading language', e);
    }
  };

  const toggleLanguage = async () => {
    const newLanguage = language === 'en' ? 'ta' : 'en';
    setLanguage(newLanguage);
    try {
      await AsyncStorage.setItem('@app_language', newLanguage);
    } catch (e) {
      console.log('Error saving language', e);
    }
  };

  const t = (key) => {
    const strings = language === 'ta' ? ta : en;
    return strings[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
