import React, { useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Alert,
    TextInput,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Play, Square, RotateCcw, Trash2, Pause, Network, HardDrive,
    Tag, Terminal, Cpu, MemoryStick, ArrowDown, ArrowUp, Copy,
    Edit3, Check, X, FileCode, Save,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useThemeColors, useTranslations } from '@/contexts/SettingsContext';
import { portainerApi, PortainerStack } from '@/services/portainer-api';
import { ContainerAction } from '@/types/portainer';
import { formatBytes, formatUptime, formatDate, calculateCpuPercent } from '@/utils/formatters';
import StatusBadge from '@/components/StatusBadge';
import { ThemeColors } from '@/constants/themes';

type TabType = 'info' | 'stats' | 'logs' | 'env' | 'compose';

export default function ContainerDetailScreen() {
    const { containerId, endpointId } = useLocalSearchParams<{ containerId: string; endpointId: string }>();
    const epId = Number(endpointId);
    const queryClient = useQueryClient();
    const colors = useThemeColors();
    const t = useTranslations();
    const [activeTab, setActiveTab] = useState<TabType>('info');
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [editName, setEditName] = useState<string>('');
    const [composeContent, setComposeContent] = useState<string>('');
    const [composeEdited, setComposeEdited] = useState<boolean>(false);

    const detailQuery = useQuery({
        queryKey: ['container-detail', epId, containerId],
        queryFn: () => portainerApi.getContainerDetail(epId, containerId!),
        enabled: !!epId && !!containerId,
        refetchInterval: 10000,
    });

    const statsQuery = useQuery({
        queryKey: ['container-stats', epId, containerId],
        queryFn: () => portainerApi.getContainerStats(epId, containerId!),
        enabled: !!epId && !!containerId && activeTab === 'stats',
        refetchInterval: 5000,
    });

    const logsQuery = useQuery({
        queryKey: ['container-logs', epId, containerId],
        queryFn: () => portainerApi.getContainerLogs(epId, containerId!, 200),
        enabled: !!epId && !!containerId && activeTab === 'logs',
        refetchInterval: 10000,
    });

    const stacksQuery = useQuery({
        queryKey: ['portainer-stacks', epId],
        queryFn: () => portainerApi.getStacks(epId),
        enabled: !!epId && activeTab === 'compose',
    });

    const detail = detailQuery.data;
    const stats = statsQuery.data;
    const containerName = detail?.Name?.replace(/^\//, '') ?? t.loading;

    const matchedStack = useMemo(() => {
        if (!stacksQuery.data || !detail) return null;
        const projectName = detail.Config.Labels?.['com.docker.compose.project'];
        if (!projectName) return null;
        return stacksQuery.data.find((s: PortainerStack) => s.Name.toLowerCase() === projectName.toLowerCase()) ?? null;
    }, [stacksQuery.data, detail]);

    const stackFileQuery = useQuery({
        queryKey: ['stack-file', matchedStack?.Id],
        queryFn: async () => {
            const result = await portainerApi.getStackFile(matchedStack!.Id);
            return result.StackFileContent;
        },
        enabled: !!matchedStack && activeTab === 'compose',
    });

    React.useEffect(() => {
        if (stackFileQuery.data && !composeEdited) {
            setComposeContent(stackFileQuery.data);
        }
    }, [stackFileQuery.data, composeEdited]);

    const saveComposeMutation = useMutation({
        mutationFn: async () => {
            if (!matchedStack) throw new Error('No stack found');
            await portainerApi.updateStackFile(matchedStack.Id, epId, composeContent, matchedStack.Env);
        },
        onSuccess: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setComposeEdited(false);
            queryClient.invalidateQueries({ queryKey: ['stack-file', matchedStack?.Id] });
            Alert.alert(t.confirm, t.detailComposeSaved);
        },
        onError: (error) => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(t.error, error.message);
        },
    });

    const actionMutation = useMutation({
        mutationFn: async (action: ContainerAction) => {
            await portainerApi.containerAction(epId, containerId!, action);
        },
        onSuccess: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            queryClient.invalidateQueries({ queryKey: ['container-detail', epId, containerId] });
            queryClient.invalidateQueries({ queryKey: ['portainer-containers', epId] });
        },
        onError: (error) => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(t.error, error.message);
        },
    });

    const removeMutation = useMutation({
        mutationFn: async () => { await portainerApi.removeContainer(epId, containerId!, true); },
        onSuccess: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            queryClient.invalidateQueries({ queryKey: ['portainer-containers', epId] });
        },
        onError: (error) => { Alert.alert(t.error, error.message); },
    });

    const renameMutation = useMutation({
        mutationFn: async (newName: string) => { await portainerApi.renameContainer(epId, containerId!, newName); },
        onSuccess: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setIsEditing(false);
            detailQuery.refetch();
        },
        onError: (error) => { Alert.alert(t.error, error.message); },
    });

    const handleAction = useCallback((action: ContainerAction) => {
        const labels: Record<ContainerAction, string> = { start: t.actionStart, stop: t.actionStop, restart: t.actionRestart, pause: t.actionPause, unpause: t.actionResume, kill: t.actionKill };
        Alert.alert(`${labels[action]} Container`, t.actionConfirmMessage, [
            { text: t.cancel, style: 'cancel' },
            { text: labels[action], style: action === 'stop' || action === 'kill' ? 'destructive' : 'default', onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); actionMutation.mutate(action); } },
        ]);
    }, [actionMutation, t]);

    const handleRemove = useCallback(() => {
        Alert.alert(t.actionRemoveConfirm, t.actionRemoveMessage, [
            { text: t.cancel, style: 'cancel' },
            { text: t.actionRemove, style: 'destructive', onPress: () => removeMutation.mutate() },
        ]);
    }, [removeMutation, t]);

    const cpuPercent = useMemo(() => {
        if (!stats) return 0;
        const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
        const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
        return calculateCpuPercent(cpuDelta, systemDelta, stats.cpu_stats.online_cpus);
    }, [stats]);

    const memPercent = useMemo(() => {
        if (!stats || !stats.memory_stats.limit) return 0;
        return (stats.memory_stats.usage / stats.memory_stats.limit) * 100;
    }, [stats]);

    const networkStats = useMemo(() => {
        if (!stats?.networks) return { rx: 0, tx: 0 };
        let rx = 0, tx = 0;
        Object.values(stats.networks).forEach(n => { rx += n.rx_bytes; tx += n.tx_bytes; });
        return { rx, tx };
    }, [stats]);

    const onRefresh = useCallback(() => {
        detailQuery.refetch();
        if (activeTab === 'stats') statsQuery.refetch();
        if (activeTab === 'logs') logsQuery.refetch();
    }, [detailQuery, statsQuery, logsQuery, activeTab]);

    const copyToClipboard = useCallback(async (text: string) => {
        try { await Clipboard.setStringAsync(text); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) { console.log('[Clipboard] Copy failed:', e); }
    }, []);

    const s = makeStyles(colors);

    if (detailQuery.isLoading) {
        return (<View style={s.loadingContainer}><Stack.Screen options={{ title: t.loading }} /><ActivityIndicator size="large" color="#13B5EA" /></View>);
    }
    if (!detail) {
        return (<View style={s.loadingContainer}><Stack.Screen options={{ title: t.error }} /><Text style={s.errorText}>{t.detailNotFound}</Text></View>);
    }

    const isRunning = detail.State.Running;
    const isPaused = detail.State.Paused;
    const tabItems: { key: TabType; label: string }[] = [
        { key: 'info', label: t.detailInfo }, { key: 'stats', label: t.detailStats },
        { key: 'logs', label: t.detailLogs }, { key: 'env', label: t.detailEnv },
        { key: 'compose', label: t.detailCompose },
    ];

    return (
        <ScrollView style={s.container} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor="#13B5EA" />}>
            <Stack.Screen options={{ title: containerName }} />

            <View style={s.headerCard}>
                <View style={s.headerTop}>
                    {isEditing ? (
                        <View style={s.editRow}>
                            <TextInput style={s.editInput} value={editName} onChangeText={setEditName} autoFocus />
                            <TouchableOpacity onPress={() => { if (editName.trim() && editName.trim() !== containerName) renameMutation.mutate(editName.trim()); else setIsEditing(false); }} style={s.editBtn}><Check size={18} color={colors.running} /></TouchableOpacity>
                            <TouchableOpacity onPress={() => setIsEditing(false)} style={s.editBtn}><X size={18} color={colors.stopped} /></TouchableOpacity>
                        </View>
                    ) : (
                        <View style={s.nameRow}>
                            <Text style={s.headerName} numberOfLines={1}>{containerName}</Text>
                            <TouchableOpacity onPress={() => { setEditName(containerName); setIsEditing(true); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Edit3 size={16} color={colors.textMuted} /></TouchableOpacity>
                        </View>
                    )}
                    <StatusBadge state={detail.State.Status} size="medium" />
                </View>
                <Text style={s.headerImage}>{detail.Config.Image}</Text>
                {isRunning && detail.State.StartedAt && <Text style={s.headerUptime}>{t.detailUptime}: {formatUptime(detail.State.StartedAt)}</Text>}
            </View>

            <View style={s.actionsRow}>
                {isRunning ? (
                    <>
                        <TouchableOpacity style={[s.actionButton, { backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: colors.stopped + '33' }]} onPress={() => handleAction('stop')}><Square size={16} color={colors.stopped} /><Text style={[s.actionLabel, { color: colors.stopped }]}>{t.actionStop}</Text></TouchableOpacity>
                        <TouchableOpacity style={[s.actionButton, { backgroundColor: colors.warningBg, borderWidth: 1, borderColor: colors.warning + '33' }]} onPress={() => handleAction('restart')}><RotateCcw size={16} color={colors.warning} /><Text style={[s.actionLabel, { color: colors.warning }]}>{t.actionRestart}</Text></TouchableOpacity>
                        {isPaused ? (
                            <TouchableOpacity style={[s.actionButton, { backgroundColor: colors.successBg, borderWidth: 1, borderColor: colors.running + '33' }]} onPress={() => handleAction('unpause')}><Play size={16} color={colors.running} /><Text style={[s.actionLabel, { color: colors.running }]}>{t.actionResume}</Text></TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={[s.actionButton, { backgroundColor: colors.infoBg, borderWidth: 1, borderColor: colors.info + '33' }]} onPress={() => handleAction('pause')}><Pause size={16} color={colors.info} /><Text style={[s.actionLabel, { color: colors.info }]}>{t.actionPause}</Text></TouchableOpacity>
                        )}
                    </>
                ) : (
                    <>
                        <TouchableOpacity style={[s.actionButton, { backgroundColor: colors.successBg, borderWidth: 1, borderColor: colors.running + '33' }]} onPress={() => handleAction('start')}><Play size={16} color={colors.running} /><Text style={[s.actionLabel, { color: colors.running }]}>{t.actionStart}</Text></TouchableOpacity>
                        <TouchableOpacity style={[s.actionButton, { backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: colors.stopped + '33' }]} onPress={handleRemove}><Trash2 size={16} color={colors.danger} /><Text style={[s.actionLabel, { color: colors.danger }]}>{t.actionRemove}</Text></TouchableOpacity>
                    </>
                )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBarScroll} contentContainerStyle={s.tabBarContent}>
                {tabItems.map((tab) => (
                    <TouchableOpacity key={tab.key} style={[s.tab, activeTab === tab.key && s.tabActive]} onPress={() => setActiveTab(tab.key)}>
                        {tab.key === 'compose' && <FileCode size={14} color={activeTab === tab.key ? '#13B5EA' : colors.textMuted} />}
                        <Text style={[s.tabText, activeTab === tab.key && s.tabTextActive]}>{tab.label}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {activeTab === 'info' && (
                <View style={s.tabContent}>
                    <View style={s.infoCard}>
                        <Text style={s.infoCardTitle}>{t.detailContainer}</Text>
                        <InfoRow label="ID" value={detail.Id.substring(0, 12)} onCopy={() => copyToClipboard(detail.Id)} colors={colors} />
                        <InfoRow label={t.detailCreated} value={formatDate(detail.Created)} colors={colors} />
                        <InfoRow label={t.detailHostname} value={detail.Config.Hostname} colors={colors} />
                        {detail.Config.WorkingDir ? <InfoRow label={t.detailWorkDir} value={detail.Config.WorkingDir} colors={colors} /> : null}
                        {detail.Config.Cmd ? <InfoRow label={t.detailCommand} value={detail.Config.Cmd.join(' ')} colors={colors} /> : null}
                    </View>
                    <View style={s.infoCard}>
                        <View style={s.infoCardHeader}><Network size={16} color="#13B5EA" /><Text style={s.infoCardTitle}>{t.detailNetwork}</Text></View>
                        <InfoRow label={t.detailMode} value={detail.HostConfig.NetworkMode} colors={colors} />
                        {Object.entries(detail.NetworkSettings.Networks).map(([name, net]) => (<InfoRow key={name} label={name} value={net.IPAddress || 'N/A'} colors={colors} />))}
                        {detail.NetworkSettings.Ports && Object.entries(detail.NetworkSettings.Ports).filter(([, b]) => b && b.length > 0).map(([port, bindings]) => (<InfoRow key={port} label={port} value={bindings!.map(b => `${b.HostIp}:${b.HostPort}`).join(', ')} colors={colors} />))}
                    </View>
                    {detail.Mounts.length > 0 && (
                        <View style={s.infoCard}>
                            <View style={s.infoCardHeader}><HardDrive size={16} color="#13B5EA" /><Text style={s.infoCardTitle}>{t.detailMounts}</Text></View>
                            {detail.Mounts.map((mount, idx) => (
                                <View key={idx} style={s.mountItem}>
                                    <View style={s.mountBadge}><Text style={s.mountBadgeText}>{mount.Type}</Text></View>
                                    <Text style={s.mountSource} numberOfLines={1}>{mount.Source}</Text>
                                    <Text style={s.mountArrow}>→</Text>
                                    <Text style={s.mountDest} numberOfLines={1}>{mount.Destination}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                    <View style={s.infoCard}>
                        <View style={s.infoCardHeader}><Tag size={16} color="#13B5EA" /><Text style={s.infoCardTitle}>{t.detailRestartPolicy}</Text></View>
                        <InfoRow label={t.detailPolicy} value={detail.HostConfig.RestartPolicy.Name || 'none'} colors={colors} />
                        <InfoRow label={t.detailMaxRetries} value={String(detail.HostConfig.RestartPolicy.MaximumRetryCount)} colors={colors} />
                    </View>
                </View>
            )}

            {activeTab === 'stats' && (
                <View style={s.tabContent}>
                    {statsQuery.isLoading ? <ActivityIndicator size="large" color="#13B5EA" style={{ marginTop: 30 }} /> : !isRunning ? <Text style={s.noDataText}>{t.detailNotRunning}</Text> : stats ? (
                        <>
                            <View style={s.statsCard}><View style={s.statsHeader}><Cpu size={18} color={colors.info} /><Text style={s.statsTitle}>{t.detailCpu}</Text><Text style={s.statsValue}>{cpuPercent.toFixed(2)}%</Text></View><View style={s.progressBar}><View style={[s.progressFill, { width: `${Math.min(cpuPercent, 100)}%` as unknown as number, backgroundColor: colors.info }]} /></View></View>
                            <View style={s.statsCard}><View style={s.statsHeader}><MemoryStick size={18} color="#13B5EA" /><Text style={s.statsTitle}>{t.detailMemory}</Text><Text style={s.statsValue}>{formatBytes(stats.memory_stats.usage)} / {formatBytes(stats.memory_stats.limit)}</Text></View><View style={s.progressBar}><View style={[s.progressFill, { width: `${Math.min(memPercent, 100)}%` as unknown as number, backgroundColor: '#13B5EA' }]} /></View><Text style={s.statsSubtext}>{memPercent.toFixed(1)}% {t.detailUsed}</Text></View>
                            <View style={s.statsCard}><View style={s.statsHeader}><Network size={18} color={colors.paused} /><Text style={s.statsTitle}>{t.detailNetworkIO}</Text></View><View style={s.networkRow}><View style={s.networkItem}><ArrowDown size={14} color={colors.running} /><Text style={s.networkLabel}>RX</Text><Text style={s.networkValue}>{formatBytes(networkStats.rx)}</Text></View><View style={s.networkItem}><ArrowUp size={14} color={colors.info} /><Text style={s.networkLabel}>TX</Text><Text style={s.networkValue}>{formatBytes(networkStats.tx)}</Text></View></View></View>
                        </>
                    ) : null}
                </View>
            )}

            {activeTab === 'logs' && (
                <View style={s.tabContent}>
                    {logsQuery.isLoading ? <ActivityIndicator size="large" color="#13B5EA" style={{ marginTop: 30 }} /> : (
                        <View style={s.logsCard}><View style={s.logsHeader}><Terminal size={16} color="#13B5EA" /><Text style={s.logsTitle}>{t.detailContainerLogs}</Text></View><ScrollView horizontal style={s.logsScroll}><Text style={s.logsText} selectable>{logsQuery.data || t.detailNoLogs}</Text></ScrollView></View>
                    )}
                </View>
            )}

            {activeTab === 'env' && (
                <View style={s.tabContent}>
                    <View style={s.infoCard}>
                        <Text style={s.infoCardTitle}>{t.detailEnvVars}</Text>
                        {detail.Config.Env.map((env, idx) => {
                            const eqIndex = env.indexOf('=');
                            const key = eqIndex >= 0 ? env.substring(0, eqIndex) : env;
                            const val = eqIndex >= 0 ? env.substring(eqIndex + 1) : '';
                            return (<TouchableOpacity key={idx} style={s.envItem} onPress={() => copyToClipboard(env)}><Text style={s.envKey} numberOfLines={1}>{key}</Text><Text style={s.envValue} numberOfLines={2}>{val}</Text></TouchableOpacity>);
                        })}
                    </View>
                </View>
            )}

            {activeTab === 'compose' && (
                <View style={s.tabContent}>
                    {stacksQuery.isLoading || stackFileQuery.isLoading ? (
                        <View style={s.composeLoading}><ActivityIndicator size="large" color="#13B5EA" /><Text style={s.noDataText}>{t.detailComposeLoading}</Text></View>
                    ) : !matchedStack ? (
                        <View style={s.composeEmpty}><FileCode size={40} color={colors.textMuted} /><Text style={s.noDataText}>{t.detailComposeNotAvailable}</Text></View>
                    ) : (
                        <View style={s.composeCard}>
                            <View style={s.composeHeader}><View style={s.composeHeaderLeft}><FileCode size={16} color="#13B5EA" /><Text style={s.composeTitle}>{t.detailComposeFile}</Text></View><Text style={s.composeStackName}>{matchedStack.Name}</Text></View>
                            <TextInput style={s.composeEditor} value={composeContent} onChangeText={(text) => { setComposeContent(text); setComposeEdited(true); }} multiline autoCapitalize="none" autoCorrect={false} spellCheck={false} textAlignVertical="top" scrollEnabled={false} />
                            {composeEdited && (
                                <TouchableOpacity style={s.composeSaveBtn} onPress={() => saveComposeMutation.mutate()} disabled={saveComposeMutation.isPending} activeOpacity={0.7}>
                                    {saveComposeMutation.isPending ? <ActivityIndicator size="small" color="#FFF" /> : (<><Save size={16} color="#FFF" /><Text style={s.composeSaveBtnText}>{t.detailComposeSave}</Text></>)}
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>
            )}

            <View style={{ height: 30 }} />
        </ScrollView>
    );
}

function InfoRow({ label, value, onCopy, colors }: { label: string; value: string; onCopy?: () => void; colors: ThemeColors }) {
    return (
        <View style={{ flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'flex-start' as const, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 13, color: colors.textSecondary, minWidth: 80 }}>{label}</Text>
            <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, flex: 1, justifyContent: 'flex-end' as const }}>
                <Text style={{ fontSize: 13, color: colors.text, fontWeight: '500' as const, textAlign: 'right' as const }} numberOfLines={2}>{value}</Text>
                {onCopy && <TouchableOpacity onPress={onCopy} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><Copy size={14} color={colors.textMuted} /></TouchableOpacity>}
            </View>
        </View>
    );
}

function makeStyles(colors: ThemeColors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        content: { paddingHorizontal: 16, paddingTop: 16 },
        loadingContainer: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
        errorText: { color: colors.textSecondary, fontSize: 15 },
        headerCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
        headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
        nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 10 },
        headerName: { fontSize: 20, fontWeight: '700' as const, color: colors.text, flex: 1 },
        editRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10, gap: 6 },
        editInput: { flex: 1, backgroundColor: colors.surfaceLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, color: colors.text, fontSize: 16, borderWidth: 1, borderColor: '#13B5EA' },
        editBtn: { padding: 6 },
        headerImage: { fontSize: 13, color: colors.textMuted },
        headerUptime: { fontSize: 12, color: colors.textSecondary, marginTop: 6 },
        actionsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
        actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12 },
        actionLabel: { fontSize: 14, fontWeight: '600' as const },
        tabBarScroll: { marginBottom: 16 },
        tabBarContent: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: colors.border, gap: 2 },
        tab: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
        tabActive: { backgroundColor: '#13B5EA1A' },
        tabText: { fontSize: 14, color: colors.textMuted, fontWeight: '500' as const },
        tabTextActive: { color: '#13B5EA', fontWeight: '600' as const },
        tabContent: { gap: 12 },
        infoCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
        infoCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
        infoCardTitle: { fontSize: 15, fontWeight: '600' as const, color: colors.text, marginBottom: 4 },
        mountItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 6, flexWrap: 'wrap' },
        mountBadge: { backgroundColor: colors.infoBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
        mountBadgeText: { fontSize: 10, color: colors.info, fontWeight: '600' as const },
        mountSource: { fontSize: 12, color: colors.textSecondary, flex: 1 },
        mountArrow: { fontSize: 12, color: colors.textMuted },
        mountDest: { fontSize: 12, color: colors.text, flex: 1 },
        statsCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
        statsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
        statsTitle: { fontSize: 15, fontWeight: '600' as const, color: colors.text, flex: 1 },
        statsValue: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' as const },
        progressBar: { height: 8, backgroundColor: colors.surfaceHover, borderRadius: 4, overflow: 'hidden' },
        progressFill: { height: '100%', borderRadius: 4 },
        statsSubtext: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
        networkRow: { flexDirection: 'row', gap: 16 },
        networkItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surfaceHover, borderRadius: 10, padding: 12 },
        networkLabel: { fontSize: 12, color: colors.textSecondary },
        networkValue: { fontSize: 14, color: colors.text, fontWeight: '600' as const },
        noDataText: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: 12 },
        logsCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
        logsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
        logsTitle: { fontSize: 15, fontWeight: '600' as const, color: colors.text },
        logsScroll: { maxHeight: 400 },
        logsText: { fontSize: 11, color: colors.textSecondary, lineHeight: 18 },
        envItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
        envKey: { fontSize: 13, color: '#13B5EA', fontWeight: '600' as const, marginBottom: 3 },
        envValue: { fontSize: 12, color: colors.textSecondary },
        composeLoading: { alignItems: 'center', paddingVertical: 40, gap: 12 },
        composeEmpty: { alignItems: 'center', paddingVertical: 40, gap: 12 },
        composeCard: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
        composeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
        composeHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        composeTitle: { fontSize: 15, fontWeight: '600' as const, color: colors.text },
        composeStackName: { fontSize: 12, color: colors.textMuted, backgroundColor: colors.surfaceHover, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
        composeEditor: { fontFamily: 'monospace', fontSize: 12, lineHeight: 20, color: colors.text, padding: 16, minHeight: 300, backgroundColor: colors.surfaceLight },
        composeSaveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#13B5EA', margin: 16, paddingVertical: 14, borderRadius: 12 },
        composeSaveBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' as const },
    });
}

