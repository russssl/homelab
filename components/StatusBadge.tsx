import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '@/contexts/SettingsContext';
import { ThemeColors } from '@/constants/themes';

interface StatusBadgeProps {
    state: string;
    size?: 'small' | 'medium';
}

export function getStateColor(state: string, colors: ThemeColors): string {
    switch (state.toLowerCase()) {
        case 'running':
            return colors.running;
        case 'exited':
        case 'dead':
            return colors.stopped;
        case 'paused':
            return colors.paused;
        case 'created':
        case 'restarting':
            return colors.created;
        default:
            return colors.textMuted;
    }
}

export default React.memo(function StatusBadge({ state, size = 'small' }: StatusBadgeProps) {
    const colors = useThemeColors();
    const color = getStateColor(state, colors);
    const isSmall = size === 'small';

    return (
        <View style={[
            styles.badge,
            { backgroundColor: color + '1A', borderColor: color + '33' },
            isSmall ? styles.badgeSmall : styles.badgeMedium,
        ]}>
            <View style={[styles.dot, { backgroundColor: color }, isSmall ? styles.dotSmall : styles.dotMedium]} />
            <Text style={[styles.text, { color }, isSmall ? styles.textSmall : styles.textMedium]}>
                {state.charAt(0).toUpperCase() + state.slice(1)}
            </Text>
        </View>
    );
});

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        borderWidth: 1,
    },
    badgeSmall: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        gap: 5,
    },
    badgeMedium: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        gap: 6,
    },
    dot: {
        borderRadius: 10,
    },
    dotSmall: {
        width: 6,
        height: 6,
    },
    dotMedium: {
        width: 8,
        height: 8,
    },
    text: {
        fontWeight: '600' as const,
    },
    textSmall: {
        fontSize: 11,
    },
    textMedium: {
        fontSize: 13,
    },
});
