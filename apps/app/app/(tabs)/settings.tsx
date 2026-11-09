import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  exportBackupZip,
  importBackupZip,
  type RestoreMode,
} from '@mm/core';
import { useVault } from '../../src/data/VaultContext';
import { webSyncClient } from '../../src/platform/client';
import { phoneLanServer } from '../../src/server/lanServer';
import { Button, Card } from '../../src/ui/components';
import { colors, radius, spacing } from '../../src/ui/theme';

export default function SettingsScreen() {
  const { store, role, webState, lanState } = useVault();
  const [phoneUrlInput, setPhoneUrlInput] = useState(webState.phoneUrl);
  const [deviceNameInput, setDeviceNameInput] = useState(webState.deviceName);
  const [restoreMode, setRestoreMode] = useState<RestoreMode>('merge');
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  const handleExportZip = () => {
    try {
      const zipBytes = exportBackupZip(store);
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const blob = new Blob([zipBytes], { type: 'application/zip' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `money-manager-backup-${new Date().toISOString().slice(0, 10)}.zip`;
        a.click();
        URL.revokeObjectURL(url);
        setBackupMessage(
          `Downloaded CSV ZIP backup (${zipBytes.byteLength} bytes).`
        );
      } else {
        setBackupMessage(
          `Generated CSV ZIP archive (${zipBytes.byteLength} bytes).`
        );
      }
    } catch (err) {
      setBackupMessage(
        `Export failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  const handleImportWebFile = () => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip,application/zip';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const buf = await file.arrayBuffer();
        const result = importBackupZip(store, new Uint8Array(buf), restoreMode);
        setBackupMessage(
          `Restored ${result.importedRows} rows (${restoreMode.toUpperCase()} mode).`
        );
      } catch (err) {
        setBackupMessage(
          `Restore failed: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    };
    input.click();
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {role === 'phone-master' ? (
        <Card>
          <Text style={styles.title}>iPhone Local Network Web Access</Text>
          <Text style={styles.sub}>
            Your iPhone holds the master SQLite database. Turn on Web Access to
            let your Mac or PC browser connect over Wi-Fi or Personal Hotspot.
          </Text>

          <View style={{ marginVertical: spacing.md }}>
            {lanState.running ? (
              <Button
                label="Stop Web Access Server"
                variant="danger"
                onPress={() => phoneLanServer.stop()}
              />
            ) : (
              <Button
                label="Start Web Access Server (Port 8787)"
                onPress={() => void phoneLanServer.start(store, 8787)}
              />
            )}
          </View>

          {lanState.url && (
            <View style={styles.urlBox}>
              <Text style={styles.urlLabel}>Open on your Mac / Browser:</Text>
              <Text style={styles.urlValue}>{lanState.url}</Text>
            </View>
          )}

          {lanState.pendingRequests.length > 0 && (
            <View style={{ marginTop: spacing.md }}>
              <Text style={styles.sectionHeader}>
                Pending "Allow this browser?" Prompts
              </Text>
              {lanState.pendingRequests.map((req) => (
                <View key={req.requestId} style={styles.deviceRow}>
                  <View>
                    <Text style={styles.deviceName}>{req.deviceName}</Text>
                    <Text style={styles.deviceMeta}>Waiting for approval</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Button
                      label="Deny"
                      variant="secondary"
                      onPress={() =>
                        phoneLanServer.approval.deny(req.requestId)
                      }
                    />
                    <Button
                      label="Allow"
                      onPress={() =>
                        phoneLanServer.approval.approve(req.requestId)
                      }
                    />
                  </View>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.sectionHeader}>Approved Browsers</Text>
          {lanState.approvedDevices.length === 0 ? (
            <Text style={styles.muted}>No active browser sessions.</Text>
          ) : (
            lanState.approvedDevices.map((dev) => (
              <View key={dev.token} style={styles.deviceRow}>
                <View>
                  <Text style={styles.deviceName}>{dev.deviceName}</Text>
                  <Text style={styles.deviceMeta}>{dev.approvedAt}</Text>
                </View>
                <Button
                  label="Disconnect"
                  variant="secondary"
                  onPress={() => phoneLanServer.approval.revokeToken(dev.token)}
                />
              </View>
            ))
          )}
        </Card>
      ) : (
        <Card>
          <Text style={styles.title}>Connect Browser to iPhone</Text>
          <Text style={styles.sub}>
            This web app stores nothing on disk. It loads your snapshot from the
            iPhone over local Wi-Fi or Hotspot and syncs changes automatically
            on every event, when you click Sync Now, or when you close the tab.
          </Text>

          <Text style={styles.label}>iPhone Server Address</Text>
          <TextInput
            value={phoneUrlInput}
            onChangeText={(v) => {
              setPhoneUrlInput(v);
              webSyncClient.setPhoneUrl(v);
            }}
            style={styles.input}
            placeholder="http://172.20.10.1:8787"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Browser Name (shown on iPhone prompt)</Text>
          <TextInput
            value={deviceNameInput}
            onChangeText={(v) => {
              setDeviceNameInput(v);
              webSyncClient.setDeviceName(v);
            }}
            style={styles.input}
            placeholder="Safari on Mac"
            placeholderTextColor={colors.textMuted}
          />

          <View style={styles.btnRow}>
            <Button
              label={
                webState.phase === 'awaiting-phone-approval'
                  ? 'Waiting for "Allow" on iPhone...'
                  : 'Connect / Reconnect to iPhone'
              }
              onPress={() => void webSyncClient.connectAndRequestApproval(store)}
            />
            <Button
              label="Sync Now"
              variant="secondary"
              onPress={() => void webSyncClient.syncNow()}
            />
          </View>
        </Card>
      )}

      <Card>
        <Text style={styles.title}>CSV ZIP Backup & Restore</Text>
        <Text style={styles.sub}>
          Export all accounts, categories, transactions, and budgets as a ZIP of
          CSV files, or restore from a previous backup.
        </Text>

        <View style={{ marginTop: spacing.md }}>
          <Button label="Export Backup (CSV ZIP)" onPress={handleExportZip} />
        </View>

        <Text style={styles.label}>
          When restoring from CSV backup, how should existing data be handled?
        </Text>
        <View style={styles.modeRow}>
          {(['merge', 'replace'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setRestoreMode(m)}
              style={[
                styles.modeChip,
                restoreMode === m && styles.modeChipActive,
              ]}
            >
              <Text
                style={[
                  styles.modeText,
                  restoreMode === m && styles.modeTextActive,
                ]}
              >
                {m === 'merge'
                  ? 'MERGE WITH EXISTING DATA'
                  : 'REPLACE EVERYTHING'}
              </Text>
            </Pressable>
          ))}
        </View>

        {Platform.OS === 'web' && (
          <View style={{ marginTop: spacing.md }}>
            <Button
              label={`Import CSV ZIP (${restoreMode.toUpperCase()})`}
              variant="secondary"
              onPress={handleImportWebFile}
            />
          </View>
        )}

        {backupMessage && (
          <Text style={styles.backupFeedback}>{backupMessage}</Text>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, maxWidth: 920, width: '100%', alignSelf: 'center' },
  title: { color: colors.text, fontSize: 18, fontWeight: '800' },
  sub: { color: colors.textSecondary, fontSize: 13, marginTop: 4, lineHeight: 19 },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: 15,
  },
  btnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  urlBox: {
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  urlLabel: { color: colors.textSecondary, fontSize: 12 },
  urlValue: { color: colors.primary, fontSize: 20, fontWeight: '800', marginTop: 2 },
  sectionHeader: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  deviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  deviceName: { color: colors.text, fontWeight: '700', fontSize: 14 },
  deviceMeta: { color: colors.textMuted, fontSize: 11 },
  muted: { color: colors.textMuted, fontSize: 13 },
  modeRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  modeChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
  },
  modeChipActive: { backgroundColor: colors.primary },
  modeText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  modeTextActive: { color: '#090d16' },
  backupFeedback: {
    color: colors.income,
    fontSize: 13,
    marginTop: spacing.md,
    fontWeight: '600',
  },
});
