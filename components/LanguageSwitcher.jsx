import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLanguage } from '../app/languages/LanguageContext';

export default function LanguageSwitcher() {
  const { locale, changeLanguage } = useLanguage();

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'am', label: 'አማርኛ' },
    { code: 'or', label: 'A. Oromoo' },
  ];

  return (
    <View style={styles.container}>
      {languages.map((lang) => {
        const isActive = locale === lang.code;
        return (
          <TouchableOpacity
            key={lang.code}
            style={[styles.tab, isActive && styles.activeTab]}
            onPress={() => changeLanguage(lang.code)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, isActive && styles.activeTabText]}>
              {lang.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6', // Neutral light gray background for the capsule
    borderRadius: 25,
    padding: 4,
    alignSelf: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#006442', // Theme primary green color
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280', // Inactive text color
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FFFFFF', // Active text color
    fontWeight: 'bold',
  },
});
