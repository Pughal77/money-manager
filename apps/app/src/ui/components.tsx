import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { formatCents, type Cents } from '@mm/core';
import { useVault } from '../data/VaultContext';
import { webSyncClient } from '../platform/client';
import { phoneLanServer } from '../server/lanServer';
import { colors, radius, spacing } from './theme';

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
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
  let color = colors.text;
  let prefix = '';
  if (kind === 'income') {
    color = colors.income;
    prefix = '+';
  } else if (kind === 'expense') {
    color = colors.expense;
    prefix = '-';
  } else if (kind === 'transfer') {
    color = colors.transfer;
  }

  return (
    <Text style={[styles.amount, { color, fontSize: size }]}>
      {prefix}
      {formatCents(Math.abs(cents))}
    </Text>
  );
}

export function ProgressBar({
  progress,
  color = colors.primary,
}: {
  progress: number;
  color?: string;
}) {
  const clamped = Math.max(0, Math.min(1, progress));
  const barColor = progress > 1 ? colors.expense : color;
  return (
    <View style={styles.progressTrack}>
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
  const bg =
    variant === 'primary'
      ? colors.primary
      : variant === 'danger'
        ? colors.expense
        : colors.surfaceElevated;
  const fg = variant === 'primary' ? '#090d16' : colors.text;

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

/**
 * Top status banner:
 * - On Web: shows live connection status to the iPhone, pending changes count, and the [Sync] button.
 * - On iPhone: shows "Allow this browser?" prompt banner whenever a browser on the LAN requests access.
 */
export function SyncTopBar() {
  const { role, webState, lanState } = useVault();

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
                : 'Synced with iPhone (Memory-only session)';

    return (
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <View style={[styles.dot, { backgroundColor: statusDotColor }]} />
          <Text style={styles.topBarText}>{statusLabel}</Text>
        </View>
        <Pressable
          onPress={() => void webSyncClient.syncNow()}
          style={styles.syncNowBtn}
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
    <View style={styles.approvalBanner}>
      <View style={{ flex: 1 }}>
        <Text style={styles.approvalTitle}>
          Allow "{req.deviceName}" to connect?
        </Text>
        <Text style={styles.approvalSub}>
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
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  amount: {
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    height: 8,
    backgroundColor: colors.surfaceElevated,
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
  topBar: {
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
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
    width: 9,
    height: 9,
    borderRadius: 9,
  },
  topBarText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  syncNowBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  syncNowBtnText: {
    color: '#090d16',
    fontSize: 12,
    fontWeight: '700',
  },
  approvalBanner: {
    backgroundColor: '#1e293b',
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  approvalTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  approvalSub: {
    color: colors.textSecondary,
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
