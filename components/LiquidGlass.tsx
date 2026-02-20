/**
 * LiquidGlass.tsx — Centralized Liquid Glass Design System
 *
 * Based on Apple iOS 26 HIG and WWDC 2025 guidelines:
 * - LiquidGlassContainerView MUST wrap all sibling glass elements
 * - interactive: true on all interactive glass elements
 * - Never nest glass on glass (one level only)
 * - effect='regular' for navigation controls, toolbar, cards
 * - effect='clear' only over media-rich backgrounds (photos, video)
 *
 * Performance:
 * - Glass support is checked ONCE at module load time (not per-render)
 * - useGlassSupport() returns a cached module-level boolean
 *
 * @see liquidglassios26.md
 */
import React from 'react';
import { View, ViewStyle, StyleProp, Platform } from 'react-native';
import { useSettings } from '@/contexts/SettingsContext';

// ─── Safe Liquid Glass imports ─────────────────────────────────────────────────
let _LiquidGlassView: React.ComponentType<any> | null = null;
let _LiquidGlassContainerView: React.ComponentType<any> | null = null;

// Glass support is evaluated ONCE at module load time — never per render.
// This avoids repeated Platform.OS checks and isLiquidGlassSupported() calls.
let GLASS_SUPPORTED = false;

try {
    const mod = require('@callstack/liquid-glass');
    _LiquidGlassView = mod.LiquidGlassView ?? null;
    _LiquidGlassContainerView = mod.LiquidGlassContainerView ?? null;
    const isSupported = mod.isLiquidGlassSupported;
    GLASS_SUPPORTED =
        Platform.OS === 'ios' &&
        !!_LiquidGlassView &&
        !!_LiquidGlassContainerView &&
        (typeof isSupported === 'function' ? isSupported() : true);
} catch {
    GLASS_SUPPORTED = false;
}

// ─── Animation spring configs (module-level, never re-created) ─────────────────
export const SPRING_PRESS = { damping: 18, stiffness: 350, mass: 0.6 } as const;
export const SPRING_APPEAR = { damping: 22, stiffness: 280, mass: 0.8 } as const;

// ─── Hook: returns the cached module-level glass support result ────────────────
// Never calls isLiquidGlassSupported() on every render — stable reference.
export function useGlassSupport() {
    return { supported: GLASS_SUPPORTED };
}

// ─── Types ─────────────────────────────────────────────────────────────────────
type GlassEffect = 'regular' | 'clear' | 'none';
type GlassColorScheme = 'system' | 'light' | 'dark';

interface GlassBaseProps {
    children?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    fallbackStyle?: StyleProp<ViewStyle>;
}

interface GlassCardProps extends GlassBaseProps {
    /** Glass material: 'regular' for most UI, 'clear' over photos/video */
    effect?: GlassEffect;
    colorScheme?: GlassColorScheme;
}

interface GlassGroupProps extends GlassBaseProps {
    /**
     * Distance at which sibling glass elements start to merge (like water drops).
     * Match this to the gap between elements. Default: 20
     */
    spacing?: number;
}

// ─── GlassCard ─────────────────────────────────────────────────────────────────
/**
 * A glass-material surface. Uses LiquidGlassView on iOS 26+,
 * falls back to a plain View on older OS / Android.
 *
 * MANDATORY: Wrap sibling GlassCards in <GlassGroup> — never use alone.
 */
export const GlassCard = React.memo(function GlassCard({
    children,
    style,
    effect = 'regular',
    colorScheme,
    fallbackStyle,
}: GlassCardProps) {
    const { theme } = useSettings();
    const activeColorScheme = colorScheme || theme;
    const GlassView = _LiquidGlassView as any;

    if (GLASS_SUPPORTED) {
        return (
            <GlassView effect={effect} colorScheme={activeColorScheme} style={style}>
                {children}
            </GlassView>
        );
    }

    return <View style={[style, fallbackStyle]}>{children}</View>;
});

// ─── GlassGroup ────────────────────────────────────────────────────────────────
/**
 * Container for multiple sibling GlassCard / GlassButtonWrapper elements.
 * MANDATORY when you have more than one glass element side-by-side.
 * Enables morphing, shared GPU region, and the "water drop merge" effect.
 * Equivalent to SwiftUI's GlassEffectContainer.
 */
export const GlassGroup = React.memo(function GlassGroup({
    children,
    style,
    spacing = 20,
    fallbackStyle,
}: GlassGroupProps) {
    const ContainerView = _LiquidGlassContainerView as any;

    if (GLASS_SUPPORTED) {
        return (
            <ContainerView spacing={spacing} style={style}>
                {children}
            </ContainerView>
        );
    }

    return <View style={[style, fallbackStyle]}>{children}</View>;
});

// ─── GlassButtonWrapper ───────────────────────────────────────────────────────
/**
 * An interactive glass surface for buttons and pressable controls.
 * interactive=true enables Apple's native scaling + bounce + shimmer effect.
 * Equivalent to SwiftUI's .glassEffect(.regular.interactive())
 *
 * Use inside <GlassGroup> when grouped with other glass elements.
 */
export const GlassButtonWrapper = React.memo(function GlassButtonWrapper({
    children,
    style,
    effect = 'regular',
    colorScheme,
    fallbackStyle,
}: GlassCardProps) {
    const { theme } = useSettings();
    const activeColorScheme = colorScheme || theme;
    const GlassView = _LiquidGlassView as any;

    if (GLASS_SUPPORTED) {
        return (
            <GlassView
                effect={effect}
                colorScheme={activeColorScheme}
                interactive={true}
                style={style}
            >
                {children}
            </GlassView>
        );
    }

    return <View style={[style, fallbackStyle]}>{children}</View>;
});
