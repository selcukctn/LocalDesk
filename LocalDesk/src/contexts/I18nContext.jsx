import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Dil dosyalarını import et
import enTranslations from '../locales/en.json';
import deTranslations from '../locales/de.json';
import trTranslations from '../locales/tr.json';

const translations = {
  en: enTranslations,
  de: deTranslations,
  tr: trTranslations
};

const I18nContext = createContext();

const LANGUAGE_STORAGE_KEY = '@localdesk_language';

export const I18nProvider = ({ children }) => {
  const [language, setLanguage] = useState('en'); // Default: English
  const [isLoading, setIsLoading] = useState(true);

  // Dil dosyasını yükle
  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (savedLanguage && translations[savedLanguage]) {
        setLanguage(savedLanguage);
      }
    } catch (error) {
      console.error('Dil yüklenirken hata:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const changeLanguage = async (newLanguage) => {
    if (translations[newLanguage]) {
      setLanguage(newLanguage);
      try {
        await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newLanguage);
      } catch (error) {
        console.error('Dil kaydedilirken hata:', error);
      }
    }
  };

  const t = (key, params = {}) => {
    const keys = key.split('.');
    let value = translations[language];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }

    // Parametreleri değiştir (örn: {name} -> gerçek isim)
    if (typeof value === 'string' && Object.keys(params).length > 0) {
      return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
        return params[paramKey] !== undefined ? params[paramKey] : match;
      });
    }

    return value || key;
  };

  return (
    <I18nContext.Provider value={{ language, changeLanguage, t, isLoading }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
};

