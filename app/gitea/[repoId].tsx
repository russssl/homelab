import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    TouchableOpacity,
    Modal,
    Alert,
    Share,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
    FileText,
    GitCommit,
    CircleDot,
    GitBranch,
    Folder,
    File,
    Star,
    GitFork,
    Lock,
    Unlock,
    ChevronRight,
    ArrowLeft,
    Shield,
    X,
    Code,
    Share2,
    Maximize2,
    Minimize2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useThemeColors, useTranslations } from '@/contexts/SettingsContext';
import { giteaApi } from '@/services/gitea-api';
import { GiteaFileContent, GiteaCommit, GiteaIssue } from '@/types/gitea';
import { ThemeColors } from '@/constants/themes';
import { formatBytes } from '@/utils/formatters';

const GITEA_COLOR = '#609926';

type TabType = 'files' | 'commits' | 'issues' | 'branches';

export default function GiteaRepoDetail() {
    const { owner, repoName, fullName } = useLocalSearchParams<{
        repoId: string;
        owner: string;
        repoName: string;
        fullName: string;
    }>();
    const colors = useThemeColors();
    const t = useTranslations();
    const [activeTab, setActiveTab] = useState<TabType>('files');
    const [currentPath, setCurrentPath] = useState<string>('');
    const [viewingFile, setViewingFile] = useState<string | null>(null);
    const [fullscreenFile, setFullscreenFile] = useState<boolean>(false);

    const repoQuery = useQuery({
        queryKey: ['gitea-repo', owner, repoName],
        queryFn: () => giteaApi.getRepo(owner, repoName),
        enabled: !!owner && !!repoName,
        staleTime: 30000,
    });

    const filesQuery = useQuery({
        queryKey: ['gitea-files', owner, repoName, currentPath],
        queryFn: () => giteaApi.getRepoContents(owner, repoName, currentPath),
        enabled: !!owner && !!repoName && activeTab === 'files',
        staleTime: 30000,
    });

    const fileContentQuery = useQuery({
        queryKey: ['gitea-file-content', owner, repoName, viewingFile],
        queryFn: () => giteaApi.getFileContent(owner, repoName, viewingFile!),
        enabled: !!owner && !!repoName && !!viewingFile,
        staleTime: 60000,
    });

    const commitsQuery = useQuery({
        queryKey: ['gitea-commits', owner, repoName],
        queryFn: () => giteaApi.getRepoCommits(owner, repoName, 1, 30),
        enabled: !!owner && !!repoName && activeTab === 'commits',
        staleTime: 30000,
    });

    const issuesQuery = useQuery({
        queryKey: ['gitea-issues', owner, repoName],
        queryFn: () => giteaApi.getRepoIssues(owner, repoName, 'open', 1, 30),
        enabled: !!owner && !!repoName && activeTab === 'issues',
        staleTime: 30000,
    });

    const branchesQuery = useQuery({
        queryKey: ['gitea-branches', owner, repoName],
        queryFn: () => giteaApi.getRepoBranches(owner, repoName),
        enabled: !!owner && !!repoName && activeTab === 'branches',
        staleTime: 60000,
    });

    const repo = repoQuery.data;
    const files = filesQuery.data ?? [];
    const commits = commitsQuery.data ?? [];
    const issues = issuesQuery.data ?? [];
    const branches = branchesQuery.data ?? [];

    const sortedFiles = [...files].sort((a, b) => {
        if (a.type === 'dir' && b.type !== 'dir') return -1;
        if (a.type !== 'dir' && b.type === 'dir') return 1;
        return a.name.localeCompare(b.name);
    });

    const onRefresh = useCallback(() => {
        repoQuery.refetch();
        if (activeTab === 'files') filesQuery.refetch();
        if (activeTab === 'commits') commitsQuery.refetch();
        if (activeTab === 'issues') issuesQuery.refetch();
        if (activeTab === 'branches') branchesQuery.refetch();
    }, [activeTab, repoQuery, filesQuery, commitsQuery, issuesQuery, branchesQuery]);

    const handleFilePress = useCallback((file: GiteaFileContent) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (file.type === 'dir') {
            setCurrentPath(file.path);
            setViewingFile(null);
        } else {
            setViewingFile(file.path);
        }
    }, []);

    const handleBackPath = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (viewingFile) {
            setViewingFile(null);
            return;
        }
        const parts = currentPath.split('/');
        parts.pop();
        setCurrentPath(parts.join('/'));
    }, [currentPath, viewingFile]);

    const decodeFileContent = (content?: string, encoding?: string): string => {
        if (!content) return '';
        if (encoding === 'base64') {
            try {
                return atob(content.replace(/\n/g, ''));
            } catch {
                return content;
            }
        }
        return content;
    };

    const handleShareFile = useCallback(async () => {
        if (!viewingFile || !owner || !repoName) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const rawUrl = `${giteaApi['baseUrl']}/api/v1/repos/${owner}/${repoName}/raw/${encodeURIComponent(viewingFile)}`;
        try {
            await Share.share({
                message: rawUrl,
                title: 'Condividi File Gitea',
            });
        } catch {
            Alert.alert('Errore', 'Impossibile condividere il link.');
        }
    }, [viewingFile, owner, repoName]);

    const s = makeStyles(colors);

    const formatCommitDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 1) return 'adesso';
        if (hours < 24) return `${hours}h fa`;
        const days = Math.floor(hours / 24);
        if (days === 1) return 'ieri';
        if (days < 30) return `${days}g fa`;
        return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' });
    };

    const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
        { key: 'files', label: t.giteaFiles, icon: <FileText size={14} color={activeTab === 'files' ? GITEA_COLOR : colors.textMuted} /> },
        { key: 'commits', label: t.giteaCommits, icon: <GitCommit size={14} color={activeTab === 'commits' ? GITEA_COLOR : colors.textMuted} /> },
        { key: 'issues', label: t.giteaIssues, icon: <CircleDot size={14} color={activeTab === 'issues' ? GITEA_COLOR : colors.textMuted} /> },
        { key: 'branches', label: t.giteaBranches, icon: <GitBranch size={14} color={activeTab === 'branches' ? GITEA_COLOR : colors.textMuted} /> },
    ];

    const fileContent = fileContentQuery.data;
    const decodedContent = fileContent ? decodeFileContent(fileContent.content, fileContent.encoding) : '';

    return (
        <>
            <Stack.Screen options={{ title: repoName || '' }} />
            <ScrollView
                style={s.container}
                contentContainerStyle={s.content}
                refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={GITEA_COLOR} />}
            >
                {repo && (
                    <View style={s.repoHeader}>
                        <View style={s.repoTitleRow}>
                            {repo.private ? <Lock size={16} color={colors.warning} /> : <Unlock size={16} color={colors.textMuted} />}
                            <Text style={s.repoFullName}>{repo.full_name}</Text>
                        </View>
                        {repo.description ? (
                            <Text style={s.repoDesc}>{repo.description}</Text>
                        ) : null}
                        <View style={s.repoMetaRow}>
                            <View style={s.repoMetaItem}>
                                <Star size={13} color={colors.warning} />
                                <Text style={s.repoMetaText}>{repo.stars_count}</Text>
                            </View>
                            <View style={s.repoMetaItem}>
                                <GitFork size={13} color={colors.textMuted} />
                                <Text style={s.repoMetaText}>{repo.forks_count}</Text>
                            </View>
                            <View style={s.repoMetaItem}>
                                <CircleDot size={13} color={colors.running} />
                                <Text style={s.repoMetaText}>{repo.open_issues_count}</Text>
                            </View>
                            {repo.language ? (
                                <View style={s.repoMetaItem}>
                                    <View style={[s.langDot, { backgroundColor: GITEA_COLOR }]} />
                                    <Text style={s.repoMetaText}>{repo.language}</Text>
                                </View>
                            ) : null}
                        </View>
                        <View style={s.repoInfoRow}>
                            <Text style={s.repoInfoLabel}>{t.giteaDefaultBranch}:</Text>
                            <View style={s.branchBadge}>
                                <GitBranch size={11} color={GITEA_COLOR} />
                                <Text style={s.branchBadgeText}>{repo.default_branch}</Text>
                            </View>
                            <Text style={s.repoInfoSep}>•</Text>
                            <Text style={s.repoInfoLabel}>{formatBytes(repo.size * 1024)}</Text>
                        </View>
                    </View>
                )}

                <View style={s.tabBar}>
                    {tabs.map((tab) => (
                        <TouchableOpacity
                            key={tab.key}
                            style={[s.tab, activeTab === tab.key && s.tabActive]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setActiveTab(tab.key);
                                if (tab.key === 'files') {
                                    setCurrentPath('');
                                    setViewingFile(null);
                                }
                            }}
                            activeOpacity={0.7}
                        >
                            {tab.icon}
                            <Text style={[s.tabText, activeTab === tab.key && s.tabTextActive]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {activeTab === 'files' && !viewingFile && (
                    <View style={s.tabContent}>
                        {currentPath !== '' && (
                            <TouchableOpacity style={s.backPathRow} onPress={handleBackPath} activeOpacity={0.7}>
                                <ArrowLeft size={16} color={GITEA_COLOR} />
                                <Text style={s.backPathText}>{currentPath}</Text>
                            </TouchableOpacity>
                        )}
                        {filesQuery.isLoading ? (
                            <ActivityIndicator size="small" color={GITEA_COLOR} style={{ paddingVertical: 30 }} />
                        ) : sortedFiles.length === 0 ? (
                            <View style={s.emptyState}>
                                <FileText size={32} color={colors.textMuted} />
                                <Text style={s.emptyText}>{t.giteaNoFiles}</Text>
                            </View>
                        ) : (
                            <View style={s.fileList}>
                                {sortedFiles.map((file, idx) => (
                                    <TouchableOpacity
                                        key={file.sha + file.name}
                                        style={[s.fileItem, idx < sortedFiles.length - 1 && s.fileItemBorder]}
                                        onPress={() => handleFilePress(file)}
                                        activeOpacity={0.7}
                                    >
                                        {file.type === 'dir' ? (
                                            <Folder size={18} color={GITEA_COLOR} />
                                        ) : (
                                            <File size={18} color={colors.textMuted} />
                                        )}
                                        <Text style={[s.fileName, file.type === 'dir' && { color: GITEA_COLOR }]} numberOfLines={1}>
                                            {file.name}
                                        </Text>
                                        {file.type === 'dir' && <ChevronRight size={16} color={colors.textMuted} />}
                                        {file.type === 'file' && file.size > 0 && (
                                            <Text style={s.fileSize}>{formatBytes(file.size)}</Text>
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {activeTab === 'files' && viewingFile && (
                    <View style={s.tabContent}>
                        <TouchableOpacity style={s.backPathRow} onPress={handleBackPath} activeOpacity={0.7}>
                            <ArrowLeft size={16} color={GITEA_COLOR} />
                            <Text style={s.backPathText}>{viewingFile}</Text>
                        </TouchableOpacity>

                        {fileContentQuery.isLoading ? (
                            <View style={s.fileContentLoading}>
                                <ActivityIndicator size="small" color={GITEA_COLOR} />
                                <Text style={s.loadingFileText}>{t.loading}</Text>
                            </View>
                        ) : fileContentQuery.isError ? (
                            <View style={s.fileContentError}>
                                <Text style={s.fileContentErrorText}>{t.error}</Text>
                            </View>
                        ) : (
                            <View style={s.fileContentCard}>
                                <View style={s.fileContentHeader}>
                                    <Code size={14} color={GITEA_COLOR} />
                                    <Text style={s.fileContentTitle} numberOfLines={1}>
                                        {viewingFile.split('/').pop()}
                                    </Text>
                                    {fileContent && fileContent.size > 0 && (
                                        <Text style={s.fileContentSize}>{formatBytes(fileContent.size)}</Text>
                                    )}
                                    <TouchableOpacity onPress={handleShareFile} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={s.fileActionBtn}>
                                        <Share2 size={16} color={GITEA_COLOR} />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => setFullscreenFile(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={s.fileActionBtn}>
                                        <Maximize2 size={16} color={GITEA_COLOR} />
                                    </TouchableOpacity>
                                </View>
                                <ScrollView nestedScrollEnabled style={s.fileContentScroll}>
                                    <ScrollView horizontal showsHorizontalScrollIndicator>
                                        <View style={s.fileContentTextContainer}>
                                            <Text style={s.fileContentText} selectable>
                                                {decodedContent || t.noData}
                                            </Text>
                                        </View>
                                    </ScrollView>
                                </ScrollView>
                            </View>
                        )}
                    </View>
                )}

                {activeTab === 'commits' && (
                    <View style={s.tabContent}>
                        {commitsQuery.isLoading ? (
                            <ActivityIndicator size="small" color={GITEA_COLOR} style={{ paddingVertical: 30 }} />
                        ) : commits.length === 0 ? (
                            <View style={s.emptyState}>
                                <GitCommit size={32} color={colors.textMuted} />
                                <Text style={s.emptyText}>{t.giteaNoCommits}</Text>
                            </View>
                        ) : (
                            <View style={s.commitList}>
                                {commits.map((commit, idx) => (
                                    <View key={commit.sha} style={[s.commitItem, idx < commits.length - 1 && s.commitItemBorder]}>
                                        <View style={s.commitDotLine}>
                                            <View style={s.commitDot} />
                                            {idx < commits.length - 1 && <View style={s.commitLine} />}
                                        </View>
                                        <View style={s.commitContent}>
                                            <Text style={s.commitMessage} numberOfLines={2}>
                                                {commit.commit.message.split('\n')[0]}
                                            </Text>
                                            <View style={s.commitMeta}>
                                                <Text style={s.commitAuthor}>
                                                    {commit.commit.author.name}
                                                </Text>
                                                <Text style={s.commitDate}>
                                                    {formatCommitDate(commit.commit.author.date)}
                                                </Text>
                                            </View>
                                            <Text style={s.commitSha}>{commit.sha.substring(0, 8)}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {activeTab === 'issues' && (
                    <View style={s.tabContent}>
                        {issuesQuery.isLoading ? (
                            <ActivityIndicator size="small" color={GITEA_COLOR} style={{ paddingVertical: 30 }} />
                        ) : issues.length === 0 ? (
                            <View style={s.emptyState}>
                                <CircleDot size={32} color={colors.textMuted} />
                                <Text style={s.emptyText}>{t.giteaNoIssues}</Text>
                            </View>
                        ) : (
                            <View style={s.issueList}>
                                {issues.map((issue, idx) => (
                                    <View key={issue.id} style={[s.issueItem, idx < issues.length - 1 && s.issueItemBorder]}>
                                        <View style={[s.issueIconWrap, { backgroundColor: issue.state === 'open' ? colors.running + '18' : colors.stopped + '18' }]}>
                                            <CircleDot size={16} color={issue.state === 'open' ? colors.running : colors.stopped} />
                                        </View>
                                        <View style={s.issueContent}>
                                            <Text style={s.issueTitle} numberOfLines={2}>#{issue.number} {issue.title}</Text>
                                            <View style={s.issueMeta}>
                                                <Text style={s.issueAuthor}>{issue.user.login}</Text>
                                                <Text style={s.issueDate}>{formatCommitDate(issue.created_at)}</Text>
                                                {issue.comments > 0 && (
                                                    <Text style={s.issueComments}>💬 {issue.comments}</Text>
                                                )}
                                            </View>
                                            {issue.labels.length > 0 && (
                                                <View style={s.labelsRow}>
                                                    {issue.labels.slice(0, 3).map((label) => (
                                                        <View key={label.id} style={[s.labelBadge, { backgroundColor: `#${label.color}33` }]}>
                                                            <Text style={[s.labelText, { color: `#${label.color}` }]}>{label.name}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {activeTab === 'branches' && (
                    <View style={s.tabContent}>
                        {branchesQuery.isLoading ? (
                            <ActivityIndicator size="small" color={GITEA_COLOR} style={{ paddingVertical: 30 }} />
                        ) : branches.length === 0 ? (
                            <View style={s.emptyState}>
                                <GitBranch size={32} color={colors.textMuted} />
                                <Text style={s.emptyText}>{t.giteaNoFiles}</Text>
                            </View>
                        ) : (
                            <View style={s.branchList}>
                                {branches.map((branch, idx) => (
                                    <View key={branch.name} style={[s.branchItem, idx < branches.length - 1 && s.branchItemBorder]}>
                                        <View style={[s.branchIcon, { backgroundColor: GITEA_COLOR + '18' }]}>
                                            <GitBranch size={16} color={GITEA_COLOR} />
                                        </View>
                                        <View style={s.branchContent}>
                                            <View style={s.branchNameRow}>
                                                <Text style={s.branchName}>{branch.name}</Text>
                                                {branch.protected && (
                                                    <View style={s.protectedBadge}>
                                                        <Shield size={10} color={colors.warning} />
                                                    </View>
                                                )}
                                                {repo?.default_branch === branch.name && (
                                                    <View style={s.defaultBadge}>
                                                        <Text style={s.defaultBadgeText}>default</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={s.branchCommit} numberOfLines={1}>
                                                {branch.commit.message.split('\n')[0]}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                <View style={{ height: 30 }} />
            </ScrollView>

            <Modal
                visible={fullscreenFile && !!viewingFile}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={() => setFullscreenFile(false)}
            >
                <View style={[s.fullscreenContainer, { backgroundColor: colors.background }]}>
                    <View style={[s.fullscreenHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                        <View style={s.fullscreenHeaderLeft}>
                            <Code size={14} color={GITEA_COLOR} />
                            <Text style={[s.fullscreenTitle, { color: colors.text }]} numberOfLines={1}>
                                {viewingFile?.split('/').pop()}
                            </Text>
                        </View>
                        <View style={s.fullscreenActions}>
                            <TouchableOpacity onPress={handleShareFile} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={s.fileActionBtn}>
                                <Share2 size={18} color={GITEA_COLOR} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setFullscreenFile(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={s.fileActionBtn}>
                                <X size={20} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <ScrollView style={s.fullscreenScroll} contentContainerStyle={s.fullscreenScrollContent}>
                        <ScrollView horizontal showsHorizontalScrollIndicator>
                            <View style={s.fileContentTextContainer}>
                                <Text style={[s.fileContentText, { color: colors.text }]} selectable>
                                    {decodedContent || t.noData}
                                </Text>
                            </View>
                        </ScrollView>
                    </ScrollView>
                </View>
            </Modal>
        </>
    );
}

function makeStyles(colors: ThemeColors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        content: { paddingHorizontal: 16, paddingTop: 16 },
        repoHeader: { backgroundColor: colors.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: colors.border, marginBottom: 16, gap: 8 },
        repoTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        repoFullName: { fontSize: 18, fontWeight: '700' as const, color: colors.text, flex: 1 },
        repoDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
        repoMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 },
        repoMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
        repoMetaText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' as const },
        langDot: { width: 8, height: 8, borderRadius: 4 },
        repoInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
        repoInfoLabel: { fontSize: 12, color: colors.textMuted },
        repoInfoSep: { fontSize: 12, color: colors.textMuted },
        branchBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: GITEA_COLOR + '15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
        branchBadgeText: { fontSize: 11, color: GITEA_COLOR, fontWeight: '600' as const },
        tabBar: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 4, marginBottom: 16, gap: 2 },
        tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 5 },
        tabActive: { backgroundColor: GITEA_COLOR + '15' },
        tabText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' as const },
        tabTextActive: { color: GITEA_COLOR },
        tabContent: { minHeight: 100 },
        backPathRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
        backPathText: { fontSize: 13, color: GITEA_COLOR, fontWeight: '500' as const, flex: 1 },
        emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
        emptyText: { fontSize: 14, color: colors.textMuted },
        fileList: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
        fileItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
        fileItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
        fileName: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '500' as const },
        fileSize: { fontSize: 11, color: colors.textMuted },
        fileContentLoading: { alignItems: 'center', paddingVertical: 40, gap: 10 },
        loadingFileText: { fontSize: 13, color: colors.textMuted },
        fileContentError: { alignItems: 'center', paddingVertical: 40, gap: 10 },
        fileContentErrorText: { fontSize: 14, color: colors.stopped },
        fileContentCard: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
        fileContentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surfaceHover },
        fileContentTitle: { flex: 1, fontSize: 13, fontWeight: '600' as const, color: colors.text },
        fileContentSize: { fontSize: 11, color: colors.textMuted },
        fileActionBtn: { padding: 6 },
        fileContentScroll: { maxHeight: 500 },
        fileContentTextContainer: { minWidth: '100%', padding: 16 },
        fileContentText: { fontFamily: 'monospace', fontSize: 13, lineHeight: 20, color: colors.text },
        commitList: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', paddingLeft: 8 },
        commitItem: { flexDirection: 'row', paddingVertical: 14, paddingRight: 16, gap: 12 },
        commitItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
        commitDotLine: { alignItems: 'center', width: 20, paddingTop: 4 },
        commitDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: GITEA_COLOR },
        commitLine: { width: 2, flex: 1, backgroundColor: colors.border, marginTop: 4 },
        commitContent: { flex: 1 },
        commitMessage: { fontSize: 14, color: colors.text, fontWeight: '500' as const, lineHeight: 20 },
        commitMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
        commitAuthor: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' as const },
        commitDate: { fontSize: 11, color: colors.textMuted },
        commitSha: { fontSize: 11, color: GITEA_COLOR, fontWeight: '600' as const, marginTop: 4 },
        issueList: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
        issueItem: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
        issueItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
        issueIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
        issueContent: { flex: 1 },
        issueTitle: { fontSize: 14, color: colors.text, fontWeight: '500' as const, lineHeight: 20 },
        issueMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
        issueAuthor: { fontSize: 12, color: colors.textSecondary },
        issueDate: { fontSize: 11, color: colors.textMuted },
        issueComments: { fontSize: 11, color: colors.textMuted },
        labelsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
        labelBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
        labelText: { fontSize: 10, fontWeight: '600' as const },
        branchList: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
        branchItem: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, gap: 12, alignItems: 'center' },
        branchItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
        branchIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
        branchContent: { flex: 1 },
        branchNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
        branchName: { fontSize: 14, color: colors.text, fontWeight: '600' as const },
        protectedBadge: { padding: 2 },
        defaultBadge: { backgroundColor: GITEA_COLOR + '18', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
        defaultBadgeText: { fontSize: 10, color: GITEA_COLOR, fontWeight: '600' as const },
        branchCommit: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
        fullscreenContainer: { flex: 1 },
        fullscreenHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, paddingTop: 60, borderBottomWidth: 1 },
        fullscreenHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 12 },
        fullscreenTitle: { fontSize: 16, fontWeight: '600' as const, flex: 1 },
        fullscreenActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        fullscreenScroll: { flex: 1 },
        fullscreenScrollContent: { padding: 16 },
    });
}

