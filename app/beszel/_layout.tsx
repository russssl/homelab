import { Stack } from 'expo-router';
import { useThemeColors, useTranslations } from '@/contexts/SettingsContext';

export default function BeszelLayout() {
    const colors = useThemeColors();
    const t = useTranslations();

    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.text,
                headerTitleStyle: { fontWeight: '600' as const },
                contentStyle: { backgroundColor: colors.background },
                headerBackTitle: t.back,
            }}
        >
            <Stack.Screen name="index" options={{ title: 'Beszel' }} />
            <Stack.Screen name="[systemId]" options={{ title: t.beszelSystemDetail }} />
        </Stack>
    );
}

