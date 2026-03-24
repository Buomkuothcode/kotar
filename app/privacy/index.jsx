import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, Appearance } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import color from '../utils/color';

const COLORS = {
    primary: color.primary,
    darkBg: '#0F172A',
    lightBg: '#F8FAFC',
    textDark: '#F8FAFC',
    textLight: '#0F172A',
    textGrayDark: '#94A3B8',
    textGrayLight: '#64748B',
};

export default function PrivacyScreen() {
    const router = useRouter();
    const [theme, setTheme] = useState('light');

    useEffect(() => {
        const loadTheme = async () => {
            const saved = await AsyncStorage.getItem('theme');
            setTheme(saved || Appearance.getColorScheme() || 'light');
        };
        loadTheme();
    }, []);

    const isDark = theme === 'dark';
    const bgColor = isDark ? COLORS.darkBg : COLORS.lightBg;
    const textColor = isDark ? COLORS.textDark : COLORS.textLight;
    const subTextColor = isDark ? COLORS.textGrayDark : COLORS.textGrayLight;

    const PolicySection = ({ title, content }) => (
        <View style={styles.section}>
            <Text style={[styles.sectionHeader, { color: textColor }]}>{title}</Text>
            <Text style={[styles.sectionText, { color: subTextColor }]}>{content}</Text>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
            {/* Header */}
            <View style={styles.header}>

                <Text style={[styles.headerTitle, { color: textColor }]}>Privacy Policy</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={[styles.intro, { color: subTextColor }]}>
                    Last updated: December 1, 2025
                </Text>

                <Text style={[styles.intro, { color: subTextColor, marginBottom: 20 }]}>
                    At UniExit, we take your privacy seriously. This document outlines how we handle your data.
                </Text>

                <PolicySection
                    title="1. Data Collection"
                    content="We collect minimal data necessary to provide our services, such as your username, email address (for authentication)."
                />

                <PolicySection
                    title="2. Usage of Information"
                    content="Your information is used solely to personalize your learning experience."
                />

                <PolicySection
                    title="3. Data Security"
                    content="We implement industry-standard security measures to protect your personal information from unauthorized access, alteration, or disclosure."
                />

              

                <PolicySection
                    title="4. Contact Us"
                    content="If you have questions about this policy, please contact us via the Help section in your account settings."
                />

                <View style={{ height: 50 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    content: {
        padding: 24,
    },
    intro: {
        fontSize: 14,
        lineHeight: 22,
        marginBottom: 10,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
    },
    sectionText: {
        fontSize: 15,
        lineHeight: 24,
    },
});