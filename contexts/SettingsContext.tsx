import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { Appearance } from 'react-native';
import { Language, translations, Translations } from '@/constants/translations';
import { ThemeMode, ThemeColors, darkTheme, lightTheme } from '@/constants/themes';

const SETTINGS_KEY = 'app_settings';

interface StoredSettings {
    language: Language;
    theme: ThemeMode;
}

export const [SettingsProvider, useSettings] = createContextHook(() => {
    const [language, setLanguageState] = useState<Language>('it');
    const [theme, setThemeState] = useState<ThemeMode>('dark');
    const [isReady, setIsReady] = useState<boolean>(false);

    const settingsQuery = useQuery({
        queryKey: ['app-settings'],
        queryFn: async () => {
            const stored = await AsyncStorage.getItem(SETTINGS_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as StoredSettings;
                console.log('[Settings] Restored:', parsed);
                return parsed;
            }
            return null;
        },
        staleTime: Infinity,
    });

    useEffect(() => {
        if (settingsQuery.data !== undefined) {
            if (settingsQuery.data) {
                setLanguageState(settingsQuery.data.language);
                setThemeState(settingsQuery.data.theme);
                Appearance.setColorScheme(settingsQuery.data.theme);
            } else {
                Appearance.setColorScheme('dark'); // fallback
            }
            setIsReady(true);
        }
        if (settingsQuery.isError) {
            setIsReady(true);
            Appearance.setColorScheme('dark'); // fallback on error
        }
    }, [settingsQuery.data, settingsQuery.isError]);

    const persistSettings = useCallback(async (lang: Language, th: ThemeMode) => {
        const settings: StoredSettings = { language: lang, theme: th };
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        console.log('[Settings] Saved:', settings);
    }, []);

    const setLanguage = useCallback((lang: Language) => {
        setLanguageState(lang);
        setThemeState((currentTheme) => {
            persistSettings(lang, currentTheme);
            return currentTheme;
        });
    }, [persistSettings]);

    const setTheme = useCallback((th: ThemeMode) => {
        setThemeState(th);
        Appearance.setColorScheme(th);
        setLanguageState((currentLang) => {
            persistSettings(currentLang, th);
            return currentLang;
        });
    }, [persistSettings]);

    const t: Translations = useMemo(() => translations[language], [language]);
    const colors: ThemeColors = useMemo(() => theme === 'dark' ? darkTheme : lightTheme, [theme]);

    return {
        language,
        theme,
        setLanguage,
        setTheme,
        t,
        colors,
        isSettingsReady: isReady,
    };
});

export function useTranslations(): Translations {
    const { t } = useSettings();
    return t;
}

export function useThemeColors(): ThemeColors {
    const { colors } = useSettings();
    return colors;
}

