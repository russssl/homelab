import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    Easing,
} from 'react-native-reanimated';
import { useThemeColors } from '@/contexts/SettingsContext';

interface SkeletonLoaderProps {
    width?: number | string;
    height?: number | string;
    borderRadius?: number;
    style?: any;
    flex?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
    width,
    height = 20,
    borderRadius = 8,
    style,
    flex,
}) => {
    const colors = useThemeColors();
    const opacity = useSharedValue(0.3);

    useEffect(() => {
        opacity.value = withRepeat(
            withSequence(
                withTiming(0.7, { duration: 800, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) })
            ),
            -1, // infinite
            true // reverse
        );
    }, [opacity]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
        };
    });

    const baseStyle = {
        width,
        height,
        borderRadius,
        backgroundColor: colors.border,
        flex,
    };

    return <Animated.View style={[baseStyle, animatedStyle, style]} />;
};

export const SkeletonCard: React.FC = () => {
    const colors = useThemeColors();

    return (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <SkeletonLoader width={48} height={48} borderRadius={12} />
                <View style={{ marginLeft: 16, flex: 1 }}>
                    <SkeletonLoader width="60%" height={18} borderRadius={4} style={{ marginBottom: 8 }} />
                    <SkeletonLoader width="40%" height={14} borderRadius={4} />
                </View>
            </View>
            <SkeletonLoader width="100%" height={14} borderRadius={4} style={{ marginBottom: 8 }} />
            <SkeletonLoader width="80%" height={14} borderRadius={4} />
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        marginBottom: 16,
    },
});
