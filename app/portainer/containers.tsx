import React, { useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    RefreshControl,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Search, X, Play, Square, RotateCcw, Filter } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useThemeColors, useTranslations } from '@/contexts/SettingsContext';
import { portainerApi } from '@/services/portainer-api';
import { Container, ContainerAction } from '@/types/portainer';
import { getContainerName, formatDate } from '@/utils/formatters';
import StatusBadge from '@/components/StatusBadge';
import { ThemeColors } from '@/constants/themes';

type FilterType = 'all' | 'running' | 'stopped';

export default function ContainersScreen() {
    const { endpointId } = useLocalSearchParams<{ endpointId: string }>();
    const epId = Number(endpointId);
    const router = useRouter();
    const queryClient = useQueryClient();
    const colors = useThemeColors();
    const t = useTranslations();
    const [search, setSearch] = useState<string>('');
    const [filter, setFilter] = useState<FilterType>('all');

    const containersQuery = useQuery({
        queryKey: ['portainer-containers', epId],
        queryFn: () => portainerApi.getContainers(epId),
        enabled: !!epId,
        refetchInterval: 10000,
    });

    const actionMutation = useMutation({
        mutationFn: async ({ containerId, action }: { containerId: string; action: ContainerAction }) => {
            await portainerApi.containerAction(epId, containerId, action);
        },
        onSuccess: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            queryClient.invalidateQueries({ queryKey: ['portainer-containers', epId] });
        },
        onError: (error) => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(t.error, error.message);
        },
    });

    const containers = containersQuery.data ?? [];

    const filteredContainers = useMemo(() => {
        let result = containers;
        if (filter === 'running') result = result.filter(c => c.State === 'running');
        else if (filter === 'stopped') result = result.filter(c => c.State === 'exited' || c.State === 'dead');
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(c => getContainerName(c.Names).toLowerCase().includes(q) || c.Image.toLowerCase().includes(q));
        }
        return result;
    }, [containers, filter, search]);

    const handleAction = useCallback((containerId: string, action: ContainerAction) => {
        const labels: Record<ContainerAction, string> = { start: t.actionStart, stop: t.actionStop, restart: t.actionRestart, pause: t.actionPause, unpause: t.actionResume, kill: t.actionKill };
        Alert.alert(`${labels[action]} Container`, t.actionConfirmMessage, [
            { text: t.cancel, style: 'cancel' },
            {
                text: labels[action],
                style: action === 'stop' || action === 'kill' ? 'destructive' : 'default',
                onPress: () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    actionMutation.mutate({ containerId, action });
                },
            },
        ]);
    }, [actionMutation, t]);

    const s = makeStyles(colors);

    const renderContainer = useCallback(({ item }: { item: Container }) => {
        const name = getContainerName(item.Names);
        const isRunning = item.State === 'running';
        return (
            <TouchableOpacity
                style={s.containerCard}
                onPress={() => router.push({ pathname: '/portainer/[containerId]' as never, params: { containerId: item.Id, endpointId: String(epId) } })}
                activeOpacity={0.7}
            >
                <View style={s.containerHeader}>
                    <View style={s.containerNameRow}>
                        <Text style={s.containerName} numberOfLines={1}>{name}</Text>
                        <StatusBadge state={item.State} />
                    </View>
                    <Text style={s.containerImage} numberOfLines={1}>{item.Image}</Text>
                </View>
                <View style={s.containerMeta}>
                    <Text style={s.containerStatus}>{item.Status}</Text>
                    <Text style={s.containerCreated}>{formatDate(item.Created)}</Text>
                </View>
                {item.Ports.length > 0 && (
                    <View style={s.portsRow}>
                        {item.Ports.filter(p => p.PublicPort).slice(0, 3).map((port, idx) => (
                            <View key={idx} style={s.portBadge}>
                                <Text style={s.portText}>{port.PublicPort}:{port.PrivatePort}/{port.Type}</Text>
                            </View>
                        ))}
                    </View>
                )}
                <View style={s.containerActions}>
                    {isRunning ? (
                        <>
                            <TouchableOpacity style={[s.actionBtn, s.actionStop]} onPress={() => handleAction(item.Id, 'stop')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Square size={14} color={colors.stopped} />
                                <Text style={[s.actionBtnText, { color: colors.stopped }]}>{t.actionStop}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[s.actionBtn, s.actionRestart]} onPress={() => handleAction(item.Id, 'restart')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <RotateCcw size={14} color={colors.warning} />
                                <Text style={[s.actionBtnText, { color: colors.warning }]}>{t.actionRestart}</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <TouchableOpacity style={[s.actionBtn, s.actionStart]} onPress={() => handleAction(item.Id, 'start')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Play size={14} color={colors.running} />
                            <Text style={[s.actionBtnText, { color: colors.running }]}>{t.actionStart}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </TouchableOpacity>
        );
    }, [handleAction, router, colors, t, s, epId]);

    if (!epId) {
        return (
            <View style={s.emptyContainer}>
                <Text style={s.emptyText}>{t.containersNoEndpoint}</Text>
            </View>
        );
    }

    const filterLabels: Record<FilterType, string> = { all: t.containersAll, running: t.containersRunning, stopped: t.containersStopped };

    return (
        <View style={s.container}>
            <View style={s.searchBar}>
                <Search size={18} color={colors.textMuted} />
                <TextInput testID="search-input" style={s.searchInput} placeholder={t.containersSearch} placeholderTextColor={colors.textMuted} value={search} onChangeText={setSearch} autoCapitalize="none" autoCorrect={false} />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')}><X size={18} color={colors.textMuted} /></TouchableOpacity>
                )}
            </View>
            <View style={s.filterRow}>
                {(['all', 'running', 'stopped'] as FilterType[]).map((f) => (
                    <TouchableOpacity key={f} style={[s.filterChip, filter === f && s.filterChipActive]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFilter(f); }}>
                        <Text style={[s.filterChipText, filter === f && s.filterChipTextActive]}>
                            {filterLabels[f]} ({f === 'all' ? containers.length : f === 'running' ? containers.filter(c => c.State === 'running').length : containers.filter(c => c.State === 'exited' || c.State === 'dead').length})
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            {containersQuery.isLoading ? (
                <View style={s.emptyContainer}><ActivityIndicator size="large" color="#13B5EA" /></View>
            ) : (
                <FlatList
                    data={filteredContainers}
                    renderItem={renderContainer}
                    keyExtractor={(item) => item.Id}
                    contentContainerStyle={s.listContent}
                    refreshControl={<RefreshControl refreshing={false} onRefresh={() => containersQuery.refetch()} tintColor="#13B5EA" />}
                    ListEmptyComponent={<View style={s.emptyContainer}><Filter size={40} color={colors.textMuted} /><Text style={s.emptyText}>{t.containersEmpty}</Text></View>}
                />
            )}
        </View>
    );
}

function makeStyles(colors: ThemeColors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, marginHorizontal: 16, marginTop: 12, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, gap: 8 },
        searchInput: { flex: 1, paddingVertical: 12, color: colors.text, fontSize: 15 },
        filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
        filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
        filterChipActive: { backgroundColor: '#13B5EA1A', borderColor: '#13B5EA55' },
        filterChipText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' as const },
        filterChipTextActive: { color: '#13B5EA' },
        listContent: { paddingHorizontal: 16, paddingBottom: 20 },
        containerCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
        containerHeader: { marginBottom: 10 },
        containerNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
        containerName: { fontSize: 16, fontWeight: '600' as const, color: colors.text, flex: 1 },
        containerImage: { fontSize: 13, color: colors.textMuted },
        containerMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
        containerStatus: { fontSize: 12, color: colors.textSecondary },
        containerCreated: { fontSize: 12, color: colors.textMuted },
        portsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
        portBadge: { backgroundColor: colors.infoBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
        portText: { fontSize: 11, color: colors.info },
        containerActions: { flexDirection: 'row', gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
        actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
        actionStart: { backgroundColor: colors.successBg },
        actionStop: { backgroundColor: colors.dangerBg },
        actionRestart: { backgroundColor: colors.warningBg },
        actionBtnText: { fontSize: 13, fontWeight: '600' as const },
        emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
        emptyText: { color: colors.textSecondary, fontSize: 15 },
    });
}

