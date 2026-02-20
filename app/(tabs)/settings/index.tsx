import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    StyleSheet,
    TextInput,
} from 'react-native';
import {
    LogOut,
    Globe,
    Info,
    Languages,
    Moon,
    Sun,
    Check,
    Box,
    Shield,
    Activity,
    GitBranch,
    Link2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useServices } from '@/contexts/ServicesContext';
import { useSettings, useThemeColors, useTranslations } from '@/contexts/SettingsContext';
import { Language } from '@/constants/translations';
import { ThemeMode, ThemeColors } from '@/constants/themes';
import { ServiceType, SERVICE_COLORS } from '@/types/services';

const SERVICE_LIST: { type: ServiceType; icon: (color: string) => React.ReactNode; nameKey: keyof ReturnType<typeof useTranslations> }[] = [
    { type: 'portainer', icon: (c) => <Box size={18} color={c} />, nameKey: 'servicePortainer' },
    { type: 'pihole', icon: (c) => <Shield size={18} color={c} />, nameKey: 'servicePihole' },
    { type: 'beszel', icon: (c) => <Activity size={18} color={c} />, nameKey: 'serviceBeszel' },
    { type: 'gitea', icon: (c) => <GitBranch size={18} color={c} />, nameKey: 'serviceGitea' },
];

export default function SettingsScreen() {
    const { connections, disconnectService, isConnected, updateServiceFallbackUrl } = useServices();
    const { language, theme, setLanguage, setTheme } = useSettings();
    const colors = useThemeColors();
    const t = useTranslations();
    const [fallbackInputs, setFallbackInputs] = useState<Record<string, string>>({});

    const handleDisconnect = useCallback((type: ServiceType, name: string) => {
        Alert.alert(
            t.settingsDisconnectConfirm,
            `${t.settingsDisconnectMessage.replace('questo servizio', name).replace('this service', name)}`,
            [
                { text: t.cancel, style: 'cancel' },
                {
                    text: t.settingsDisconnect,
                    style: 'destructive',
                    onPress: () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        disconnectService(type);
                    },
                },
            ]
        );
    }, [disconnectService, t]);

    const handleFallbackSave = useCallback((type: ServiceType) => {
        const val = fallbackInputs[type];
        if (val !== undefined) {
            updateServiceFallbackUrl(type, val.trim());
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    }, [fallbackInputs, updateServiceFallbackUrl]);

    const handleLanguageChange = useCallback((lang: Language) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setLanguage(lang);
    }, [setLanguage]);

    const handleThemeChange = useCallback((th: ThemeMode) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTheme(th);
    }, [setTheme]);

    const s = makeStyles(colors);

    return (
        <ScrollView style={s.container} contentContainerStyle={s.content}>
            <View style={s.section}>
                <Text style={s.sectionTitle}>{t.settingsPreferences}</Text>
                <View style={s.card}>
                    <View style={s.settingRowContainer}>
                        <View style={s.settingRowLeft}>
                            <Languages size={18} color={colors.info} />
                            <Text style={s.settingLabel}>{t.settingsLanguage}</Text>
                        </View>
                    </View>
                    <View style={s.toggleRow}>
                        <TouchableOpacity
                            style={[s.toggleOption, language === 'it' && s.toggleOptionActive]}
                            onPress={() => handleLanguageChange('it')}
                            activeOpacity={0.7}
                        >
                            {language === 'it' && <Check size={14} color={colors.accent} />}
                            <Text style={[s.toggleText, language === 'it' && s.toggleTextActive]}>
                                {t.settingsItalian}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[s.toggleOption, language === 'en' && s.toggleOptionActive]}
                            onPress={() => handleLanguageChange('en')}
                            activeOpacity={0.7}
                        >
                            {language === 'en' && <Check size={14} color={colors.accent} />}
                            <Text style={[s.toggleText, language === 'en' && s.toggleTextActive]}>
                                {t.settingsEnglish}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <View style={s.divider} />
                    <View style={s.settingRowContainer}>
                        <View style={s.settingRowLeft}>
                            {theme === 'dark' ? <Moon size={18} color={colors.paused} /> : <Sun size={18} color={colors.paused} />}
                            <Text style={s.settingLabel}>{t.settingsTheme}</Text>
                        </View>
                    </View>
                    <View style={s.toggleRow}>
                        <TouchableOpacity
                            style={[s.toggleOption, theme === 'dark' && s.toggleOptionActive]}
                            onPress={() => handleThemeChange('dark')}
                            activeOpacity={0.7}
                        >
                            <Moon size={14} color={theme === 'dark' ? colors.accent : colors.textMuted} />
                            <Text style={[s.toggleText, theme === 'dark' && s.toggleTextActive]}>
                                {t.settingsThemeDark}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[s.toggleOption, theme === 'light' && s.toggleOptionActive]}
                            onPress={() => handleThemeChange('light')}
                            activeOpacity={0.7}
                        >
                            <Sun size={14} color={theme === 'light' ? colors.accent : colors.textMuted} />
                            <Text style={[s.toggleText, theme === 'light' && s.toggleTextActive]}>
                                {t.settingsThemeLight}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <View style={s.section}>
                <Text style={s.sectionTitle}>{t.settingsServices}</Text>
                <View style={s.card}>
                    {SERVICE_LIST.map((service, idx) => {
                        const connected = isConnected(service.type);
                        const conn = connections[service.type];
                        const serviceColor = SERVICE_COLORS[service.type];
                        return (
                            <React.Fragment key={service.type}>
                                {idx > 0 && <View style={s.divider} />}
                                <View style={s.serviceRow}>
                                    <View style={s.serviceLeft}>
                                        <View style={[s.serviceIconWrap, { backgroundColor: serviceColor.bg }]}>
                                            {service.icon(serviceColor.primary)}
                                        </View>
                                        <View style={s.serviceInfo}>
                                            <Text style={s.serviceName}>{t[service.nameKey] as string}</Text>
                                            {connected && conn ? (
                                                <Text style={s.serviceUrl} numberOfLines={1}>{conn.url}</Text>
                                            ) : (
                                                <Text style={[s.serviceStatus, { color: colors.textMuted }]}>{t.settingsNotConnected}</Text>
                                            )}
                                        </View>
                                    </View>
                                    {connected ? (
                                        <TouchableOpacity
                                            style={s.disconnectBtn}
                                            onPress={() => handleDisconnect(service.type, t[service.nameKey] as string)}
                                            activeOpacity={0.7}
                                        >
                                            <LogOut size={14} color={colors.danger} />
                                        </TouchableOpacity>
                                    ) : (
                                        <View style={[s.statusDot, { backgroundColor: colors.textMuted + '33' }]} />
                                    )}
                                </View>
                                {connected && conn && (
                                    <View style={s.fallbackRow}>
                                        <View style={s.fallbackInputWrap}>
                                            <Link2 size={14} color={colors.textMuted} />
                                            <TextInput
                                                style={[s.fallbackInput, { color: colors.text, borderColor: colors.border }]}
                                                placeholder="URL Alternativo (fallback)"
                                                placeholderTextColor={colors.textMuted}
                                                value={fallbackInputs[service.type] ?? conn.fallbackUrl ?? ''}
                                                onChangeText={(text) => setFallbackInputs(prev => ({ ...prev, [service.type]: text }))}
                                                onBlur={() => handleFallbackSave(service.type)}
                                                onSubmitEditing={() => handleFallbackSave(service.type)}
                                                autoCapitalize="none"
                                                autoCorrect={false}
                                                keyboardType="url"
                                                returnKeyType="done"
                                            />
                                        </View>
                                    </View>
                                )}
                            </React.Fragment>
                        );
                    })}
                </View>
            </View>

            <View style={s.section}>
                <Text style={s.sectionTitle}>{t.settingsAbout}</Text>
                <View style={s.card}>
                    <View style={s.aboutRow}>
                        <View style={s.settingRowLeft}>
                            <Info size={18} color={colors.textSecondary} />
                            <Text style={s.settingLabel}>{t.settingsVersion}</Text>
                        </View>
                        <Text style={s.aboutValue}>2.0.0</Text>
                    </View>
                </View>
            </View>

            <View style={{ height: 120 }} />
        </ScrollView>
    );
}

function makeStyles(colors: ThemeColors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        content: { paddingHorizontal: 16, paddingTop: 16 },
        section: { marginBottom: 24 },
        sectionTitle: { fontSize: 13, fontWeight: '600' as const, color: colors.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },
        card: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
        divider: { height: 1, backgroundColor: colors.border, marginLeft: 46 },
        settingRowContainer: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
        settingRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
        settingLabel: { fontSize: 15, color: colors.text, fontWeight: '500' as const },
        toggleRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 14, gap: 8 },
        toggleOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.surfaceHover, borderWidth: 1, borderColor: colors.border },
        toggleOptionActive: { backgroundColor: colors.accent + '15', borderColor: colors.accent + '44' },
        toggleText: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' as const },
        toggleTextActive: { color: colors.accent, fontWeight: '600' as const },
        serviceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
        serviceLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
        serviceIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
        serviceInfo: { flex: 1 },
        serviceName: { fontSize: 15, color: colors.text, fontWeight: '500' as const },
        serviceUrl: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
        serviceStatus: { fontSize: 12, marginTop: 2 },
        disconnectBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.dangerBg, alignItems: 'center', justifyContent: 'center' },
        statusDot: { width: 10, height: 10, borderRadius: 5 },
        aboutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
        aboutValue: { fontSize: 14, color: colors.textSecondary },
        fallbackRow: { paddingHorizontal: 16, paddingBottom: 12, paddingTop: 4 },
        fallbackInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        fallbackInput: { flex: 1, fontSize: 12, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surfaceHover },
    });
}

