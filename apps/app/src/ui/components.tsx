import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { formatAmountPlain, type Cents } from '@mm/core';
import { useVault } from '../data/VaultContext';
import { webSyncClient } from '../platform/client';
import { phoneLanServer } from '../server/lanServer';
import { AppIcon } from './icons';
import { radius, spacing, useTheme } from './theme';

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: isDark ? 0 : 1,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function AmountText({
  cents,
  kind,
  size = 16,
}: {
  cents: Cents;
  kind?: 'income' | 'expense' | 'transfer' | 'neutral';
  size?: number;
}) {
  const { colors } = useTheme();
  let color = colors.text;
  if (kind === 'income') {
    color = colors.income;
  } else if (kind === 'expense') {
    color = colors.expense;
  } else if (kind === 'transfer') {
    color = colors.transfer;
  }

  return (
    <Text style={[styles.amount, { color, fontSize: size }]}>
      {formatAmountPlain(cents)}
    </Text>
  );
}

export function ProgressBar({
  progress,
  color,
}: {
  progress: number;
  color?: string;
}) {
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(1, progress));
  const barColor = progress > 1 ? colors.expense : (color ?? colors.primary);
  return (
    <View style={[styles.progressTrack, { backgroundColor: colors.surfaceElevated }]}>
      <View
        style={[
          styles.progressFill,
          { width: `${Math.round(clamped * 100)}%`, backgroundColor: barColor },
        ]}
      />
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const bg =
    variant === 'primary'
      ? colors.primary
      : variant === 'danger'
        ? colors.expense
        : colors.surfaceElevated;
  const fg = variant === 'primary' ? (colors.primaryText ?? '#FFFFFF') : colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function FloatingAddButton({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        {
          backgroundColor: colors.primary,
          transform: [{ scale: pressed ? 0.94 : 1 }],
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel="Add transaction"
    >
      <AppIcon name="plus" size={26} color="#FFFFFF" />
    </Pressable>
  );
}

/**
 * Top status banner:
 * - On Web: shows live connection status to the iPhone, pending changes count, and the [Sync] button.
 * - On iPhone: shows "Allow this browser?" prompt banner whenever a browser on the LAN requests access.
 */
export function SyncTopBar() {
  const { role, webState, lanState } = useVault();
  const { colors } = useTheme();

  if (role === 'web-thin-client') {
    const statusDotColor =
      webState.phase !== 'connected'
        ? colors.warning
        : webState.syncState === 'error'
          ? colors.expense
          : webState.syncState === 'syncing'
            ? colors.primary
            : colors.income;

    const statusLabel =
      webState.phase === 'awaiting-phone-approval'
        ? 'Tap "Allow" on your iPhone to connect...'
        : webState.phase !== 'connected'
          ? `Disconnected (${webState.lastError ?? 'Not connected'})`
          : webState.syncState === 'syncing'
            ? 'Syncing with iPhone...'
            : webState.syncState === 'error'
              ? `Sync paused: ${webState.lastError}`
              : webState.pendingChanges > 0
                ? `${webState.pendingChanges} unsynced change(s)`
                : 'Synced with iPhone';

    return (
      <View
        style={[
          styles.topBar,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.topBarLeft}>
          <View style={[styles.dot, { backgroundColor: statusDotColor }]} />
          <Text style={[styles.topBarText, { color: colors.textSecondary }]}>
            {statusLabel}
          </Text>
        </View>
        <Pressable
          onPress={() => void webSyncClient.syncNow()}
          style={[styles.syncNowBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.syncNowBtnText}>Sync Now</Text>
        </Pressable>
      </View>
    );
  }

  // Phone-only: surface "Allow this browser?" modal banner when a browser requests pairing
  if (lanState.pendingRequests.length === 0) {
    return null;
  }

  const req = lanState.pendingRequests[0];
  return (
    <View
      style={[
        styles.approvalBanner,
        { backgroundColor: colors.surface, borderBottomColor: colors.primary },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.approvalTitle, { color: colors.text }]}>
          Allow "{req.deviceName}" to connect?
        </Text>
        <Text style={[styles.approvalSub, { color: colors.textSecondary }]}>
          A browser on your local network wants to view and sync your finances.
        </Text>
      </View>
      <View style={styles.approvalActions}>
        <Pressable
          onPress={() => phoneLanServer.approval.deny(req.requestId)}
          style={[styles.approvalBtn, { backgroundColor: colors.surfaceElevated }]}
        >
          <Text style={{ color: colors.text, fontWeight: '600' }}>Deny</Text>
        </Pressable>
        <Pressable
          onPress={() => phoneLanServer.approval.approve(req.requestId)}
          style={[styles.approvalBtn, { backgroundColor: colors.income }]}
        >
          <Text style={{ color: '#090d16', fontWeight: '700' }}>Allow</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  amount: {
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    height: 8,
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 22,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  topBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 8,
  },
  topBarText: {
    fontSize: 12,
    fontWeight: '500',
  },
  syncNowBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  syncNowBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  approvalBanner: {
    borderBottomWidth: 2,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  approvalTitle: {
    fontWeight: '700',
    fontSize: 15,
  },
  approvalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  approvalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  approvalBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
});
