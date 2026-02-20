import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import {
    GitBranch,
    Star,
    GitFork,
    CircleDot,
    Lock,
    Unlock,
    Building2,
    User,
    ChevronRight,
    ShieldAlert,
    Clock,
    Folder,
    ArrowDownAZ,
} from 'lucide-react-native';
import { SkeletonCard } from '@/components/SkeletonLoader';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useServices } from '@/contexts/ServicesContext';
import { useThemeColors, useTranslations } from '@/contexts/SettingsContext';
import { giteaApi } from '@/services/gitea-api';
import { GiteaRepo, GiteaHeatmapItem } from '@/types/gitea';
import { ThemeColors } from '@/constants/themes';

const GITEA_COLOR = '#609926';
const GITEA_2FA_SHOWN_KEY = 'gitea_2fa_hint_shown';

const LANG_COLORS: Record<string, string> = {
    Go: '#00ADD8',
    JavaScript: '#F7DF1E',
    TypeScript: '#3178C6',
    Python: '#3776AB',
    Rust: '#DEA584',
    Java: '#B07219',
    'C#': '#178600',
    'C++': '#F34B7D',
    Ruby: '#CC342D',
    PHP: '#777BB4',
    Shell: '#89E051',
    Dockerfile: '#384D54',
    HTML: '#E34C26',
    CSS: '#563D7C',
    Dart: '#00B4AB',
    Swift: '#F05138',
    Kotlin: '#A97BFF',
};

const HEATMAP_COLORS_LIGHT = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];
const HEATMAP_COLORS_DARK = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'];
const CELL_SIZE = 11;
const CELL_GAP = 2;
const WEEKS_TO_SHOW = 20;

export default function GiteaDashboard() {
    const { getConnection } = useServices();
    const connection = getConnection('gitea');
    const colors = useThemeColors();
    const t = useTranslations();
    const router = useRouter();

    const [sortOrder, setSortOrder] = useState<'recent' | 'alpha'>('recent');

    const isDark = colors.background === '#000000' || colors.background === '#0A0A0A' || colors.background === '#111111' || colors.background === '#1C1C1E';
    const heatmapColors = isDark ? HEATMAP_COLORS_DARK : HEATMAP_COLORS_LIGHT;

    useEffect(() => {
        if (connection) {
            AsyncStorage.getItem(GITEA_2FA_SHOWN_KEY).then((shown) => {
                if (!shown) {
                    Alert.alert(
                        t.gitea2FAHint,
                        t.gitea2FAHintMessage,
                        [{ text: t.giteaOk, onPress: () => AsyncStorage.setItem(GITEA_2FA_SHOWN_KEY, 'true') }]
                    );
                }
            });
        }
    }, [connection, t]);

    const userQuery = useQuery({
        queryKey: ['gitea-user'],
        queryFn: () => giteaApi.getCurrentUser(),
        enabled: !!connection,
        staleTime: 60000,
    });

    const reposQuery = useQuery({
        queryKey: ['gitea-repos'],
        queryFn: () => giteaApi.getUserRepos(1, 30),
        enabled: !!connection,
        refetchInterval: 30000,
    });

    useEffect(() => {
        if (reposQuery.isError && connection) {
            Alert.alert('Connessione fallita', 'Impossibile raggiungere Gitea. Verifica di essere sulla rete corretta o configura un URL alternativo nelle impostazioni.');
        }
    }, [reposQuery.isError, connection]);

    const orgsQuery = useQuery({
        queryKey: ['gitea-orgs'],
        queryFn: () => giteaApi.getOrgs(),
        enabled: !!connection,
        staleTime: 60000,
    });

    const heatmapQuery = useQuery({
        queryKey: ['gitea-heatmap', userQuery.data?.login],
        queryFn: () => giteaApi.getUserHeatmap(userQuery.data!.login),
        enabled: !!userQuery.data?.login,
        staleTime: 300000,
    });

    const user = userQuery.data;
    const repos = reposQuery.data ?? [];
    const orgs = orgsQuery.data ?? [];
    const heatmapData = heatmapQuery.data ?? [];

    const repoStats = useMemo(() => {
        const totalRepos = repos.length;
        const totalStars = repos.reduce((acc, r) => acc + r.stars_count, 0);
        const totalForks = repos.reduce((acc, r) => acc + r.forks_count, 0);
        const privateRepos = repos.filter(r => r.private).length;
        return { totalRepos, totalStars, totalForks, privateRepos, publicRepos: totalRepos - privateRepos };
    }, [repos]);

    const sortedRepos = useMemo(() => {
        const sorted = [...repos];
        if (sortOrder === 'alpha') {
            sorted.sort((a, b) => a.name.localeCompare(b.name));
        } else {
            sorted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        }
        return sorted;
    }, [repos, sortOrder]);

    const heatmapGrid = useMemo(() => {
        const contributionMap = new Map<string, number>();
        heatmapData.forEach((item) => {
            const date = new Date(item.timestamp * 1000);
            const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
            contributionMap.set(key, (contributionMap.get(key) ?? 0) + item.contributions);
        });

        const maxContrib = Math.max(1, ...Array.from(contributionMap.values()));
        const today = new Date();
        const dayOfWeek = today.getDay();

        const totalDays = WEEKS_TO_SHOW * 7 + dayOfWeek + 1;
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - totalDays + 1);

        const weeks: Array<Array<{ date: Date; count: number; level: number }>> = [];
        let currentWeek: Array<{ date: Date; count: number; level: number }> = [];

        for (let i = 0; i < totalDays; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            const count = contributionMap.get(key) ?? 0;
            let level = 0;
            if (count > 0) {
                const ratio = count / maxContrib;
                if (ratio <= 0.25) level = 1;
                else if (ratio <= 0.5) level = 2;
                else if (ratio <= 0.75) level = 3;
                else level = 4;
            }
            currentWeek.push({ date: d, count, level });
            if (currentWeek.length === 7) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
        }
        if (currentWeek.length > 0) {
            weeks.push(currentWeek);
        }

        return weeks;
    }, [heatmapData]);

    const onRefresh = useCallback(() => {
        userQuery.refetch();
        reposQuery.refetch();
        orgsQuery.refetch();
        heatmapQuery.refetch();
    }, [userQuery, reposQuery, orgsQuery, heatmapQuery]);

    const handleRepoPress = useCallback((repo: GiteaRepo) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({
            pathname: '/gitea/[repoId]' as never,
            params: {
                repoId: String(repo.id),
                owner: repo.owner.login,
                repoName: repo.name,
                fullName: repo.full_name,
            },
        });
    }, [router]);

    const s = makeStyles(colors);

    if (userQuery.isLoading && !user) {
        return (
            <View style={s.loadingContainer}>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
            </View>
        );
    }

    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days === 0) return 'oggi';
        if (days === 1) return 'ieri';
        if (days < 30) return `${days}g fa`;
        const months = Math.floor(days / 30);
        return `${months} mesi fa`;
    };

    return (
        <ScrollView
            style={s.container}
            contentContainerStyle={s.content}
            refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={GITEA_COLOR} />}
        >
            {user && (
                <View style={s.userCard}>
                    <View style={[s.avatarWrap, { backgroundColor: GITEA_COLOR + '18' }]}>
                        <User size={24} color={GITEA_COLOR} />
                    </View>
                    <View style={s.userInfo}>
                        <Text style={s.userName}>{user.full_name || user.login}</Text>
                        <Text style={s.userLogin}>@{user.login}</Text>
                    </View>
                </View>
            )}

            <View style={s.statsRow}>
                <View style={s.miniStatCard}>
                    <Folder size={16} color={colors.running} />
                    <Text style={s.miniStatValue}>{repoStats.totalRepos}</Text>
                    <Text style={s.miniStatLabel}>Repository</Text>
                </View>
                <View style={s.miniStatCard}>
                    <Star size={16} color={colors.warning} />
                    <Text style={s.miniStatValue}>{repoStats.totalStars}</Text>
                    <Text style={s.miniStatLabel}>{t.giteaStars}</Text>
                </View>
                <View style={s.miniStatCard}>
                    <GitFork size={16} color={colors.info} />
                    <Text style={s.miniStatValue}>{repoStats.totalForks}</Text>
                    <Text style={s.miniStatLabel}>{t.giteaForks}</Text>
                </View>
            </View>

            {heatmapGrid.length > 0 && (
                <View style={s.section}>
                    <Text style={s.sectionTitle}>{t.giteaContributions}</Text>
                    <View style={s.heatmapCard}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.heatmapScroll}>
                            {heatmapGrid.map((week, wi) => (
                                <View key={wi} style={s.heatmapWeek}>
                                    {week.map((day, di) => (
                                        <View
                                            key={`${wi}-${di}`}
                                            style={[
                                                s.heatmapCell,
                                                { backgroundColor: heatmapColors[day.level] },
                                            ]}
                                        />
                                    ))}
                                </View>
                            ))}
                        </ScrollView>
                        <View style={s.heatmapLegend}>
                            <Text style={s.heatmapLegendText}>{t.giteaLessActive}</Text>
                            {heatmapColors.map((color, i) => (
                                <View key={i} style={[s.heatmapLegendCell, { backgroundColor: color }]} />
                            ))}
                            <Text style={s.heatmapLegendText}>{t.giteaMoreActive}</Text>
                        </View>
                    </View>
                </View>
            )}

            {orgs.length > 0 && (
                <View style={s.section}>
                    <Text style={s.sectionTitle}>{t.giteaOrgs}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.orgsScroll}>
                        {orgs.map((org) => (
                            <View key={org.id} style={s.orgChip}>
                                <Building2 size={14} color={GITEA_COLOR} />
                                <Text style={s.orgName}>{org.username}</Text>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            )}

            <View style={s.section}>
                <View style={s.sectionHeaderRow}>
                    <Text style={[s.sectionTitle, { marginBottom: 0 }]}>{t.giteaRepos} ({repos.length})</Text>
                    <TouchableOpacity
                        style={s.sortButton}
                        onPress={() => setSortOrder(prev => prev === 'recent' ? 'alpha' : 'recent')}
                    >
                        {sortOrder === 'recent' ? (
                            <Clock size={14} color={colors.textMuted} />
                        ) : (
                            <ArrowDownAZ size={14} color={colors.textMuted} />
                        )}
                        <Text style={s.sortButtonText}>
                            {sortOrder === 'recent' ? 'Recenti' : 'A-Z'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {sortedRepos.length === 0 ? (
                    <View style={s.emptyContainer}>
                        <GitBranch size={40} color={colors.textMuted} />
                        <Text style={s.emptyText}>{t.giteaNoRepos}</Text>
                    </View>
                ) : (
                    sortedRepos.map((repo) => (
                        <RepoCard
                            key={repo.id}
                            repo={repo}
                            colors={colors}
                            t={t}
                            formatDate={formatDate}
                            onPress={() => handleRepoPress(repo)}
                        />
                    ))
                )}
            </View>

            <View style={{ height: 30 }} />
        </ScrollView>
    );
}

const RepoCard = React.memo(function RepoCard({
    repo,
    colors,
    t,
    formatDate,
    onPress,
}: {
    repo: GiteaRepo;
    colors: ThemeColors;
    t: ReturnType<typeof useTranslations>;
    formatDate: (d: string) => string;
    onPress: () => void;
}) {
    const s = makeStyles(colors);
    const langColor = LANG_COLORS[repo.language] ?? colors.textMuted;

    return (
        <TouchableOpacity
            style={s.repoCard}
            activeOpacity={0.7}
            onPress={onPress}
        >
            <View style={s.repoHeader}>
                <View style={s.repoNameRow}>
                    {repo.private ? (
                        <Lock size={14} color={colors.warning} />
                    ) : (
                        <Unlock size={14} color={colors.textMuted} />
                    )}
                    <Text style={s.repoName} numberOfLines={1}>{repo.name}</Text>
                </View>
                <View style={s.repoHeaderRight}>
                    {repo.fork && (
                        <View style={s.forkBadge}>
                            <GitFork size={10} color={colors.textMuted} />
                            <Text style={s.forkText}>Fork</Text>
                        </View>
                    )}
                    <ChevronRight size={16} color={colors.textMuted} />
                </View>
            </View>
            {repo.description ? (
                <Text style={s.repoDesc} numberOfLines={2}>{repo.description}</Text>
            ) : null}
            <View style={s.repoFooter}>
                {repo.language ? (
                    <View style={s.langBadge}>
                        <View style={[s.langDot, { backgroundColor: langColor }]} />
                        <Text style={s.langText}>{repo.language}</Text>
                    </View>
                ) : null}
                <View style={s.repoStat}>
                    <Star size={12} color={colors.warning} />
                    <Text style={s.repoStatText}>{repo.stars_count}</Text>
                </View>
                <View style={s.repoStat}>
                    <GitFork size={12} color={colors.textMuted} />
                    <Text style={s.repoStatText}>{repo.forks_count}</Text>
                </View>
                <Text style={s.repoDate}>{formatDate(repo.updated_at)}</Text>
            </View>
        </TouchableOpacity>
    );
});

function makeStyles(colors: ThemeColors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        content: { paddingHorizontal: 16, paddingTop: 16 },
        loadingContainer: {
            flex: 1,
            padding: 16,
            justifyContent: 'center',
            gap: 12
        },
        loadingText: { color: colors.textSecondary, fontSize: 14 },
        userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: colors.border, marginBottom: 16, gap: 14 },
        avatarWrap: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
        userInfo: { flex: 1 },
        userName: { fontSize: 18, fontWeight: '700' as const, color: colors.text },
        userLogin: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
        statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
        miniStatCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 6 },
        miniStatValue: { fontSize: 20, fontWeight: '700' as const, color: colors.text },
        miniStatLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' as const },
        section: { marginBottom: 24 },
        sectionTitle: { fontSize: 13, fontWeight: '600' as const, color: colors.textMuted, marginBottom: 12, textTransform: 'uppercase' as const, letterSpacing: 0.8 },
        sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
        sortButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surfaceHover, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
        sortButtonText: { fontSize: 11, color: colors.textMuted, fontWeight: '600' as const },
        heatmapCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 12 },
        heatmapScroll: { flexDirection: 'row', gap: CELL_GAP },
        heatmapWeek: { gap: CELL_GAP },
        heatmapCell: { width: CELL_SIZE, height: CELL_SIZE, borderRadius: 2 },
        heatmapLegend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
        heatmapLegendText: { fontSize: 10, color: colors.textMuted, marginHorizontal: 2 },
        heatmapLegendCell: { width: 10, height: 10, borderRadius: 2 },
        orgsScroll: { gap: 8, paddingRight: 16 },
        orgChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: colors.border, marginRight: 8 },
        orgName: { fontSize: 13, color: colors.text, fontWeight: '600' as const },
        emptyContainer: { alignItems: 'center', paddingTop: 40, gap: 12 },
        emptyText: { color: colors.textSecondary, fontSize: 15 },
        repoCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 10 },
        repoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
        repoNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
        repoHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
        repoName: { fontSize: 15, fontWeight: '600' as const, color: GITEA_COLOR, flex: 1 },
        forkBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.surfaceHover, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
        forkText: { fontSize: 10, color: colors.textMuted, fontWeight: '600' as const },
        repoDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 10 },
        repoFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
        langBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
        langDot: { width: 8, height: 8, borderRadius: 4 },
        langText: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' as const },
        repoStat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
        repoStatText: { fontSize: 12, color: colors.textMuted },
        repoDate: { fontSize: 11, color: colors.textMuted, marginLeft: 'auto' },
    });
}

