import React, { useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    Dimensions,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { SkeletonCard } from '@/components/SkeletonLoader';
import {
    Server,
    Cpu,
    MemoryStick,
    HardDrive,
    ArrowUp,
    ArrowDown,
    Wifi,
    WifiOff,
    Clock,
    ChevronRight,
    RefreshCw,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useServices } from '@/contexts/ServicesContext';
import { useThemeColors, useTranslations } from '@/contexts/SettingsContext';
import { beszelApi } from '@/services/beszel-api';
import { BeszelSystem } from '@/types/beszel';
import { ThemeColors } from '@/constants/themes';
import { formatBytes } from '@/utils/formatters';
import { BeszelSystemInfo } from '@/types/beszel';

const BESZEL_COLOR = '#0EA5E9';

const formatGBCompact = (val: number | undefined): string => {
    if (!val || val === 0) return '0';
    if (val < 1) return `${(val * 1024).toFixed(0)}M`;
    return `${val.toFixed(1)}G`;
};

const formatNetRate = (val: number | undefined): string => {
    if (!val || val === 0) return '0 B/s';
    return `${formatBytes(val)}/s`;
};

export default function BeszelDashboard() {
    const { getConnection } = useServices();
    const connection = getConnection('beszel');
    const colors = useThemeColors();
    const t = useTranslations();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const systemsQuery = useQuery({
        queryKey: ['beszel-systems'],
        queryFn: () => beszelApi.getSystems(),
        enabled: !!connection,
        refetchInterval: 15000,
    });

    const systems = systemsQuery.data?.items ?? [];
    const onlineCount = systems.filter(s => s.status === 'up').length;

    const onRefresh = useCallback(() => {
        systemsQuery.refetch();
    }, [systemsQuery]);

    useEffect(() => {
        if (systemsQuery.isError && connection) {
            Alert.alert('Connessione fallita', 'Impossibile raggiungere Beszel. Verifica di essere sulla rete corretta o configura un URL alternativo nelle impostazioni.');
        }
    }, [systemsQuery.isError, connection]);

    const handleSystemPress = useCallback((system: BeszelSystem) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: '/beszel/[systemId]' as never, params: { systemId: system.id } });
    }, [router]);

    const s = makeStyles(colors);

    const formatUptimeHours = (seconds: number): string => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        if (days > 0) return `${days}d ${hours}h`;
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    return (
        <ScrollView
            style={s.container}
            contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 16 }]}
            refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={BESZEL_COLOR} />}
        >
            <View style={s.overviewCard}>
                <View style={s.overviewRow}>
                    <View style={[s.overviewIconWrap, { backgroundColor: BESZEL_COLOR + '18' }]}>
                        <Server size={20} color={BESZEL_COLOR} />
                    </View>
                    <View style={s.overviewContent}>
                        <Text style={s.overviewTitle}>{t.beszelSystems}</Text>
                        <Text style={s.overviewValue}>{systems.length}</Text>
                    </View>
                    <View style={s.overviewStats}>
                        <View style={s.overviewStat}>
                            <View style={[s.miniDot, { backgroundColor: colors.running }]} />
                            <Text style={[s.overviewStatText, { color: colors.running }]}>{onlineCount} {t.beszelUp}</Text>
                        </View>
                        <View style={s.overviewStat}>
                            <View style={[s.miniDot, { backgroundColor: colors.stopped }]} />
                            <Text style={[s.overviewStatText, { color: colors.stopped }]}>{systems.length - onlineCount} {t.beszelDown}</Text>
                        </View>
                    </View>
                </View>
            </View>

            <View style={s.refreshHint}>
                <RefreshCw size={12} color={colors.textMuted} />
                <Text style={s.refreshHintText}>{t.beszelRefreshRate}</Text>
            </View>

            {systemsQuery.isLoading ? (
                <View style={s.listContainer}>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </View>
            ) : systemsQuery.isError ? (
                <View style={s.emptyContainer}>
                    <WifiOff size={48} color={colors.danger} />
                    <Text style={s.emptyText}>{t.error}</Text>
                </View>
            ) : systems.length === 0 ? (
                <View style={s.emptyContainer}>
                    <Server size={48} color={colors.textMuted} />
                    <Text style={s.emptyText}>{t.beszelNoSystems}</Text>
                </View>
            ) : (
                <View style={s.listContainer}>
                    {systems.map((system) => (
                        <SystemCard
                            key={system.id}
                            system={system}
                            colors={colors}
                            t={t}
                            formatUptimeHours={formatUptimeHours}
                            onPress={() => handleSystemPress(system)}
                        />
                    ))}
                </View>
            )}

            <View style={{ height: 30 }} />
        </ScrollView>
    );
}

const SystemCard = React.memo(function SystemCard({
    system,
    colors,
    t,
    formatUptimeHours,
    onPress,
}: {
    system: BeszelSystem;
    colors: ThemeColors;
    t: ReturnType<typeof useTranslations>;
    formatUptimeHours: (s: number) => string;
    onPress: () => void;
}) {
    const isUp = system.status === 'up';
    const info = system.info;
    const s = makeStyles(colors);

    return (
        <TouchableOpacity
            style={[s.systemCard, { borderColor: isUp ? colors.border : colors.stopped + '33' }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={s.systemHeader}>
                <View style={s.systemNameRow}>
                    <View style={[s.systemStatusDot, { backgroundColor: isUp ? colors.running : colors.stopped }]} />
                    <Text style={s.systemName}>{system.name}</Text>
                </View>
                <View style={s.systemHeaderRight}>
                    <View style={[s.systemStatusBadge, { backgroundColor: isUp ? colors.running + '1A' : colors.stopped + '1A' }]}>
                        {isUp ? <Wifi size={12} color={colors.running} /> : <WifiOff size={12} color={colors.stopped} />}
                        <Text style={[s.systemStatusText, { color: isUp ? colors.running : colors.stopped }]}>
                            {isUp ? t.beszelUp : t.beszelDown}
                        </Text>
                    </View>
                    <ChevronRight size={16} color={colors.textMuted} />
                </View>
            </View>

            {isUp && info && (
                <>
                    <View style={s.metricsGrid}>
                        <View style={s.metricItem}>
                            <View style={s.metricHeader}>
                                <Cpu size={14} color={BESZEL_COLOR} />
                                <Text style={s.metricLabel}>{t.beszelCpu}</Text>
                                <Text style={s.metricValue}>{(info.cpu ?? 0).toFixed(1)}%</Text>
                            </View>
                            <View style={s.progressBar}>
                                <View style={[s.progressFill, { width: `${Math.min(info.cpu ?? 0, 100)}%` as unknown as number, backgroundColor: BESZEL_COLOR }]} />
                            </View>
                        </View>

                        <View style={s.metricItem}>
                            <View style={s.metricHeader}>
                                <MemoryStick size={14} color="#8B5CF6" />
                                <Text style={s.metricLabel}>{t.beszelMemory}</Text>
                                <Text style={s.metricValue}>{(info.mp ?? 0).toFixed(1)}%</Text>
                            </View>
                            <View style={s.progressBar}>
                                <View style={[s.progressFill, { width: `${Math.min(info.mp ?? 0, 100)}%` as unknown as number, backgroundColor: '#8B5CF6' }]} />
                            </View>
                        </View>

                        <View style={s.metricItem}>
                            <View style={s.metricHeader}>
                                <HardDrive size={14} color={colors.warning} />
                                <Text style={s.metricLabel}>{t.beszelDisk}</Text>
                                <Text style={s.metricValue}>{(info.dp ?? 0).toFixed(1)}%</Text>
                            </View>
                            <View style={s.progressBar}>
                                <View style={[s.progressFill, { width: `${Math.min(info.dp ?? 0, 100)}%` as unknown as number, backgroundColor: colors.warning }]} />
                            </View>
                        </View>
                    </View>

                    <View style={s.systemInfoRow}>
                        <View style={s.infoChip}>
                            <MemoryStick size={10} color="#8B5CF6" />
                            <Text style={s.infoChipText}>{formatGBCompact(info.m)} / {formatGBCompact(info.mt)}</Text>
                        </View>
                        <View style={s.infoChip}>
                            <HardDrive size={10} color={colors.warning} />
                            <Text style={s.infoChipText}>{formatGBCompact(info.d)} / {formatGBCompact(info.dt)}</Text>
                        </View>
                    </View>

                    <View style={s.systemFooter}>
                        <View style={s.footerItem}>
                            <ArrowUp size={12} color={colors.running} />
                            <Text style={s.footerText}>{formatNetRate(info.ns)}</Text>
                        </View>
                        <View style={s.footerItem}>
                            <ArrowDown size={12} color={colors.info} />
                            <Text style={s.footerText}>{formatNetRate(info.nr)}</Text>
                        </View>
                        <View style={s.footerItem}>
                            <Clock size={12} color={colors.textMuted} />
                            <Text style={s.footerText}>{formatUptimeHours(info.u ?? 0)}</Text>
                        </View>
                    </View>
                </>
            )}

            <Text style={s.systemHost}>{system.host}:{system.port}</Text>
        </TouchableOpacity>
    );
});

function makeStyles(colors: ThemeColors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        content: { paddingHorizontal: 16, paddingTop: 16 },
        listContainer: { paddingBottom: 40, gap: 12 },
        loadingContainer: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 12 },
        loadingText: { color: colors.textSecondary, fontSize: 14 },
        overviewCard: { backgroundColor: colors.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
        overviewRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
        overviewIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
        overviewContent: { flex: 1 },
        overviewTitle: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' as const },
        overviewValue: { fontSize: 28, fontWeight: '700' as const, color: colors.text },
        overviewStats: { gap: 4 },
        overviewStat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
        miniDot: { width: 7, height: 7, borderRadius: 4 },
        overviewStatText: { fontSize: 12, fontWeight: '600' as const },
        refreshHint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16, paddingHorizontal: 4 },
        refreshHintText: { fontSize: 12, color: colors.textMuted },
        emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
        emptyText: { color: colors.textSecondary, fontSize: 15 },
        systemCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 12 },
        systemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
        systemNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
        systemHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
        systemStatusDot: { width: 10, height: 10, borderRadius: 5 },
        systemName: { fontSize: 16, fontWeight: '600' as const, color: colors.text },
        systemStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
        systemStatusText: { fontSize: 11, fontWeight: '600' as const },
        metricsGrid: { gap: 12, marginBottom: 14 },
        metricItem: { gap: 6 },
        metricHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
        metricLabel: { fontSize: 12, color: colors.textSecondary, flex: 1 },
        metricValue: { fontSize: 13, color: colors.text, fontWeight: '600' as const },
        progressBar: { height: 6, backgroundColor: colors.surfaceHover, borderRadius: 3, overflow: 'hidden' },
        progressFill: { height: '100%', borderRadius: 3 },
        systemFooter: { flexDirection: 'row', gap: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, marginBottom: 8 },
        footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
        footerText: { fontSize: 11, color: colors.textMuted, fontWeight: '500' as const },
        systemHost: { fontSize: 11, color: colors.textMuted },
        systemInfoRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
        infoChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surfaceHover, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
        infoChipText: { fontSize: 10, color: colors.textSecondary, fontWeight: '500' as const },
    });
}

