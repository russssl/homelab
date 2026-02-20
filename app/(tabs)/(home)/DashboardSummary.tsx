import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { Box, Shield, Server, GitBranch } from 'lucide-react-native';

import { useServices } from '@/contexts/ServicesContext';
import { useThemeColors, useTranslations } from '@/contexts/SettingsContext';
import { portainerApi } from '@/services/portainer-api';
import { piholeApi } from '@/services/pihole-api';
import { beszelApi } from '@/services/beszel-api';
import { giteaApi } from '@/services/gitea-api';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { SERVICE_COLORS } from '@/types/services';
import { Alert } from 'react-native';
import { GlassCard, GlassGroup } from '@/components/LiquidGlass';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 32 - 12) / 2;

const SummaryCard = ({
    title,
    value,
    subValue,
    icon: Icon,
    color,
    isLoading,
    isConnected,
    index,
    colors,
}: any) => {
    if (!isConnected) return null;

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 100 + 400).duration(400).springify()}
            style={{ width: CARD_WIDTH, marginBottom: 12 }}
        >
            {/* GlassCard: effect='regular' — summary data cards are nav-layer controls */}
            <GlassCard
                effect="regular"
                style={[styles.card, styles.glassCard]}
                fallbackStyle={{
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1,
                }}
            >
                <View style={styles.cardInner}>
                    <View style={[styles.iconWrap, { backgroundColor: color + '15' }]}>
                        <Icon size={20} color={color} />
                    </View>
                    <View style={styles.valueRow}>
                        {isLoading ? (
                            <SkeletonLoader width={60} height={24} borderRadius={6} />
                        ) : (
                            <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
                        )}
                    </View>
                    <View style={styles.titleRow}>
                        <Text style={[styles.title, { color: colors.textMuted }]}>{title}</Text>
                        {subValue && !isLoading && (
                            <Text style={[styles.subValue, { color: colors.textSecondary }]}>{subValue}</Text>
                        )}
                    </View>
                </View>
            </GlassCard>
        </Animated.View>
    );
};

export const DashboardSummary = () => {
    const { isConnected, isReachable } = useServices();
    const colors = useThemeColors();
    const t = useTranslations();

    const isPortainerConnected = isConnected('portainer');
    const isPiholeConnected = isConnected('pihole');
    const isBeszelConnected = isConnected('beszel');
    const isGiteaConnected = isConnected('gitea');
    const hasAlertedRef = React.useRef(false);

    // Muted the query error logging to keep UI clean, these will silently fail/spin if unconfigured. Focus is on data fetching.

    // --- Portainer ---
    const endpointsQuery = useQuery({
        queryKey: ['portainer-endpoints'],
        queryFn: () => portainerApi.getEndpoints(),
        enabled: isPortainerConnected && isReachable('portainer') !== false,
        staleTime: 30000,
    });

    const portainerContainersQuery = useQuery({
        queryKey: ['portainer-containers', endpointsQuery.data?.[0]?.Id],
        queryFn: () => portainerApi.getContainers(endpointsQuery.data![0].Id),
        enabled: isPortainerConnected && isReachable('portainer') !== false && !!endpointsQuery.data?.[0]?.Id,
        staleTime: 30000,
    });

    let pRunning = 0;
    let pTotal = 0;
    if (portainerContainersQuery.data) {
        pTotal = portainerContainersQuery.data.length;
        pRunning = portainerContainersQuery.data.filter(c => c.State === 'running').length;
    }

    // --- Pi-hole ---
    const piholeStatsQuery = useQuery({
        queryKey: ['pihole-stats'],
        queryFn: () => piholeApi.getStats(),
        enabled: isPiholeConnected && isReachable('pihole') !== false,
        staleTime: 30000,
    });

    let piTotalQueriesText = '0';
    if (piholeStatsQuery.data) {
        piTotalQueriesText = (piholeStatsQuery.data.queries?.total ?? 0).toLocaleString();
    }

    // --- Beszel ---
    const beszelSystemsQuery = useQuery({
        queryKey: ['beszel-systems'],
        queryFn: () => beszelApi.getSystems(),
        enabled: isBeszelConnected && isReachable('beszel') !== false,
        staleTime: 30000,
    });

    let bOnline = 0;
    let bTotal = 0;
    if (beszelSystemsQuery.data?.items) {
        bTotal = beszelSystemsQuery.data.items.length;
        bOnline = beszelSystemsQuery.data.items.filter(s => s.status === 'up').length;
    }

    // --- Gitea ---
    const giteaReposQuery = useQuery({
        queryKey: ['gitea-repos'],
        queryFn: () => giteaApi.getUserRepos(1, 100),
        enabled: isGiteaConnected && isReachable('gitea') !== false,
        staleTime: 30000,
    });

    let gTotal = 0;
    if (giteaReposQuery.data) {
        gTotal = giteaReposQuery.data.length;
    }

    React.useEffect(() => {
        if (!hasAlertedRef.current) {
            const hasError = portainerContainersQuery.isError || piholeStatsQuery.isError || beszelSystemsQuery.isError || giteaReposQuery.isError;
            if (hasError) {
                hasAlertedRef.current = true;
                Alert.alert(
                    'Servizio Non Raggiungibile',
                    'Impossibile connettersi ad uno o più servizi. Assicurati di essere connesso alla tua rete locale o VPN (es. Tailscale).',
                    [{ text: 'OK' }]
                );
            }
        }
    }, [portainerContainersQuery.isError, piholeStatsQuery.isError, beszelSystemsQuery.isError, giteaReposQuery.isError]);

    const hasAnyConnection = isPortainerConnected || isPiholeConnected || isBeszelConnected || isGiteaConnected;

    if (!hasAnyConnection) return null;

    return (
        <View style={styles.container}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.summaryTitle}</Text>
            {/* GlassGroup: MANDATORY — 4 sibling SummaryCards must share a container */}
            <GlassGroup spacing={12} style={styles.grid}>
                <SummaryCard
                    title={t.portainerContainers}
                    value={pRunning.toString()}
                    subValue={`/ ${pTotal}`}
                    icon={Box}
                    color={SERVICE_COLORS.portainer.primary}
                    isLoading={portainerContainersQuery.isLoading}
                    isConnected={isPortainerConnected}
                    colors={colors}
                    index={0}
                />
                <SummaryCard
                    title={t.summaryQueryTotal}
                    value={piTotalQueriesText}
                    subValue=""
                    icon={Shield}
                    color={SERVICE_COLORS.pihole.primary}
                    isLoading={piholeStatsQuery.isLoading}
                    isConnected={isPiholeConnected}
                    colors={colors}
                    index={1}
                />
                <SummaryCard
                    title={t.summarySystemsOnline}
                    value={bOnline.toString()}
                    subValue={`/ ${bTotal}`}
                    icon={Server}
                    color={SERVICE_COLORS.beszel.primary}
                    isLoading={beszelSystemsQuery.isLoading}
                    isConnected={isBeszelConnected}
                    colors={colors}
                    index={2}
                />
                <SummaryCard
                    title={t.giteaRepos}
                    value={gTotal.toString()}
                    subValue=""
                    icon={GitBranch}
                    color={SERVICE_COLORS.gitea.primary}
                    isLoading={giteaReposQuery.isLoading}
                    isConnected={isGiteaConnected}
                    colors={colors}
                    index={3}
                />
            </GlassGroup>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 24,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    card: {
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        minHeight: 90,
    },
    glassCard: {
        borderWidth: 0,
        overflow: 'hidden',
    },
    cardInner: {
        flex: 1,
        justifyContent: 'space-between',
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    valueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 4,
    },
    value: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    title: {
        fontSize: 13,
        fontWeight: '500',
    },
    subValue: {
        fontSize: 12,
    },
});
