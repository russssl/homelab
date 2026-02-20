import { Stack } from 'expo-router';
import { useThemeColors, useTranslations } from '@/contexts/SettingsContext';

export default function PortainerLayout() {
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
            <Stack.Screen name="index" options={{ title: t.portainerDashboard }} />
            <Stack.Screen name="containers" options={{ title: t.portainerContainers }} />
            <Stack.Screen name="[containerId]" options={{ title: 'Container' }} />
        </Stack>
    );
}

