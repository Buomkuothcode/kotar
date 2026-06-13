import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar, DeviceEventEmitter, Appearance, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageProvider, useLanguage } from './languages/LanguageContext';
import { requestPermissions, schedulePaymentNotifications } from './services/notificationService';

const COLORS = {
  primary: '#1e4b89',
  darkBg: '#0F172A',
  lightBg: '#F8FAFC',
  darkSurface: '#1E293B',
  lightSurface: '#FFFFFF',
  textDark: '#F8FAFC',
  textLight: '#0F172A',
};

global.setAppTheme = async (newTheme) => {
  try {
    await AsyncStorage.setItem('theme', newTheme);
    DeviceEventEmitter.emit('THEME_CHANGED', newTheme);
  } catch (error) {
    console.error('Failed to save theme', error);
  }
};

function RootLayoutContent() {
  const [theme, setTheme] = useState('light');
  const { t } = useLanguage();

  useEffect(() => {
    const initNotifications = async () => {
      const hasPermission = await requestPermissions();
      if (hasPermission) {
        await schedulePaymentNotifications();
      }
    };
    initNotifications();
  }, []);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem('theme');
        const system = Appearance.getColorScheme() || 'light';
        const finalTheme = saved || system;
        setTheme(finalTheme);
      } catch (e) {
        setTheme('light');
      }
    };
    loadTheme();

    const listener = DeviceEventEmitter.addListener('THEME_CHANGED', (newTheme) => {
      setTheme(newTheme);
    });

    return () => listener.remove();
  }, []);

  const isDark = false;

  useEffect(() => {
    StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content', true);

    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('transparent', true);
      StatusBar.setTranslucent(true);
    }
  }, [isDark]);

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: isDark ? COLORS.darkBg : COLORS.lightBg,
      }}
      edges={['top', 'left', 'right']}
    >
      {/* Controlled by useEffect above */}
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: isDark ? COLORS.darkSurface : COLORS.lightSurface,
          },
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 18,
            color: isDark ? COLORS.textDark : COLORS.primary,
          },
          headerTintColor: isDark ? '#FFF' : COLORS.primary,
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="screens/Account/account" options={{ headerShown: false }} />
        <Stack.Screen name="screens/Login/Login" options={{ headerShown: false }} />
        <Stack.Screen name="screens/welcome/welcome" options={{ headerShown: false }} />
        <Stack.Screen name="screens/complaint/complaint" options={{ title: t("complaints") || 'Complaints' }} />

        <Stack.Screen name="screens/Exams/exams" options={{ title: t("exams") || 'Exams' }} />
        <Stack.Screen name="screens/Questions/Exam" options={{ title: t("exam") || 'Exam' }} />
        <Stack.Screen name="screens/Questions/Exercise" options={{ title: t("practice") || 'Practice' }} />
        <Stack.Screen name="privacy/index" options={{ title: t("privacy_policy") || 'Privacy Policy' }} />
      </Stack>
    </SafeAreaView>
  );
}

export default function RootLayout() {
  return (
    <LanguageProvider>
      <SafeAreaProvider>
        <RootLayoutContent />
      </SafeAreaProvider>
    </LanguageProvider>
  );
}