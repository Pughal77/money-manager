import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DesktopSidebar } from '../../src/ui/DesktopSidebar';
import { AppIcon } from '../../src/ui/icons';
import { useTheme } from '../../src/ui/theme';
import { useResponsive } from '../../src/ui/useResponsive';

export default function TabsLayout() {
  const { colors, isDark } = useTheme();
  const { isDesktop } = useResponsive();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(8, insets.bottom);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: isDesktop
          ? { display: 'none' }
          : {
              backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
              borderTopColor: colors.border,
              height: 58 + insets.bottom,
              paddingTop: 6,
              paddingBottom: bottomInset,
            },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11.5,
          fontWeight: '500',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <AppIcon name="tab-home" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color }) => (
            <AppIcon name="tab-calendar" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="statistic"
        options={{
          title: 'Statistic',
          tabBarIcon: ({ color }) => (
            <AppIcon name="tab-statistic" size={22} color={color} />
          ),
        }}
      />
      {/* Secondary screens remain routable via menu/links but hidden from the 3-tab bottom bar */}
      <Tabs.Screen name="transactions" options={{ href: null }} />
      <Tabs.Screen name="budgets" options={{ href: null }} />
      <Tabs.Screen name="accounts" options={{ href: null }} />
      <Tabs.Screen name="reports" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
