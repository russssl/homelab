import React, { useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ScrollView,
    Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
    Box,
    Shield,
    Activity,
    GitBranch,
    ChevronRight,
    Zap,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useServices } from '@/contexts/ServicesContext';
import { useThemeColors, useTranslations } from '@/contexts/SettingsContext';
import { ServiceType, SERVICE_COLORS } from '@/types/services';
import { ThemeColors } from '@/constants/themes';
import { DashboardSummary } from './DashboardSummary';
import { GlassCard, GlassGroup, GlassButtonWrapper } from '@/components/LiquidGlass';
import { OfflineBanner } from '@/components/OfflineBanner';

const { width } = Dimensions.get('window');
const CARD_GAP = 14;
const CARD_WIDTH = (width - 32 - CARD_GAP) / 2;

interface ServiceItem {
    type: ServiceType;
    nameKey: keyof ReturnType<typeof useTranslations>;
    descKey: keyof ReturnType<typeof useTranslations>;
    icon: (color: string, size: number) => React.ReactNode;
}

const SERVICES: ServiceItem[] = [
    {
        type: 'portainer',
        nameKey: 'servicePortainer',
        descKey: 'servicePortainerDesc',
        icon: (color, size) => <Box size={size} color={color} />,
    },
    {
        type: 'pihole',
        nameKey: 'servicePihole',
        descKey: 'servicePiholeDesc',
        icon: (color, size) => <Shield size={size} color={color} />,
    },
    {
        type: 'beszel',
        nameKey: 'serviceBeszel',
        descKey: 'serviceBeszelDesc',
        icon: (color, size) => <Activity size={size} color={color} />,
    },
    {
        type: 'gitea',
        nameKey: 'serviceGitea',
        descKey: 'serviceGiteaDesc',
        icon: (color, size) => <GitBranch size={size} color={color} />,
    },
];

export default function LauncherScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { isConnected, connectedCount, isReachable } = useServices();
    const colors = useThemeColors();
    const t = useTranslations();

    const handleServicePress = useCallback((type: ServiceType) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (isConnected(type)) {
            router.push(`/${type}` as never);
        } else {
            router.push({ pathname: '/service-login' as never, params: { type } });
        }
    }, [isConnected, router]);

    // useMemo: styles object only recreated when colors change, not on every render
    const s = useMemo(() => makeStyles(colors), [colors]);

    // Stable press handlers per service type — NOT inline in .map()
    // Inline arrow functions in .map() create new refs each render, breaking React.memo
    const handlePortainerPress = useCallback(() => handleServicePress('portainer'), [handleServicePress]);
    const handlePiholePress = useCallback(() => handleServicePress('pihole'), [handleServicePress]);
    const handleBeszelPress = useCallback(() => handleServicePress('beszel'), [handleServicePress]);
    const handleGiteaPress = useCallback(() => handleServicePress('gitea'), [handleServicePress]);
    const stablePress: Record<string, () => void> = useMemo(() => ({
        portainer: handlePortainerPress,
        pihole: handlePiholePress,
        beszel: handleBeszelPress,
        gitea: handleGiteaPress,
    }), [handlePortainerPress, handlePiholePress, handleBeszelPress, handleGiteaPress]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return t.greetingMorning;
        if (hour < 18) return t.greetingAfternoon;
        return t.greetingEvening;
    };

    return (
        <View style={[s.container, { paddingTop: insets.top }]}>
            <ScrollView
                contentContainerStyle={s.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View
                    entering={FadeInDown.duration(500).springify()}
                    style={s.header}
                >
                    <View style={s.headerTop}>
                        <View>
                            <Text style={s.greeting}>{getGreeting()}</Text>
                            <Text style={s.title}>{t.launcherTitle}</Text>
                        </View>
                        {/* Header badge: effect='regular' per HIG
                            'clear' is only for surfaces over photos/video.
                            This is over a plain text header — 'regular' is correct. */}
                        <GlassButtonWrapper
                            effect="regular"
                            style={s.headerBadge}
                            fallbackStyle={{
                                backgroundColor: colors.accent + '15',
                                borderRadius: 20,
                            }}
                        >
                            <View style={s.headerBadgeInner}>
                                <Zap size={14} color={colors.accent} />
                                <Text style={s.headerBadgeText}>{connectedCount}/4</Text>
                            </View>
                        </GlassButtonWrapper>
                    </View>
                    <Text style={s.subtitle}>{t.launcherSubtitle}</Text>
                </Animated.View>

                {/* GlassGroup: MANDATORY per HIG — all 4 sibling GlassCards share one container */}
                <GlassGroup spacing={CARD_GAP} style={s.grid}>
                    {SERVICES.map((service, index) => (
                        <ServiceCard
                            key={service.type}
                            service={service}
                            connected={isConnected(service.type)}
                            reachable={isReachable(service.type)}
                            colors={colors}
                            t={t}
                            onPress={stablePress[service.type]}
                            index={index}
                        />
                    ))}
                </GlassGroup>

                <DashboardSummary />

                <Animated.View
                    entering={FadeIn.delay(600).duration(400)}
                    style={s.footer}
                >
                    <Text style={s.footerText}>
                        {t.launcherServices} • {connectedCount} {t.launcherConnected.toLowerCase()}
                    </Text>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const ServiceCard = React.memo(function ServiceCard({
    service,
    connected,
    reachable,
    colors,
    t,
    onPress,
    index,
}: {
    service: ServiceItem;
    connected: boolean;
    /** true=ok | false=offline | null=pinging | undefined=not configured */
    reachable: boolean | null | undefined;
    colors: ThemeColors;
    t: ReturnType<typeof useTranslations>;
    onPress: () => void;
    index: number;
}) {
    const serviceColor = SERVICE_COLORS[service.type];

    return (
        // Animated entry — no scale animation needed: GlassCard's interactive: true
        // already handles the native scale+bounce+shimmer via LiquidGlass
        <Animated.View
            entering={FadeInDown.delay(index * 100 + 200).duration(400).springify()}
            style={{ width: CARD_WIDTH }}
        >
            <Pressable
                onPress={onPress}
                accessibilityRole="button"
                accessibilityLabel={t[service.nameKey] as string}
            >
                {/* GlassCard: effect='regular' — standard for navigation-layer cards */}
                <GlassCard
                    effect="regular"
                    style={[styles.card, styles.glassCard]}
                    fallbackStyle={{
                        backgroundColor: colors.surface,
                        borderColor: connected ? serviceColor.primary + '44' : colors.border,
                        borderWidth: 1.5,
                    }}
                >
                    <View
                        style={[
                            styles.iconContainer,
                            { backgroundColor: serviceColor.bg },
                        ]}
                    >
                        {service.icon(serviceColor.primary, 28)}
                    </View>

                    <View style={styles.cardContent}>
                        <Text style={[styles.cardName, { color: colors.text }]}>
                            {t[service.nameKey] as string}
                        </Text>
                        <Text
                            style={[styles.cardDesc, { color: colors.textMuted }]}
                            numberOfLines={1}
                        >
                            {t[service.descKey] as string}
                        </Text>
                    </View>

                    <View style={styles.cardFooter}>
                        {!connected ? (
                            <View style={[styles.statusBadge, { backgroundColor: colors.textMuted + '15' }]}>
                                <Text style={[styles.statusText, { color: colors.textMuted }]}>
                                    {t.launcherTapToConnect}
                                </Text>
                                <ChevronRight size={12} color={colors.textMuted} />
                            </View>
                        ) : reachable === false ? (
                            // Configured but unreachable
                            <View style={[styles.statusBadge, { backgroundColor: colors.warning + '18' }]}>
                                <View style={[styles.statusDot, { backgroundColor: colors.warning }]} />
                                <Text style={[styles.statusText, { color: colors.warning }]}>
                                    {t.statusUnreachable}
                                </Text>
                            </View>
                        ) : reachable === null ? (
                            // Configured, currently pinging
                            <View style={[styles.statusBadge, { backgroundColor: colors.textMuted + '15' }]}>
                                <Text style={[styles.statusText, { color: colors.textMuted }]}>
                                    {t.statusVerifying}
                                </Text>
                            </View>
                        ) : (
                            // Configured + reachable
                            <View style={[styles.statusBadge, { backgroundColor: colors.running + '1A' }]}>
                                <View style={[styles.statusDot, { backgroundColor: colors.running }]} />
                                <Text style={[styles.statusText, { color: colors.running }]}>
                                    {t.launcherConnected}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* OfflineBanner with reconnect button — only when confirmed offline */}
                    {connected && reachable === false && (
                        <OfflineBanner serviceType={service.type} />
                    )}
                </GlassCard>
            </Pressable>
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        padding: 18,
        borderWidth: 1.5,
        minHeight: 180,
        justifyContent: 'space-between',
    },
    glassCard: {
        borderWidth: 0,
        overflow: 'hidden',
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    cardContent: {
        flex: 1,
        marginBottom: 12,
    },
    cardName: {
        fontSize: 17,
        fontWeight: '700' as const,
        marginBottom: 3,
    },
    cardDesc: {
        fontSize: 12,
        lineHeight: 16,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        gap: 5,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600' as const,
    },
});

function makeStyles(colors: ThemeColors) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        scrollContent: {
            paddingHorizontal: 16,
            paddingBottom: 120,
        },
        header: {
            paddingTop: 16,
            paddingBottom: 24,
        },
        headerTop: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 4,
        },
        greeting: {
            fontSize: 15,
            color: colors.textSecondary,
            fontWeight: '500' as const,
            marginBottom: 2,
        },
        title: {
            fontSize: 32,
            fontWeight: '800' as const,
            color: colors.text,
            letterSpacing: -0.5,
        },
        subtitle: {
            fontSize: 14,
            color: colors.textMuted,
            marginTop: 4,
        },
        headerBadge: {
            borderRadius: 20,
            marginTop: 8,
            overflow: 'hidden',
        },
        headerBadgeInner: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingHorizontal: 12,
            paddingVertical: 6,
        },
        headerBadgeText: {
            fontSize: 13,
            fontWeight: '700' as const,
            color: colors.accent,
        },
        grid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: CARD_GAP,
        },
        footer: {
            marginTop: 28,
            alignItems: 'center',
        },
        footerText: {
            fontSize: 12,
            color: colors.textMuted,
        },
    });
}
