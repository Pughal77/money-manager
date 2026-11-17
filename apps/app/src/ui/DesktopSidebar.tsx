import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useVault } from '../data/VaultContext';
import { webSyncClient } from '../platform/client';
import { AppIcon, type IconName } from './icons';
import { BrandLogo } from './BrandLogo';
import { radius, spacing, useTheme } from './theme';

interface NavItem {
  id: string;
  label: string;
  icon: IconName;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Dashboard', icon: 'tab-home', path: '/(tabs)' },
  { id: 'calendar', label: 'Calendar', icon: 'tab-calendar', path: '/(tabs)/calendar' },
  { id: 'statistic', label: 'Statistics', icon: 'tab-statistic', path: '/(tabs)/statistic' },
  { id: 'breakdown', label: 'Decomposition', icon: 'pie-chart', path: '/breakdown' },
  { id: 'accounts', label: 'Accounts', icon: 'banknotes', path: '/(tabs)/accounts' },
  { id: 'budgets', label: 'Budgets', icon: 'document', path: '/(tabs)/budgets' },
  { id: 'settings', label: 'Settings & Sync', icon: 'settings', path: '/(tabs)/settings' },
];

export function DesktopSidebar() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { role, webState, lanState } = useVault();
  const router = useRouter();
  const pathname = usePathname();

  const isNavActive = (itemPath: string) => {
    if (itemPath === '/(tabs)') {
      return (
        pathname === '/' ||
        pathname === '/(tabs)' ||
        pathname === '/(tabs)/index'
      );
    }
    return pathname.startsWith(itemPath);
  };

  const handleSyncPress = () => {
    if (role === 'web-thin-client') {
      void webSyncClient.syncNow();
    }
  };

  const syncStatusDot =
    role === 'web-thin-client'
      ? webState.phase !== 'connected'
        ? colors.warning
        : webState.syncState === 'error'
          ? colors.expense
          : webState.syncState === 'syncing'
            ? colors.primary
            : colors.income
      : lanState.running
        ? colors.income
        : colors.textMuted;

  const syncStatusText =
    role === 'web-thin-client'
      ? webState.phase === 'awaiting-phone-approval'
        ? 'Approval required on phone'
        : webState.phase !== 'connected'
          ? 'Not Connected'
          : webState.syncState === 'syncing'
            ? 'Syncing...'
            : webState.syncState === 'error'
              ? 'Sync Error'
              : webState.pendingChanges > 0
                ? `${webState.pendingChanges} unsynced`
                : 'Synced with iPhone'
      : lanState.running
        ? 'Server Active (8787)'
        : 'Server Offline';

  return (
    <View
      style={[
        styles.sidebar,
        {
          backgroundColor: isDark ? '#181818' : '#F9FAFB',
          borderRightColor: colors.border,
        },
      ]}
    >
      {/* Brand Header */}
      <View style={styles.brandHeader}>
        <BrandLogo size={36} />
        <View>
          <Text style={[styles.brandTitle, { color: colors.text }]}>
            Money Manager
          </Text>
          <Text style={[styles.brandSubtitle, { color: colors.textMuted }]}>
            {role === 'web-thin-client' ? 'Web Thin Client' : 'Local Master'}
          </Text>
        </View>
      </View>

      {/* New Transaction Button */}
      <Pressable
        style={({ hovered, pressed }: any) => [
          styles.newTxButton,
          {
            backgroundColor: colors.primary,
            opacity: pressed ? 0.85 : hovered ? 0.95 : 1,
          },
        ]}
        onPress={() => router.push('/transaction/new')}
      >
        <AppIcon name="plus" size={18} color={colors.primaryText} strokeWidth={2.2} />
        <Text style={[styles.newTxButtonText, { color: colors.primaryText }]}>New Transaction</Text>
      </Pressable>

      {/* Nav List */}
      <ScrollView style={styles.navList} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>
          NAVIGATION
        </Text>
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(item.path);
          return (
            <Pressable
              key={item.id}
              style={({ hovered, pressed }: any) => [
                styles.navItem,
                {
                  backgroundColor: active
                    ? isDark
                      ? colors.surfaceElevated
                      : colors.calendarSelectedBg
                    : hovered
                      ? isDark
                        ? '#222222'
                        : '#F3F4F6'
                      : 'transparent',
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              onPress={() => {
                if (item.path === '/breakdown') {
                  router.push(item.path);
                } else {
                  router.navigate(item.path as any);
                }
              }}
            >
              <AppIcon
                name={item.icon}
                size={18}
                color={active ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.navItemLabel,
                  {
                    color: active ? colors.primary : colors.text,
                    fontWeight: active ? '600' : '400',
                  },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Bottom Controls / Sync Card & Theme Switcher */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        {/* Sync Status Badge */}
        <View
          style={[
            styles.syncBadge,
            {
              backgroundColor: isDark ? '#222222' : '#FFFFFF',
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.syncStatusRow}>
            <View style={[styles.syncDot, { backgroundColor: syncStatusDot }]} />
            <Text
              style={[styles.syncText, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {syncStatusText}
            </Text>
          </View>
          {role === 'web-thin-client' && (
            <Pressable
              style={({ pressed }: any) => [
                styles.syncNowBtn,
                {
                  backgroundColor: isDark ? '#333333' : '#F3F4F6',
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              onPress={handleSyncPress}
            >
              <AppIcon name="sync" size={12} color={colors.text} />
              <Text style={[styles.syncNowText, { color: colors.text }]}>Sync</Text>
            </Pressable>
          )}
        </View>

        {/* Theme Toggle Button */}
        <Pressable
          style={({ hovered, pressed }: any) => [
            styles.themeToggle,
            {
              backgroundColor: hovered
                ? isDark
                  ? '#262626'
                  : '#E5E7EB'
                : 'transparent',
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          onPress={toggleTheme}
        >
          <AppIcon
            name={isDark ? 'sun' : 'moon'}
            size={16}
            color={colors.textSecondary}
          />
          <Text style={[styles.themeToggleText, { color: colors.textSecondary }]}>
            {isDark ? 'Light Theme' : 'Dark Theme'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    height: '100%',
    borderRightWidth: 1,
    paddingTop: 20,
    paddingHorizontal: 14,
    paddingBottom: 16,
    flexDirection: 'column',
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    paddingHorizontal: 6,
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLetter: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  brandSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  newTxButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: radius.md,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  newTxButtonText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#000000',
  },
  sectionHeading: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 10,
  },
  navList: {
    flex: 1,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    marginBottom: 4,
  },
  navItemLabel: {
    fontSize: 13.5,
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 8,
  },
  syncBadge: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  syncStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  syncText: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  syncNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: radius.sm,
    marginLeft: 6,
  },
  syncNowText: {
    fontSize: 11,
    fontWeight: '600',
  },
  themeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.md,
  },
  themeToggleText: {
    fontSize: 12.5,
    fontWeight: '500',
  },
});
