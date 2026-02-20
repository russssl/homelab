import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '@/contexts/SettingsContext';

interface StatCardProps {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    color?: string;
}

export default React.memo(function StatCard({ label, value, icon, color }: StatCardProps) {
    const colors = useThemeColors();
    const accentColor = color ?? colors.accent;

    return (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.iconWrap, { backgroundColor: accentColor + '1A' }]}>
                {icon}
            </View>
            <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        </View>
    );
});

const styles = StyleSheet.create({
    card: {
        flex: 1,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        alignItems: 'flex-start',
        gap: 8,
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    value: {
        fontSize: 22,
        fontWeight: '700' as const,
    },
    label: {
        fontSize: 12,
        fontWeight: '500' as const,
    },
});

