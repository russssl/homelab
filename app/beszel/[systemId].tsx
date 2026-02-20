import React, { useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
    Cpu,
    MemoryStick,
    HardDrive,
    ArrowUp,
    ArrowDown,
    Clock,
    Monitor,
    Server,
    Wifi,
    WifiOff,
    Info,
    Layers,
    Box,
} from 'lucide-react-native';
import { useThemeColors, useTranslations } from '@/contexts/SettingsContext';
import { beszelApi } from '@/services/beszel-api';
import { ThemeColors } from '@/constants/themes';
import { formatBytes } from '@/utils/formatters';

const BESZEL_COLOR = '#0EA5E9';

export default function BeszelSystemDetail() {
    const { systemId } = useLocalSearchParams<{ systemId: string }>();
    const colors = useThemeColors();
    const t = useTranslations();

    const systemQuery = useQuery({
        queryKey: ['beszel-system', systemId],
        queryFn: () => beszelApi.getSystem(systemId),
        enabled: !!systemId,
        refetchInterval: 10000,
    });

    const recordsQuery = useQuery({
        queryKey: ['beszel-records', systemId],
        queryFn: () => beszelApi.getSystemRecords(systemId, 30),
        enabled: !!systemId,
        refetchInterval: 15000,
    });

    const system = systemQuery.data;
    const info = system?.info;
    const isUp = system?.status === 'up';
    const records = recordsQuery.data?.items ?? [];
    const latestRecord = records.length > 0 ? records[0] : null;
    const latestStats = latestRecord?.stats;

    const cpuHistory = useMemo(() => {
        return records.slice(0, 20).reverse().map(r => r.stats?.cpu ?? 0);
    }, [records]);

    const memHistory = useMemo(() => {
        return records.slice(0, 20).reverse().map(r => r.stats?.mp ?? 0);
    }, [records]);

    const containers = useMemo(() => {
        if (latestStats?.dc && Array.isArray(latestStats.dc)) {
            return latestStats.dc;
        }
        if (info) {
            const infoAny = info as unknown as Record<string, unknown>;
            if (infoAny['dc'] && Array.isArray(infoAny['dc'])) {
                return infoAny['dc'] as Array<{ n: string; cpu: number; m: number }>;
            }
        }
        return [];
    }, [latestStats, info]);

    const onRefresh = useCallback(() => {
        systemQuery.refetch();
        recordsQuery.refetch();
    }, [systemQuery, recordsQuery]);

    const s = makeStyles(colors);

    const formatUptimeHours = (seconds: number): string => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        if (days > 0) return `${days}d ${hours}h`;
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    const formatGBValue = (val: number | undefined): string => {
        if (val === undefined || val === null) return '0';
        if (val === 0) return '0';
        if (val < 0.01) return '< 0.01 GB';
        if (val < 1) return `${(val * 1024).toFixed(0)} MB`;
        return `${val.toFixed(1)} GB`;
    };

    const formatNetworkRate = (val: number | undefined): string => {
        if (val === undefined || val === null || val === 0) return '0 B/s';
        return `${formatBytes(val)}/s`;
    };

    if (systemQuery.isLoading && !system) {
        return (
            <View style={s.loadingContainer}>
                <ActivityIndicator size="large" color={BESZEL_COLOR} />
                <Text style={s.loadingText}>{t.loading}</Text>
            </View>
        );
    }

    if (!system) {
        return (
            <View style={s.loadingContainer}>
                <Server size={48} color={colors.textMuted} />
                <Text style={s.loadingText}>{t.noData}</Text>
            </View>
        );
    }

    const getUsageColor = (percent: number): string => {
        if (percent > 90) return colors.stopped;
        if (percent > 70) return colors.warning;
        return colors.running;
    };

    const memUsed = latestStats?.m ?? info?.m ?? 0;
    const memTotal = latestStats?.mt ?? info?.mt ?? 0;
    const diskUsed = latestStats?.d ?? info?.d ?? 0;
    const diskTotal = latestStats?.dt ?? info?.dt ?? 0;
    const netSent = latestStats?.ns ?? info?.ns ?? 0;
    const netRecv = latestStats?.nr ?? info?.nr ?? 0;

    return (
        <ScrollView
            style={s.container}
            contentContainerStyle={s.content}
            refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={BESZEL_COLOR} />}
        >
            <View style={s.headerCard}>
                <View style={s.headerRow}>
                    <View style={[s.headerIconWrap, { backgroundColor: isUp ? colors.running + '1A' : colors.stopped + '1A' }]}>
                        {isUp ? <Wifi size={24} color={colors.running} /> : <WifiOff size={24} color={colors.stopped} />}
                    </View>
                    <View style={s.headerInfo}>
                        <Text style={s.headerName}>{system.name}</Text>
                        <Text style={s.headerHost}>{system.host}:{system.port}</Text>
                    </View>
                    <View style={[s.statusBadge, { backgroundColor: isUp ? colors.running + '1A' : colors.stopped + '1A' }]}>
                        <View style={[s.statusDot, { backgroundColor: isUp ? colors.running : colors.stopped }]} />
                        <Text style={[s.statusText, { color: isUp ? colors.running : colors.stopped }]}>
                            {isUp ? t.beszelUp : t.beszelDown}
                        </Text>
                    </View>
                </View>
            </View>

            {info && (
                <>
                    <View style={s.section}>
                        <View style={s.sectionHeader}>
                            <Info size={16} color={BESZEL_COLOR} />
                            <Text style={s.sectionTitle}>{t.beszelSystemInfo}</Text>
                        </View>
                        <View style={s.infoCard}>
                            {info.os && (
                                <InfoRow label={t.beszelOs} value={info.os} colors={colors} />
                            )}
                            {info.k && (
                                <>
                                    <View style={s.divider} />
                                    <InfoRow label={t.beszelKernel} value={info.k} colors={colors} />
                                </>
                            )}
                            {info.h && (
                                <>
                                    <View style={s.divider} />
                                    <InfoRow label={t.beszelHostname} value={info.h} colors={colors} />
                                </>
                            )}
                            {info.cm && (
                                <>
                                    <View style={s.divider} />
                                    <InfoRow label={t.beszelCpuModel} value={info.cm} colors={colors} />
                                </>
                            )}
                            {info.c !== undefined && info.c > 0 && (
                                <>
                                    <View style={s.divider} />
                                    <InfoRow label={t.beszelCores} value={String(info.c)} colors={colors} />
                                </>
                            )}
                            <View style={s.divider} />
                            <InfoRow label={t.beszelUptime} value={formatUptimeHours(info.u ?? 0)} colors={colors} />
                        </View>
                    </View>

                    <View style={s.section}>
                        <View style={s.sectionHeader}>
                            <Layers size={16} color={BESZEL_COLOR} />
                            <Text style={s.sectionTitle}>{t.beszelResources}</Text>
                        </View>

                        <View style={s.resourceCard}>
                            <View style={s.resourceHeader}>
                                <View style={[s.resourceIconWrap, { backgroundColor: BESZEL_COLOR + '18' }]}>
                                    <Cpu size={18} color={BESZEL_COLOR} />
                                </View>
                                <Text style={s.resourceTitle}>{t.beszelCpu}</Text>
                                <Text style={[s.resourcePercent, { color: getUsageColor(info.cpu ?? 0) }]}>
                                    {(info.cpu ?? 0).toFixed(1)}%
                                </Text>
                            </View>
                            <View style={s.progressBarLarge}>
                                <View style={[s.progressFillLarge, { width: `${Math.min(info.cpu ?? 0, 100)}%` as unknown as number, backgroundColor: getUsageColor(info.cpu ?? 0) }]} />
                            </View>
                            {cpuHistory.length > 3 && (
                                <MiniGraph data={cpuHistory} color={BESZEL_COLOR} colors={colors} />
                            )}
                        </View>

                        <View style={s.resourceCard}>
                            <View style={s.resourceHeader}>
                                <View style={[s.resourceIconWrap, { backgroundColor: '#8B5CF618' }]}>
                                    <MemoryStick size={18} color="#8B5CF6" />
                                </View>
                                <Text style={s.resourceTitle}>{t.beszelMemory}</Text>
                                <Text style={[s.resourcePercent, { color: getUsageColor(info.mp ?? 0) }]}>
                                    {(info.mp ?? 0).toFixed(1)}%
                                </Text>
                            </View>
                            <View style={s.progressBarLarge}>
                                <View style={[s.progressFillLarge, { width: `${Math.min(info.mp ?? 0, 100)}%` as unknown as number, backgroundColor: getUsageColor(info.mp ?? 0) }]} />
                            </View>
                            <View style={s.resourceDetails}>
                                <Text style={s.resourceDetailText}>
                                    {t.beszelUsedMemory}: {formatGBValue(memUsed)}
                                </Text>
                                <Text style={s.resourceDetailText}>
                                    {t.beszelTotalMemory}: {formatGBValue(memTotal)}
                                </Text>
                            </View>
                            {memHistory.length > 3 && (
                                <MiniGraph data={memHistory} color="#8B5CF6" colors={colors} />
                            )}
                        </View>

                        <View style={s.resourceCard}>
                            <View style={s.resourceHeader}>
                                <View style={[s.resourceIconWrap, { backgroundColor: colors.warning + '18' }]}>
                                    <HardDrive size={18} color={colors.warning} />
                                </View>
                                <Text style={s.resourceTitle}>{t.beszelDisk}</Text>
                                <Text style={[s.resourcePercent, { color: getUsageColor(info.dp ?? 0) }]}>
                                    {(info.dp ?? 0).toFixed(1)}%
                                </Text>
                            </View>
                            <View style={s.progressBarLarge}>
                                <View style={[s.progressFillLarge, { width: `${Math.min(info.dp ?? 0, 100)}%` as unknown as number, backgroundColor: getUsageColor(info.dp ?? 0) }]} />
                            </View>
                            <View style={s.resourceDetails}>
                                <Text style={s.resourceDetailText}>
                                    {t.beszelUsedDisk}: {formatGBValue(diskUsed)}
                                </Text>
                                <Text style={s.resourceDetailText}>
                                    {t.beszelTotalDisk}: {formatGBValue(diskTotal)}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={s.section}>
                        <View style={s.sectionHeader}>
                            <Monitor size={16} color={BESZEL_COLOR} />
                            <Text style={s.sectionTitle}>{t.beszelNetworkTraffic}</Text>
                        </View>
                        <View style={s.networkGrid}>
                            <View style={s.networkCard}>
                                <View style={[s.networkIconWrap, { backgroundColor: colors.running + '18' }]}>
                                    <ArrowUp size={18} color={colors.running} />
                                </View>
                                <Text style={s.networkValue}>{formatNetworkRate(netSent)}</Text>
                                <Text style={s.networkLabel}>{t.beszelNetworkSent}</Text>
                            </View>
                            <View style={s.networkCard}>
                                <View style={[s.networkIconWrap, { backgroundColor: colors.info + '18' }]}>
                                    <ArrowDown size={18} color={colors.info} />
                                </View>
                                <Text style={s.networkValue}>{formatNetworkRate(netRecv)}</Text>
                                <Text style={s.networkLabel}>{t.beszelNetworkReceived}</Text>
                            </View>
                        </View>
                    </View>

                    {containers.length > 0 && (
                        <View style={s.section}>
                            <View style={s.sectionHeader}>
                                <Box size={16} color={BESZEL_COLOR} />
                                <Text style={s.sectionTitle}>{t.beszelContainers} ({containers.length})</Text>
                            </View>
                            <View style={s.containersList}>
                                {containers.map((container, idx) => (
                                    <View key={container.n + idx} style={[s.containerItem, idx < containers.length - 1 && s.containerItemBorder]}>
                                        <View style={s.containerIconWrap}>
                                            <Box size={14} color={BESZEL_COLOR} />
                                        </View>
                                        <Text style={s.containerName} numberOfLines={1}>{container.n}</Text>
                                        <View style={s.containerStats}>
                                            <View style={s.containerStatItem}>
                                                <Cpu size={10} color={colors.textMuted} />
                                                <Text style={s.containerStatText}>{(container.cpu ?? 0).toFixed(1)}%</Text>
                                            </View>
                                            <View style={s.containerStatItem}>
                                                <MemoryStick size={10} color={colors.textMuted} />
                                                <Text style={s.containerStatText}>{formatBytes(container.m ?? 0)}</Text>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    <View style={s.section}>
                        <View style={s.uptimeCard}>
                            <Clock size={18} color={colors.textMuted} />
                            <View>
                                <Text style={s.uptimeLabel}>{t.beszelUptime}</Text>
                                <Text style={s.uptimeValue}>{formatUptimeHours(info.u ?? 0)}</Text>
                            </View>
                        </View>
                    </View>
                </>
            )}

            <View style={{ height: 30 }} />
        </ScrollView>
    );
}

function MiniGraph({ data, color, colors }: { data: number[]; color: string; colors: ThemeColors }) {
    const maxVal = Math.max(1, ...data);
    const graphHeight = 40;

    return (
        <View style={{ flexDirection: 'row' as const, alignItems: 'flex-end' as const, height: graphHeight, gap: 2, marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: colors.border }}>
            {data.map((val, i) => {
                const barHeight = Math.max(2, (val / maxVal) * graphHeight);
                return (
                    <View
                        key={i}
                        style={{
                            flex: 1,
                            height: barHeight,
                            backgroundColor: color + '55',
                            borderRadius: 1,
                        }}
                    />
                );
            })}
        </View>
    );
}

function InfoRow({ label, value, colors }: { label: string; value: string; colors: ThemeColors }) {
    return (
        <View style={{ flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, paddingVertical: 12 }}>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>{label}</Text>
            <Text style={{ fontSize: 14, color: colors.text, fontWeight: '500' as const, maxWidth: '60%' as unknown as number, textAlign: 'right' as const }} numberOfLines={2}>{value}</Text>
        </View>
    );
}

function makeStyles(colors: ThemeColors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        content: { paddingHorizontal: 16, paddingTop: 16 },
        loadingContainer: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 12 },
        loadingText: { color: colors.textSecondary, fontSize: 14 },
        headerCard: { backgroundColor: colors.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: colors.border, marginBottom: 20 },
        headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
        headerIconWrap: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
        headerInfo: { flex: 1 },
        headerName: { fontSize: 20, fontWeight: '700' as const, color: colors.text },
        headerHost: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
        statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
        statusDot: { width: 8, height: 8, borderRadius: 4 },
        statusText: { fontSize: 12, fontWeight: '600' as const },
        section: { marginBottom: 20 },
        sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingHorizontal: 4 },
        sectionTitle: { fontSize: 14, fontWeight: '600' as const, color: colors.text },
        infoCard: { backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 4, borderWidth: 1, borderColor: colors.border },
        divider: { height: 1, backgroundColor: colors.border },
        resourceCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 10, gap: 10 },
        resourceHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
        resourceIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
        resourceTitle: { fontSize: 15, fontWeight: '600' as const, color: colors.text, flex: 1 },
        resourcePercent: { fontSize: 18, fontWeight: '700' as const },
        progressBarLarge: { height: 8, backgroundColor: colors.surfaceHover, borderRadius: 4, overflow: 'hidden' },
        progressFillLarge: { height: '100%', borderRadius: 4 },
        resourceDetails: { flexDirection: 'row', justifyContent: 'space-between' },
        resourceDetailText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' as const },
        networkGrid: { flexDirection: 'row', gap: 10 },
        networkCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 8 },
        networkIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
        networkValue: { fontSize: 16, fontWeight: '700' as const, color: colors.text },
        networkLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' as const },
        containersList: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
        containerItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
        containerItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
        containerIconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: BESZEL_COLOR + '15', alignItems: 'center', justifyContent: 'center' },
        containerName: { flex: 1, fontSize: 13, fontWeight: '500' as const, color: colors.text },
        containerStats: { flexDirection: 'row', gap: 12 },
        containerStatItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
        containerStatText: { fontSize: 11, color: colors.textMuted, fontWeight: '500' as const },
        uptimeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
        uptimeLabel: { fontSize: 13, color: colors.textSecondary },
        uptimeValue: { fontSize: 18, fontWeight: '700' as const, color: colors.text, marginTop: 2 },
    });
}

