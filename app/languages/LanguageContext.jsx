import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import enTranslations from './eng.json';
import amTranslations from './am.json';
import orTranslations from './or.json';

const translations = {
  en: enTranslations,
  am: amTranslations,
  or: orTranslations,
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [locale, setLocale] = useState('en');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadSavedLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem('user_language');
        if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'am' || savedLanguage === 'or')) {
          setLocale(savedLanguage);
        }
      } catch (error) {
        console.error('Failed to load language', error);
      } finally {
        setIsReady(true);
      }
    };
    loadSavedLanguage();
  }, []);

  const changeLanguage = async (newLocale) => {
    try {
      await AsyncStorage.setItem('user_language', newLocale);
      setLocale(newLocale);
    } catch (error) {
      console.error('Failed to save language', error);
    }
  };

  const t = (key) => {
    const translation = translations[locale] || translations['en'];
    return translation[key] !== undefined ? translation[key] : (translations['en'][key] !== undefined ? translations['en'][key] : key);
  };

  // Render children even if language is not loaded yet to prevent screen flicker,
  // or wait for isReady if dynamic content depends heavily on it.
  return (
    <LanguageContext.Provider value={{ locale, changeLanguage, t, isReady }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
