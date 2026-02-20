import React, { useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Animated,
    ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    Box,
    Shield,
    Activity,
    GitBranch,
    Globe,
    Lock,
    User,
    Mail,
    Eye,
    EyeOff,
    AlertCircle,
    X,
    Info,
    Key,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useMutation } from '@tanstack/react-query';
import { useServices } from '@/contexts/ServicesContext';
import { useThemeColors, useTranslations } from '@/contexts/SettingsContext';
import { ServiceType, SERVICE_COLORS, ServiceConnection } from '@/types/services';
import { portainerApi } from '@/services/portainer-api';
import { piholeApi } from '@/services/pihole-api';
import { beszelApi } from '@/services/beszel-api';
import { giteaApi } from '@/services/gitea-api';

export default function ServiceLoginScreen() {
    const { type } = useLocalSearchParams<{ type: string }>();
    const serviceType = (type as ServiceType) || 'portainer';
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { connectService } = useServices();
    const colors = useThemeColors();
    const t = useTranslations();

    const [url, setUrl] = useState<string>('');
    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const [useApiKeyMode, setUseApiKeyMode] = useState<boolean>(false);
    const [apiKey, setApiKey] = useState<string>('');

    const shakeAnim = useRef(new Animated.Value(0)).current;
    const usernameRef = useRef<TextInput>(null);
    const passwordRef = useRef<TextInput>(null);

    const serviceColor = SERVICE_COLORS[serviceType];
    const needsUsername = serviceType !== 'pihole' && !useApiKeyMode;
    const usernameLabel = serviceType === 'beszel' ? t.loginEmail : t.loginUsername;
    const showApiKeyToggle = serviceType === 'portainer';

    const getServiceIcon = () => {
        const size = 32;
        const color = serviceColor.primary;
        switch (serviceType) {
            case 'portainer': return <Box size={size} color={color} />;
            case 'pihole': return <Shield size={size} color={color} />;
            case 'beszel': return <Activity size={size} color={color} />;
            case 'gitea': return <GitBranch size={size} color={color} />;
        }
    };

    const getServiceName = (): string => {
        switch (serviceType) {
            case 'portainer': return t.servicePortainer;
            case 'pihole': return t.servicePihole;
            case 'beszel': return t.serviceBeszel;
            case 'gitea': return t.serviceGitea;
        }
    };

    const getLoginHint = (): string | null => {
        switch (serviceType) {
            case 'pihole': return t.loginHintPihole;
            case 'gitea': return t.loginHintGitea2FA;
            default: return null;
        }
    };

    const shakeError = useCallback(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
    }, [shakeAnim]);

    const loginMutation = useMutation({
        mutationFn: async (): Promise<ServiceConnection> => {
            let cleanUrl = url.trim();
            if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
                cleanUrl = 'https://' + cleanUrl;
            }

            if (serviceType === 'portainer' && useApiKeyMode) {
                await portainerApi.authenticateWithApiKey(cleanUrl, apiKey.trim());
                return { type: 'portainer', url: cleanUrl, token: '', apiKey: apiKey.trim() };
            }

            switch (serviceType) {
                case 'portainer': {
                    const jwt = await portainerApi.authenticate(cleanUrl, username.trim(), password);
                    return { type: 'portainer', url: cleanUrl, token: jwt, username: username.trim() };
                }
                case 'pihole': {
                    const sid = await piholeApi.authenticate(cleanUrl, password);
                    return { type: 'pihole', url: cleanUrl, token: sid };
                }
                case 'beszel': {
                    const token = await beszelApi.authenticate(cleanUrl, username.trim(), password);
                    return { type: 'beszel', url: cleanUrl, token, username: username.trim() };
                }
                case 'gitea': {
                    const result = await giteaApi.authenticate(cleanUrl, username.trim(), password);
                    return { type: 'gitea', url: cleanUrl, token: result.token, username: result.username };
                }
            }
        },
        onSuccess: async (connection) => {
            await connectService(connection);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.dismiss();
            setTimeout(() => {
                router.push(`/${serviceType}` as never);
            }, 300);
        },
        onError: (error) => {
            setLocalError(error instanceof Error ? error.message : t.loginErrorFailed);
            shakeError();
        },
    });

    const handleLogin = useCallback(() => {
        setLocalError(null);
        if (!url.trim()) {
            setLocalError(t.loginErrorUrl);
            shakeError();
            return;
        }
        if (useApiKeyMode && serviceType === 'portainer') {
            if (!apiKey.trim()) {
                setLocalError('Inserisci la API Key.');
                shakeError();
                return;
            }
        } else {
            if (needsUsername && !username.trim()) {
                setLocalError(t.loginErrorCredentials);
                shakeError();
                return;
            }
            if (!password.trim()) {
                setLocalError(t.loginErrorCredentials);
                shakeError();
                return;
            }
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        loginMutation.mutate();
    }, [url, username, password, apiKey, useApiKeyMode, needsUsername, loginMutation, shakeError, t, serviceType]);

    const loginHint = getLoginHint();

    return (
        <View style={[s.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            <View style={s.topBar}>
                <TouchableOpacity
                    style={[s.closeBtn, { backgroundColor: colors.surfaceHover }]}
                    onPress={() => router.dismiss()}
                >
                    <X size={20} color={colors.text} />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={s.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={s.headerSection}>
                        <View style={[s.iconWrap, { backgroundColor: serviceColor.bg }]}>
                            {getServiceIcon()}
                        </View>
                        <Text style={[s.serviceName, { color: colors.text }]}>{getServiceName()}</Text>
                        <Text style={[s.serviceSubtitle, { color: colors.textSecondary }]}>
                            {t.loginSubtitle}
                        </Text>
                    </View>

                    <Animated.View style={[s.formSection, { transform: [{ translateX: shakeAnim }] }]}>
                        {loginHint && (
                            <View style={[s.hintBanner, { backgroundColor: colors.infoBg, borderColor: colors.info + '33' }]}>
                                <Info size={16} color={colors.info} />
                                <Text style={[s.hintText, { color: colors.info }]}>{loginHint}</Text>
                            </View>
                        )}

                        {localError && (
                            <View style={[s.errorBanner, { backgroundColor: colors.dangerBg, borderColor: colors.danger + '33' }]}>
                                <AlertCircle size={16} color={colors.danger} />
                                <Text style={[s.errorText, { color: colors.danger }]}>{localError}</Text>
                            </View>
                        )}

                        <View style={[s.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <View style={s.inputIcon}>
                                <Globe size={18} color={colors.textMuted} />
                            </View>
                            <TextInput
                                testID="url-input"
                                style={[s.input, { color: colors.text }]}
                                placeholder={t.loginUrlPlaceholder}
                                placeholderTextColor={colors.textMuted}
                                value={url}
                                onChangeText={setUrl}
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType="url"
                                returnKeyType="next"
                                onSubmitEditing={() => needsUsername ? usernameRef.current?.focus() : passwordRef.current?.focus()}
                            />
                        </View>

                        {showApiKeyToggle && (
                            <TouchableOpacity
                                style={[s.apiKeyToggle, { backgroundColor: colors.surface, borderColor: useApiKeyMode ? serviceColor.primary + '66' : colors.border }]}
                                onPress={() => { setUseApiKeyMode(!useApiKeyMode); setLocalError(null); }}
                                activeOpacity={0.7}
                            >
                                <Key size={16} color={useApiKeyMode ? serviceColor.primary : colors.textMuted} />
                                <Text style={[s.apiKeyToggleText, { color: useApiKeyMode ? serviceColor.primary : colors.textSecondary }]}>
                                    {useApiKeyMode ? 'Usa Username/Password' : 'Usa API Key'}
                                </Text>
                            </TouchableOpacity>
                        )}

                        {useApiKeyMode && serviceType === 'portainer' ? (
                            <View style={[s.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <View style={s.inputIcon}>
                                    <Key size={18} color={colors.textMuted} />
                                </View>
                                <TextInput
                                    testID="apikey-input"
                                    style={[s.input, { color: colors.text }]}
                                    placeholder="API Key"
                                    placeholderTextColor={colors.textMuted}
                                    value={apiKey}
                                    onChangeText={setApiKey}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    secureTextEntry={!showPassword}
                                    returnKeyType="go"
                                    onSubmitEditing={handleLogin}
                                />
                                <TouchableOpacity
                                    style={s.eyeBtn}
                                    onPress={() => setShowPassword(!showPassword)}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    {showPassword ? (
                                        <EyeOff size={18} color={colors.textMuted} />
                                    ) : (
                                        <Eye size={18} color={colors.textMuted} />
                                    )}
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <>
                                {needsUsername && (
                                    <View style={[s.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                        <View style={s.inputIcon}>
                                            {serviceType === 'beszel' ? (
                                                <Mail size={18} color={colors.textMuted} />
                                            ) : (
                                                <User size={18} color={colors.textMuted} />
                                            )}
                                        </View>
                                        <TextInput
                                            ref={usernameRef}
                                            testID="username-input"
                                            style={[s.input, { color: colors.text }]}
                                            placeholder={usernameLabel}
                                            placeholderTextColor={colors.textMuted}
                                            value={username}
                                            onChangeText={setUsername}
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            keyboardType={serviceType === 'beszel' ? 'email-address' : 'default'}
                                            returnKeyType="next"
                                            onSubmitEditing={() => passwordRef.current?.focus()}
                                        />
                                    </View>
                                )}

                                <View style={[s.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                    <View style={s.inputIcon}>
                                        <Lock size={18} color={colors.textMuted} />
                                    </View>
                                    <TextInput
                                        ref={passwordRef}
                                        testID="password-input"
                                        style={[s.input, { color: colors.text }]}
                                        placeholder={t.loginPassword}
                                        placeholderTextColor={colors.textMuted}
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry={!showPassword}
                                        returnKeyType="go"
                                        onSubmitEditing={handleLogin}
                                    />
                                    <TouchableOpacity
                                        style={s.eyeBtn}
                                        onPress={() => setShowPassword(!showPassword)}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    >
                                        {showPassword ? (
                                            <EyeOff size={18} color={colors.textMuted} />
                                        ) : (
                                            <Eye size={18} color={colors.textMuted} />
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}

                        <TouchableOpacity
                            testID="login-button"
                            style={[
                                s.connectBtn,
                                { backgroundColor: serviceColor.primary, opacity: loginMutation.isPending ? 0.7 : 1 },
                            ]}
                            onPress={handleLogin}
                            disabled={loginMutation.isPending}
                            activeOpacity={0.8}
                        >
                            {loginMutation.isPending ? (
                                <ActivityIndicator color="#FFF" size="small" />
                            ) : (
                                <Text style={s.connectBtnText}>{t.loginConnect}</Text>
                            )}
                        </TouchableOpacity>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 4,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    headerSection: {
        alignItems: 'center',
        marginBottom: 36,
    },
    iconWrap: {
        width: 80,
        height: 80,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    serviceName: {
        fontSize: 28,
        fontWeight: '700' as const,
        letterSpacing: -0.3,
    },
    serviceSubtitle: {
        fontSize: 15,
        marginTop: 4,
    },
    formSection: {
        gap: 14,
    },
    hintBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 10,
        borderWidth: 1,
    },
    hintText: {
        fontSize: 12,
        flex: 1,
        lineHeight: 17,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 10,
        borderWidth: 1,
    },
    errorText: {
        fontSize: 13,
        flex: 1,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        borderWidth: 1,
        overflow: 'hidden',
    },
    inputIcon: {
        paddingLeft: 14,
        paddingRight: 4,
    },
    input: {
        flex: 1,
        paddingVertical: 16,
        paddingHorizontal: 10,
        fontSize: 15,
    },
    eyeBtn: {
        paddingHorizontal: 14,
        paddingVertical: 16,
    },
    connectBtn: {
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 6,
    },
    connectBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600' as const,
    },
    apiKeyToggle: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        gap: 8,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
    },
    apiKeyToggleText: {
        fontSize: 14,
        fontWeight: '500' as const,
    },
});

