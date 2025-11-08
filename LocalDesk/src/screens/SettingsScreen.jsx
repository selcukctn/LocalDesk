import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useI18n } from '../contexts/I18nContext';

const { width } = Dimensions.get('window');

export const SettingsScreen = ({ onBack }) => {
  const { language, changeLanguage, t } = useI18n();

  const languages = [
    { code: 'en', name: t('settings.english') },
    { code: 'de', name: t('settings.german') },
    { code: 'tr', name: t('settings.turkish') }
  ];

  const handleLanguageChange = async (langCode) => {
    await changeLanguage(langCode);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#1e1e1e" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backIcon}>◀️</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
          
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.languageItem,
                language === lang.code && styles.languageItemActive
              ]}
              onPress={() => handleLanguageChange(lang.code)}
            >
              <Text style={styles.languageName}>{lang.name}</Text>
              {language === lang.code && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3e3e42'
  },
  backButton: {
    width: 40,
    alignItems: 'center'
  },
  backIcon: {
    fontSize: 24
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    padding: 24
  },
  section: {
    marginBottom: 32
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#808080',
    textTransform: 'uppercase',
    marginBottom: 16,
    letterSpacing: 0.5
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#252526',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3e3e42'
  },
  languageItemActive: {
    backgroundColor: '#2d2d30',
    borderColor: '#1F6FEB'
  },
  languageName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF'
  },
  checkmark: {
    fontSize: 18,
    color: '#1F6FEB',
    fontWeight: 'bold'
  }
});

