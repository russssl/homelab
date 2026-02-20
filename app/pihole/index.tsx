import React, { useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SkeletonCard } from '@/components/SkeletonLoader';
import {
    Shield,
    ShieldOff,
    Search,
    Ban,
    BarChart3,
    Globe,
    Users,
    Database,
    Zap,
    RefreshCw,
    Clock,
    Server,
    AlertTriangle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useServices } from '@/contexts/ServicesContext';
import { useThemeColors, useTranslations } from '@/contexts/SettingsContext';
import { piholeApi } from '@/services/pihole-api';
import { ThemeColors } from '@/constants/themes';

const PIHOLE_COLOR = '#CD2326';

export default function PiholeDashboard() {
    const { getConnection } = useServices();
    const connection = getConnection('pihole');
    const colors = useThemeColors();
    const t = useTranslations();
    const queryClient = useQueryClient();

    const statsQuery = useQuery({
        queryKey: ['pihole-stats'],
        queryFn: () => piholeApi.getStats(),
        enabled: !!connection,
        refetchInterval: 15000,
    });

    const blockingQuery = useQuery({
        queryKey: ['pihole-blocking'],
        queryFn: () => piholeApi.getBlockingStatus(),
        enabled: !!connection,
        refetchInterval: 10000,
    });

    const topBlockedQuery = useQuery({
        queryKey: ['pihole-top-blocked'],
        queryFn: () => piholeApi.getTopBlocked(8),
        enabled: !!connection,
        refetchInterval: 30000,
    });

    const topClientsQuery = useQuery({
        queryKey: ['pihole-top-clients'],
        queryFn: () => piholeApi.getTopClients(10),
        enabled: !!connection,
        refetchInterval: 30000,
    });

    const historyQuery = useQuery({
        queryKey: ['pihole-history'],
        queryFn: () => piholeApi.getQueryHistory(),
        enabled: !!connection,
        refetchInterval: 60000,
    });

    const topDomainsQuery = useQuery({
        queryKey: ['pihole-top-domains'],
        queryFn: () => piholeApi.getTopDomains(10),
        enabled: !!connection,
        refetchInterval: 30000,
    });

    useEffect(() => {
        if (statsQuery.isError && connection) {
            Alert.alert('Connessione fallita', 'Impossibile raggiungere Pi-hole. Verifica di essere sulla rete corretta o configura un URL alternativo nelle impostazioni.');
        }
    }, [statsQuery.isError, connection]);

    const toggleMutation = useMutation({
        mutationFn: async (enabled: boolean) => {
            await piholeApi.setBlocking(enabled);
        },
        onSuccess: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            queryClient.invalidateQueries({ queryKey: ['pihole-blocking'] });
            queryClient.invalidateQueries({ queryKey: ['pihole-stats'] });
        },
        onError: (error) => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(t.error, error.message);
        },
    });

    const isBlocking = blockingQuery.data?.blocking === 'enabled';
    const stats = statsQuery.data;

    const handleToggle = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const newState = !isBlocking;
        const warningMessage = newState ? t.piholeBlockingWarningEnable : t.piholeBlockingWarningDisable;

        Alert.alert(
            t.piholeBlockingWarningTitle,
            warningMessage,
            [
                { text: t.cancel, style: 'cancel' },
                {
                    text: t.confirm,
                    style: newState ? 'default' : 'destructive',
                    onPress: () => toggleMutation.mutate(newState),
                },
            ]
        );
    }, [isBlocking, toggleMutation, t]);

    const onRefresh = useCallback(() => {
        statsQuery.refetch();
        blockingQuery.refetch();
        topBlockedQuery.refetch();
        topClientsQuery.refetch();
        topDomainsQuery.refetch();
        historyQuery.refetch();
    }, [statsQuery, blockingQuery, topBlockedQuery, topClientsQuery, topDomainsQuery, historyQuery]);

    const s = makeStyles(colors);

    if (statsQuery.isLoading && !stats) {
        return (
            <View style={s.loadingContainer}>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
            </View>
        );
    }

    const formatNumber = (n: number): string => {
        if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
        if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
        return String(n);
    };

    const formatGravityDate = (timestamp: number): string => {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp * 1000);
        return date.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const totalQueries = stats?.queries?.total ?? 0;
    const blockedQueries = stats?.queries?.blocked ?? 0;
    const cachedQueries = stats?.queries?.cached ?? 0;
    const forwardedQueries = stats?.queries?.forwarded ?? 0;
    const uniqueDomains = stats?.queries?.unique_domains ?? 0;

    const maxQuery = Math.max(totalQueries, 1);
    const blockedPercent = (blockedQueries / maxQuery) * 100;
    const cachedPercent = (cachedQueries / maxQuery) * 100;
    const forwardedPercent = (forwardedQueries / maxQuery) * 100;

    return (
        <ScrollView
            style={s.container}
            contentContainerStyle={s.content}
            refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={PIHOLE_COLOR} />}
        >
            <TouchableOpacity
                style={[s.blockingCard, { borderColor: isBlocking ? colors.running + '44' : colors.stopped + '44' }]}
                onPress={handleToggle}
                activeOpacity={0.8}
                disabled={toggleMutation.isPending}
            >
                <View style={[s.blockingIconWrap, { backgroundColor: isBlocking ? colors.running + '1A' : colors.stopped + '1A' }]}>
                    {isBlocking ? <Shield size={28} color={colors.running} /> : <ShieldOff size={28} color={colors.stopped} />}
                </View>
                <View style={s.blockingContent}>
                    <Text style={s.blockingTitle}>{t.piholeBlocking}</Text>
                    <Text style={[s.blockingStatus, { color: isBlocking ? colors.running : colors.stopped }]}>
                        {isBlocking ? t.piholeEnabled : t.piholeDisabled}
                    </Text>
                    <Text style={s.blockingDesc} numberOfLines={2}>
                        {isBlocking ? t.piholeBlockingDesc : t.piholeDisableDesc}
                    </Text>
                </View>
                <View style={[s.toggleIndicator, { backgroundColor: isBlocking ? colors.running : colors.stopped }]}>
                    <Text style={s.toggleText}>{isBlocking ? 'ON' : 'OFF'}</Text>
                </View>
            </TouchableOpacity>

            {stats && (
                <>
                    <View style={s.section}>
                        <Text style={s.sectionTitle}>{t.piholeOverview}</Text>
                        <View style={s.statsGrid}>
                            <View style={s.statCard}>
                                <View style={[s.statIconWrap, { backgroundColor: PIHOLE_COLOR + '18' }]}>
                                    <Search size={18} color={PIHOLE_COLOR} />
                                </View>
                                <Text style={s.statValue}>{formatNumber(totalQueries)}</Text>
                                <Text style={s.statLabel}>{t.piholeTotalQueries}</Text>
                            </View>
                            <View style={s.statCard}>
                                <View style={[s.statIconWrap, { backgroundColor: colors.stopped + '18' }]}>
                                    <Ban size={18} color={colors.stopped} />
                                </View>
                                <Text style={s.statValue}>{formatNumber(blockedQueries)}</Text>
                                <Text style={s.statLabel}>{t.piholeBlockedQueries}</Text>
                            </View>
                        </View>
                        <View style={s.statsGrid}>
                            <View style={s.statCard}>
                                <View style={[s.statIconWrap, { backgroundColor: colors.warning + '18' }]}>
                                    <BarChart3 size={18} color={colors.warning} />
                                </View>
                                <Text style={s.statValue}>{(stats.queries?.percent_blocked ?? 0).toFixed(1)}%</Text>
                                <Text style={s.statLabel}>{t.piholePercentBlocked}</Text>
                            </View>
                            <View style={s.statCard}>
                                <View style={[s.statIconWrap, { backgroundColor: colors.info + '18' }]}>
                                    <Globe size={18} color={colors.info} />
                                </View>
                                <Text style={s.statValue}>{formatNumber(uniqueDomains)}</Text>
                                <Text style={s.statLabel}>{t.piholeUniqueDomains}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={s.section}>
                        <Text style={s.sectionTitle}>{t.piholeQueryActivity}</Text>
                        <View style={s.activityCard}>
                            <View style={s.activityRow}>
                                <View style={s.activityLabel}>
                                    <View style={[s.activityDot, { backgroundColor: colors.stopped }]} />
                                    <Text style={s.activityText}>{t.piholeBlockedQueries}</Text>
                                </View>
                                <Text style={s.activityValue}>{formatNumber(blockedQueries)}</Text>
                            </View>
                            <View style={s.activityBarBg}>
                                <View style={[s.activityBarFill, { width: `${blockedPercent}%` as unknown as number, backgroundColor: colors.stopped }]} />
                            </View>

                            <View style={s.activityRow}>
                                <View style={s.activityLabel}>
                                    <View style={[s.activityDot, { backgroundColor: colors.running }]} />
                                    <Text style={s.activityText}>{t.piholeCached}</Text>
                                </View>
                                <Text style={s.activityValue}>{formatNumber(cachedQueries)}</Text>
                            </View>
                            <View style={s.activityBarBg}>
                                <View style={[s.activityBarFill, { width: `${cachedPercent}%` as unknown as number, backgroundColor: colors.running }]} />
                            </View>

                            <View style={s.activityRow}>
                                <View style={s.activityLabel}>
                                    <View style={[s.activityDot, { backgroundColor: colors.info }]} />
                                    <Text style={s.activityText}>{t.piholeForwarded}</Text>
                                </View>
                                <Text style={s.activityValue}>{formatNumber(forwardedQueries)}</Text>
                            </View>
                            <View style={s.activityBarBg}>
                                <View style={[s.activityBarFill, { width: `${forwardedPercent}%` as unknown as number, backgroundColor: colors.info }]} />
                            </View>
                        </View>
                    </View>

                    {historyQuery.data?.history && historyQuery.data.history.length > 0 && (
                        <View style={s.section}>
                            <Text style={s.sectionTitle}>{t.piholeQueriesOverTime}</Text>
                            <QueryGraph history={historyQuery.data.history} colors={colors} />
                        </View>
                    )}

                    <View style={s.section}>
                        <View style={s.gravityRow}>
                            <View style={[s.gravityIconWrap, { backgroundColor: PIHOLE_COLOR + '18' }]}>
                                <Database size={18} color={PIHOLE_COLOR} />
                            </View>
                            <View style={s.gravityContent}>
                                <Text style={s.gravityTitle}>{t.piholeGravity}</Text>
                                <Text style={s.gravityValue}>{formatNumber(stats.gravity?.domains_being_blocked ?? 0)}</Text>
                            </View>
                            {stats.gravity?.last_update > 0 && (
                                <View style={s.gravityDateWrap}>
                                    <Clock size={12} color={colors.textMuted} />
                                    <Text style={s.gravityDate}>{formatGravityDate(stats.gravity.last_update)}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </>
            )}

            {topBlockedQuery.data?.top_blocked && topBlockedQuery.data.top_blocked.length > 0 && (
                <View style={s.section}>
                    <Text style={s.sectionTitle}>{t.piholeTopBlocked}</Text>
                    <View style={s.listCard}>
                        {topBlockedQuery.data.top_blocked.map((item, idx) => (
                            <View key={idx} style={[s.listItem, idx < topBlockedQuery.data.top_blocked.length - 1 && s.listItemBorder]}>
                                <View style={s.listRank}>
                                    <Text style={s.listRankText}>{idx + 1}</Text>
                                </View>
                                <Text style={s.listDomain} numberOfLines={1}>{item.domain}</Text>
                                <Text style={s.listCount}>{formatNumber(item.count)}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {topDomainsQuery.data?.top_domains && topDomainsQuery.data.top_domains.length > 0 && (
                <View style={s.section}>
                    <View style={s.sectionTitleRow}>
                        <Text style={s.sectionTitle}>{t.piholeTopDomains}</Text>
                        <Text style={s.sectionTotalBadge}>
                            {formatNumber(topDomainsQuery.data.top_domains.reduce((sum, d) => sum + d.count, 0))} totali
                        </Text>
                    </View>
                    <View style={s.listCard}>
                        {(() => {
                            const maxCount = Math.max(1, ...topDomainsQuery.data.top_domains.map(d => d.count));
                            return topDomainsQuery.data.top_domains.map((item, idx) => (
                                <View key={idx} style={[s.listItem, idx < topDomainsQuery.data.top_domains.length - 1 && s.listItemBorder]}>
                                    <View style={[s.listRank, { backgroundColor: colors.running + '18' }]}>
                                        <Text style={[s.listRankText, { color: colors.running }]}>{idx + 1}</Text>
                                    </View>
                                    <View style={s.domainBarContainer}>
                                        <View style={[s.domainBarFill, { width: `${(item.count / maxCount) * 100}%` as unknown as number, backgroundColor: colors.running + '18' }]} />
                                        <Text style={s.listDomain} numberOfLines={1}>{item.domain}</Text>
                                    </View>
                                    <Text style={s.listCount}>{formatNumber(item.count)}</Text>
                                </View>
                            ));
                        })()}
                    </View>
                </View>
            )}

            {topClientsQuery.data?.top_clients && topClientsQuery.data.top_clients.length > 0 && (
                <View style={s.section}>
                    <Text style={s.sectionTitle}>{t.piholeClients}</Text>
                    <View style={s.listCard}>
                        {topClientsQuery.data.top_clients.map((client, idx) => (
                            <View key={idx} style={[s.listItem, idx < topClientsQuery.data.top_clients.length - 1 && s.listItemBorder]}>
                                <View style={[s.listRank, { backgroundColor: colors.info + '18' }]}>
                                    <Users size={12} color={colors.info} />
                                </View>
                                <View style={s.clientInfo}>
                                    <Text style={s.listDomain} numberOfLines={1}>{client.name || client.ip}</Text>
                                    {client.name && <Text style={s.clientIp}>{client.ip}</Text>}
                                </View>
                                <Text style={s.listCount}>{formatNumber(client.count)}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            <View style={{ height: 30 }} />
        </ScrollView>
    );
}

function QueryGraph({ history, colors }: { history: Array<{ timestamp: number; total: number; blocked: number }>; colors: ThemeColors }) {
    const recent = history.slice(-24);
    const maxVal = Math.max(1, ...recent.map(h => h.total));
    const graphHeight = 100;

    return (
        <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border }}>
            <View style={{ flexDirection: 'row' as const, alignItems: 'flex-end' as const, height: graphHeight, gap: 2 }}>
                {recent.map((item, i) => {
                    const totalH = Math.max(2, (item.total / maxVal) * graphHeight);
                    const blockedH = Math.max(0, (item.blocked / maxVal) * graphHeight);
                    const allowedH = totalH - blockedH;
                    return (
                        <View key={i} style={{ flex: 1, height: totalH, borderRadius: 2, overflow: 'hidden' as const }}>
                            <View style={{ flex: allowedH, backgroundColor: colors.running + '88', borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />
                            <View style={{ height: blockedH, backgroundColor: PIHOLE_COLOR + '99' }} />
                        </View>
                    );
                })}
            </View>
            <View style={{ flexDirection: 'row' as const, justifyContent: 'center' as const, gap: 16, marginTop: 12 }}>
                <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: colors.running + '88' }} />
                    <Text style={{ fontSize: 11, color: colors.textMuted }}>Allowed</Text>
                </View>
                <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: PIHOLE_COLOR + '99' }} />
                    <Text style={{ fontSize: 11, color: colors.textMuted }}>Blocked</Text>
                </View>
            </View>
        </View>
    );
}

function makeStyles(colors: ThemeColors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        content: { paddingHorizontal: 16, paddingTop: 16 },
        loadingContainer: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 12 },
        loadingText: { color: colors.textSecondary, fontSize: 14 },
        blockingCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 18, padding: 18, borderWidth: 1.5, marginBottom: 24, gap: 14 },
        blockingIconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
        blockingContent: { flex: 1 },
        blockingTitle: { fontSize: 16, fontWeight: '600' as const, color: colors.text, marginBottom: 2 },
        blockingStatus: { fontSize: 14, fontWeight: '600' as const, marginBottom: 4 },
        blockingDesc: { fontSize: 11, color: colors.textMuted, lineHeight: 15 },
        toggleIndicator: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
        toggleText: { color: '#FFF', fontSize: 13, fontWeight: '700' as const },
        section: { marginBottom: 24 },
        sectionTitle: { fontSize: 13, fontWeight: '600' as const, color: colors.textMuted, marginBottom: 12, textTransform: 'uppercase' as const, letterSpacing: 0.8 },
        statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 10 },
        statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 8 },
        statIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
        statValue: { fontSize: 22, fontWeight: '700' as const, color: colors.text },
        statLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' as const },
        activityCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 10 },
        activityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        activityLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        activityDot: { width: 8, height: 8, borderRadius: 4 },
        activityText: { fontSize: 13, color: colors.text, fontWeight: '500' as const },
        activityValue: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' as const },
        activityBarBg: { height: 6, backgroundColor: colors.surfaceHover, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
        activityBarFill: { height: '100%', borderRadius: 3 },
        gravityRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
        gravityIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
        gravityContent: { flex: 1 },
        gravityTitle: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' as const },
        gravityValue: { fontSize: 20, fontWeight: '700' as const, color: colors.text, marginTop: 2 },
        gravityDateWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
        gravityDate: { fontSize: 10, color: colors.textMuted },
        listCard: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
        listItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
        listItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
        listRank: { width: 28, height: 28, borderRadius: 8, backgroundColor: PIHOLE_COLOR + '18', alignItems: 'center', justifyContent: 'center' },
        listRankText: { fontSize: 12, fontWeight: '700' as const, color: PIHOLE_COLOR },
        listDomain: { flex: 1, fontSize: 13, color: colors.text, fontWeight: '500' as const },
        listCount: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' as const },
        clientInfo: { flex: 1 },
        clientIp: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
        sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
        sectionTotalBadge: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' as const, backgroundColor: colors.surfaceHover, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
        domainBarContainer: { flex: 1, position: 'relative', justifyContent: 'center', overflow: 'hidden', borderRadius: 6, paddingVertical: 2, paddingHorizontal: 4 },
        domainBarFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 6 },
    });
}

