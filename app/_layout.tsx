import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, Easing } from 'react-native-reanimated';
import { ServicesProvider, useServices } from '@/contexts/ServicesContext';
import { SettingsProvider, useThemeColors } from '@/contexts/SettingsContext';
import { useSettings } from '@/contexts/SettingsContext';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const { width, height } = Dimensions.get('window');

function RootLayoutNav() {
    const { isReady } = useServices();
    const colors = useThemeColors();
    const { theme } = useSettings();

    const overlayOpacity = useSharedValue(0);
    const [overlayColor, setOverlayColor] = useState(colors.background);
    const prevTheme = useRef(theme);

    useEffect(() => {
        if (isReady) {
            SplashScreen.hideAsync();
        }
    }, [isReady]);

    useEffect(() => {
        if (prevTheme.current !== theme && isReady) {
            // Theme changed, trigger transition
            setOverlayColor(colors.background);
            overlayOpacity.value = 1; // instantly show overlay of NEW color
            overlayOpacity.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) }); // fade out to reveal new theme
        }
        prevTheme.current = theme;
    }, [theme, isReady, colors.background]);

    const overlayStyle = useAnimatedStyle(() => {
        return {
            opacity: overlayOpacity.value,
            pointerEvents: overlayOpacity.value > 0 ? 'auto' : 'none',
        };
    });

    return (
        <View style={{ flex: 1 }}>
            <Stack
                screenOptions={{
                    headerBackTitle: 'Back',
                    contentStyle: { backgroundColor: colors.background },
                }}
            >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                    name="service-login"
                    options={{
                        headerShown: false,
                        presentation: 'modal',
                        animation: 'slide_from_bottom',
                    }}
                />
                <Stack.Screen name="portainer" options={{ headerShown: false }} />
                <Stack.Screen name="pihole" options={{ headerShown: false }} />
                <Stack.Screen name="beszel" options={{ headerShown: false }} />
                <Stack.Screen name="gitea" options={{ headerShown: false }} />
            </Stack>

            <Animated.View
                style={[
                    StyleSheet.absoluteFillObject,
                    { backgroundColor: overlayColor, zIndex: 99999 },
                    overlayStyle
                ]}
            />
        </View>
    );
}

export default function RootLayout() {
    return (
        <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <SettingsProvider>
                    <ServicesProvider>
                        <RootLayoutNav />
                    </ServicesProvider>
                </SettingsProvider>
            </GestureHandlerRootView>
        </QueryClientProvider>
    );
}

