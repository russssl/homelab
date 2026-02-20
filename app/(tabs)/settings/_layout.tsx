import { Stack } from 'expo-router';
import { useThemeColors } from '@/contexts/SettingsContext';

export default function SettingsLayout() {
    const colors = useThemeColors();

    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.text,
                headerTitleStyle: { fontWeight: '600' as const },
                contentStyle: { backgroundColor: colors.background },
            }}
        >
            <Stack.Screen name="index" options={{ title: 'Settings' }} />
        </Stack>
    );
}

