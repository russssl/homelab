/**
 * OfflineBanner — compact warning strip shown inside a ServiceCard
 * when reachability check fails. No icons (they render inconsistently
 * at small sizes) — uses a colored dot + clear typography instead.
 */
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ActivityIndicator,
} from 'react-native';
import { useServices } from '@/contexts/ServicesContext';
import { ServiceType } from '@/types/services';
import { useThemeColors, useTranslations } from '@/contexts/SettingsContext';

interface OfflineBannerProps {
    serviceType: ServiceType;
}

export function OfflineBanner({ serviceType }: OfflineBannerProps) {
    const { checkReachability, isPinging } = useServices();
    const colors = useThemeColors();
    const t = useTranslations();
    const pinging = isPinging(serviceType);

    return (
        <View style={[styles.banner, {
            backgroundColor: colors.warning + '15',
            borderColor: colors.warning + '35',
        }]}>
            {/* Left: dot + label */}
            <View style={styles.left}>
                <View style={[styles.dot, { backgroundColor: colors.warning }]} />
                <Text
                    style={[styles.message, { color: colors.warning }]}
                    numberOfLines={1}
                >
                    {t.statusUnreachable}
                </Text>
            </View>

            {/* Right: reconnect button — text only, no icon */}
            <Pressable
                onPress={() => { if (!pinging) checkReachability(serviceType); }}
                disabled={pinging}
                hitSlop={8}
                style={({ pressed }) => [
                    styles.button,
                    { backgroundColor: pressed ? colors.warning + '40' : colors.warning + '25' },
                ]}
                accessibilityLabel="Riconnetti"
                accessibilityRole="button"
            >
                {pinging
                    ? <ActivityIndicator size="small" color={colors.warning} />
                    : (
                        <Text style={[styles.btnText, { color: colors.warning }]}>
                            ↺  {t.actionReconnect}
                        </Text>
                    )
                }
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 7,
        marginTop: 8,
        gap: 8,
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
        overflow: 'hidden',
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        flexShrink: 0,
    },
    message: {
        fontSize: 12,
        fontWeight: '500',
        flexShrink: 1,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 7,
        paddingHorizontal: 10,
        paddingVertical: 5,
        minHeight: 28,
        justifyContent: 'center',
        flexShrink: 0,
    },
    btnText: {
        fontSize: 12,
        fontWeight: '600',
    },
});
