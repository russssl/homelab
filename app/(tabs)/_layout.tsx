import { Tabs } from 'expo-router';
import React from 'react';
import GlassTabBar from '@/components/GlassTabBar';

export default function TabLayout() {
    return (
        <Tabs
            tabBar={(props) => <GlassTabBar {...props} />}
            screenOptions={{
                headerShown: false,
            }}
        />
    );
}
