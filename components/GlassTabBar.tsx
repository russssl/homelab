/**
 * GlassTabBar — Polished Liquid Glass floating tab bar
 *
 * Design:
 * - Single glass pill for the whole bar (no per-tab LiquidGlassView resizing)
 * - Full-height sliding indicator (no inset) — covers the entire pill height
 * - Smooth spring transitions: indicator slide, icon scale, dot appear
 * - Labels always visible; color-changes on active/inactive
 * - Dot pops in with spring on active tab
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Platform,
    Pressable,
    LayoutChangeEvent,
    Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Settings } from 'lucide-react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    SharedValue,
    Easing,
} from 'react-native-reanimated';
import { useThemeColors, useTranslations, useSettings } from '@/contexts/SettingsContext';
import { ThemeColors } from '@/constants/themes';

// ─── Liquid Glass safe import ─────────────────────────────────────────────────
let LiquidGlassView: React.ComponentType<any> | null = null;
let USE_GLASS = false;
try {
    const mod = require('@callstack/liquid-glass');
    LiquidGlassView = mod.LiquidGlassView ?? null;
    const isSupported = mod.isLiquidGlassSupported;
    USE_GLASS =
        Platform.OS === 'ios' &&
        !!LiquidGlassView &&
        (typeof isSupported === 'function' ? isSupported() : true);
} catch {
    USE_GLASS = false;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SCREEN_WIDTH = Dimensions.get('window').width;
const BAR_MARGIN = 20;
const BAR_WIDTH = SCREEN_WIDTH - BAR_MARGIN * 2;

// Spring configs
const SLIDE_SPRING = { damping: 26, stiffness: 260, mass: 0.9 } as const;
const ICON_SPRING = { damping: 18, stiffness: 320, mass: 0.6 } as const;
const DOT_SPRING = { damping: 20, stiffness: 350, mass: 0.5 } as const;
const PRESS_SPRING = { damping: 16, stiffness: 300, mass: 0.7 } as const;
const COLOR_TIMING = { duration: 200, easing: Easing.bezier(0.4, 0, 0.2, 1) } as const;

const TAB_DEFS = [
    { name: '(home)', labelKey: 'tabHome' as const, Icon: Home },
    { name: 'settings', labelKey: 'tabSettings' as const, Icon: Settings },
] as const;

interface GlassTabBarProps {
    state: { index: number; routes: Array<{ key: string; name: string }> };
    navigation: any;
    descriptors: Record<string, unknown>;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function GlassTabBar({ state, navigation }: GlassTabBarProps) {
    const insets = useSafeAreaInsets();
    const { theme } = useSettings();
    const colors = useThemeColors();
    const t = useTranslations();

    // Tab layout measurements
    const [tabWidths, setTabWidths] = useState([0, 0]);
    const [tabOffsets, setTabOffsets] = useState([0, 0]);

    // Indicator slide + size (UI thread)
    const indicatorX = useSharedValue(0);
    const indicatorW = useSharedValue(0);

    // Per-tab icon scale (1.0 inactive → 1.12 active)
    const iconScale0 = useSharedValue(state.index === 0 ? 1.12 : 1.0);
    const iconScale1 = useSharedValue(state.index === 1 ? 1.12 : 1.0);
    const iconScales = [iconScale0, iconScale1];

    // Per-tab dot opacity/scale (0 inactive → 1 active)
    const dot0 = useSharedValue(state.index === 0 ? 1 : 0);
    const dot1 = useSharedValue(state.index === 1 ? 1 : 0);
    const dots = [dot0, dot1];

    // Indicator label opacity per tab
    const labelOpacity0 = useSharedValue(state.index === 0 ? 1 : 0.45);
    const labelOpacity1 = useSharedValue(state.index === 1 ? 1 : 0.45);
    const labelOpacities = [labelOpacity0, labelOpacity1];

    // Whole pill press scale
    const pillScale = useSharedValue(1);

    useEffect(() => {
        // Indicator position
        const x = tabOffsets[state.index] ?? 0;
        const w = tabWidths[state.index] ?? 0;
        if (w > 0) {
            indicatorX.value = withSpring(x, SLIDE_SPRING);
            indicatorW.value = withSpring(w, SLIDE_SPRING);
        }
        // Icon scale
        iconScale0.value = withSpring(state.index === 0 ? 1.12 : 1.0, ICON_SPRING);
        iconScale1.value = withSpring(state.index === 1 ? 1.12 : 1.0, ICON_SPRING);
        // Dots
        dot0.value = withSpring(state.index === 0 ? 1 : 0, DOT_SPRING);
        dot1.value = withSpring(state.index === 1 ? 1 : 0, DOT_SPRING);
        // Label brightness
        labelOpacity0.value = withTiming(state.index === 0 ? 1 : 0.45, COLOR_TIMING);
        labelOpacity1.value = withTiming(state.index === 1 ? 1 : 0.45, COLOR_TIMING);
    }, [state.index, tabOffsets, tabWidths]);

    const handleTabLayout = useCallback((index: number, e: LayoutChangeEvent) => {
        const { x, width } = e.nativeEvent.layout;
        setTabWidths(prev => { const n = [...prev]; n[index] = width; return n; });
        setTabOffsets(prev => { const n = [...prev]; n[index] = x; return n; });
    }, []);

    const indicatorStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: indicatorX.value }],
        width: indicatorW.value,
    }));

    const pillScaleStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pillScale.value }],
    }));

    const handlePress = useCallback((tabName: string, index: number) => {
        pillScale.value = withSpring(0.96, PRESS_SPRING, () => {
            pillScale.value = withSpring(1, PRESS_SPRING);
        });
        const isActive = state.index === index;
        const event = navigation.emit({
            type: 'tabPress',
            target: state.routes[index]?.key,
            canPreventDefault: true,
        });
        if (!isActive && !event.defaultPrevented) {
            navigation.navigate(tabName);
        }
    }, [state, navigation, pillScale]);

    // Lowered tab bar position closer to the bottom edge
    const bottomOffset = Math.max(insets.bottom - 14, 12);

    const GlassBar = USE_GLASS ? LiquidGlassView! : View;
    const glassBarProps = USE_GLASS
        ? { effect: 'regular', colorScheme: theme }
        : {};

    const labels = TAB_DEFS.map(d => t[d.labelKey as keyof typeof t] as string);

    return (
        <View
            style={[styles.outerContainer, { bottom: bottomOffset }]}
            pointerEvents="box-none"
        >
            <Animated.View style={[styles.animatedWrapper, pillScaleStyle]}>
                <GlassBar
                    {...glassBarProps}
                    style={[
                        styles.bar,
                        !USE_GLASS && {
                            backgroundColor: colors.surface + 'F2',
                            borderColor: colors.border,
                            borderWidth: 1,
                        },
                    ]}
                >
                    {/* Full-height sliding indicator — NO top/bottom inset */}
                    <Animated.View
                        style={[
                            styles.indicator,
                            { backgroundColor: colors.accent + '28' },
                            indicatorStyle,
                        ]}
                        pointerEvents="none"
                    />

                    {TAB_DEFS.map((def, index) => (
                        <TabItem
                            key={def.name}
                            index={index}
                            Icon={def.Icon}
                            label={labels[index]}
                            isActive={state.index === index}
                            iconScale={iconScales[index]}
                            dotProgress={dots[index]}
                            labelOpacity={labelOpacities[index]}
                            colors={colors}
                            onPress={handlePress}
                            tabName={def.name}
                            onLayout={handleTabLayout}
                        />
                    ))}
                </GlassBar>
            </Animated.View>
        </View>
    );
}

// ─── Tab Item ─────────────────────────────────────────────────────────────────
interface TabItemProps {
    index: number;
    Icon: typeof Home | typeof Settings;
    label: string;
    isActive: boolean;
    iconScale: SharedValue<number>;
    dotProgress: SharedValue<number>;
    labelOpacity: SharedValue<number>;
    colors: ThemeColors;
    onPress: (tabName: string, index: number) => void;
    tabName: string;
    onLayout: (index: number, e: LayoutChangeEvent) => void;
}

const TabItem = React.memo(function TabItem({
    index, Icon, label, isActive, iconScale, dotProgress, labelOpacity,
    colors, onPress, tabName, onLayout,
}: TabItemProps) {

    const handlePress = useCallback(() => onPress(tabName, index), [onPress, tabName, index]);
    const handleLayout = useCallback((e: LayoutChangeEvent) => onLayout(index, e), [onLayout, index]);

    // Icon scale bounce
    const iconStyle = useAnimatedStyle(() => ({
        transform: [{ scale: iconScale.value }],
    }));

    // Dot pop: scale 0→1 + opacity
    const dotStyle = useAnimatedStyle(() => ({
        opacity: dotProgress.value,
        transform: [{ scale: dotProgress.value }],
    }));

    // Label brightness
    const labelStyle = useAnimatedStyle(() => ({
        opacity: labelOpacity.value,
    }));

    const iconColor = isActive ? colors.accent : colors.textMuted;

    return (
        <Pressable
            onPress={handlePress}
            onLayout={handleLayout}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={label}
            style={styles.tab}
        >
            {/* Icon with spring scale */}
            <Animated.View style={[styles.tabInner, iconStyle]}>
                <Icon size={22} color={iconColor} />
                <Animated.Text
                    style={[styles.tabLabel, { color: colors.text }, labelStyle]}
                    numberOfLines={1}
                >
                    {label}
                </Animated.Text>
            </Animated.View>

            {/* Dot — spring pop */}
            <Animated.View
                style={[styles.activeDot, { backgroundColor: colors.accent }, dotStyle]}
                pointerEvents="none"
            />
        </Pressable>
    );
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    outerContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 9999,
        elevation: 9999,
    } as any,
    animatedWrapper: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.22,
        shadowRadius: 22,
        elevation: 14,
    },
    bar: {
        flexDirection: 'row',
        borderRadius: 100,   // pill shape
        width: BAR_WIDTH,
        overflow: 'hidden',  // needed so full-height indicator clips to pill shape
    },
    indicator: {
        position: 'absolute',
        // FULL HEIGHT — no top/bottom inset
        top: 0,
        bottom: 0,
        borderRadius: 100,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 10,
        minHeight: 58,
        position: 'relative',
    },
    tabInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    tabLabel: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: -0.3,
    },
    activeDot: {
        position: 'absolute',
        bottom: 5,
        alignSelf: 'center',
        width: 4,
        height: 4,
        borderRadius: 2,
    },
});
