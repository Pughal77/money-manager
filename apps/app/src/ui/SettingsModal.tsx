import React, { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  exportBackupZip,
  importBackupZip,
  type RestoreMode,
} from '@mm/core';
import { useVault } from '../data/VaultContext';
import { webSyncClient } from '../platform/client';
import { phoneLanServer } from '../server/lanServer';
import { Button, Card } from './components';
import { AppIcon } from './icons';
import { radius, spacing, useTheme } from './theme';

export function SettingsModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { store, role, webState, lanState } = useVault();
  const { colors, mode, setMode } = useTheme();
  const router = useRouter();

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
        setBackupMessage(`Downloaded CSV ZIP backup (${zipBytes.byteLength} bytes).`);
      } else {
        setBackupMessage(`Generated CSV ZIP archive (${zipBytes.byteLength} bytes).`);
      }
    } catch (err) {
      setBackupMessage(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
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
        setBackupMessage(`Restore failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    input.click();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.bg, borderColor: colors.border },
          ]}
        >
          {/* Sheet Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Menu & Settings
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close menu"
            >
              <AppIcon name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Theme Selector */}
            <Card>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Appearance
              </Text>
              <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                Switch between Dark Mode and pure-white Light Mode.
              </Text>
              <View
                style={[
                  styles.segmentTrack,
                  { backgroundColor: colors.surfaceElevated },
                ]}
              >
                <Pressable
                  onPress={() => setMode('dark')}
                  style={[
                    styles.segmentBtn,
                    mode === 'dark' && { backgroundColor: colors.primary },
                  ]}
                >
                  <AppIcon
                    name="moon"
                    size={16}
                    color={mode === 'dark' ? '#FFFFFF' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      { color: mode === 'dark' ? '#FFFFFF' : colors.textSecondary },
                    ]}
                  >
                    Dark Mode
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setMode('light')}
                  style={[
                    styles.segmentBtn,
                    mode === 'light' && { backgroundColor: colors.primary },
                  ]}
                >
                  <AppIcon
                    name="sun"
                    size={16}
                    color={mode === 'light' ? '#FFFFFF' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      { color: mode === 'light' ? '#FFFFFF' : colors.textSecondary },
                    ]}
                  >
                    Light Mode
                  </Text>
                </Pressable>
              </View>
            </Card>

            {/* Quick Management Links */}
            <Card>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Accounts, Categories & Budgets
              </Text>
              <View style={styles.quickBtnRow}>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Accounts & Categories"
                    variant="secondary"
                    onPress={() => {
                      onClose();
                      router.push('/(tabs)/accounts');
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Monthly Budgets"
                    variant="secondary"
                    onPress={() => {
                      onClose();
                      router.push('/(tabs)/budgets');
                    }}
                  />
                </View>
              </View>
            </Card>

            {/* LAN Server / Web Sync */}
            {role === 'phone-master' ? (
              <Card>
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  iPhone Local Network Web Server
                </Text>
                <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                  Host the web app directly from your iPhone over Wi-Fi or Personal Hotspot.
                </Text>
                <View style={{ marginVertical: spacing.sm }}>
                  {lanState.running ? (
                    <Button
                      label="Stop iPhone Web Server"
                      variant="danger"
                      onPress={() => phoneLanServer.stop()}
                    />
                  ) : (
                    <Button
                      label="Start iPhone Web Server (Port 8787)"
                      onPress={() =>
                        void phoneLanServer.start(store, 8787).catch(() => {})
                      }
                    />
                  )}
                </View>
                {lanState.lastError ? (
                  <Text style={{ color: colors.expense, fontSize: 12 }}>
                    {lanState.lastError}
                  </Text>
                ) : null}
                {lanState.url ? (
                  <View
                    style={[
                      styles.urlBox,
                      {
                        backgroundColor: colors.surfaceElevated,
                        borderColor: colors.primary,
                      },
                    ]}
                  >
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                      Open in your computer browser (ensure SideStore VPN is OFF):
                    </Text>
                    <Text
                      style={{
                        color: colors.primary,
                        fontSize: 18,
                        fontWeight: '700',
                        marginTop: 4,
                      }}
                    >
                      {lanState.url}
                    </Text>
                  </View>
                ) : null}
              </Card>
            ) : (
              <Card>
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  Browser Sync with iPhone
                </Text>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  iPhone Server Address
                </Text>
                <TextInput
                  value={phoneUrlInput}
                  onChangeText={(v) => {
                    setPhoneUrlInput(v);
                    webSyncClient.setPhoneUrl(v);
                  }}
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surfaceElevated,
                      color: colors.text,
                    },
                  ]}
                  placeholder="http://192.168.1.50:8787"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Browser Name
                </Text>
                <TextInput
                  value={deviceNameInput}
                  onChangeText={(v) => {
                    setDeviceNameInput(v);
                    webSyncClient.setDeviceName(v);
                  }}
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surfaceElevated,
                      color: colors.text,
                    },
                  ]}
                  placeholder="Safari on Mac"
                  placeholderTextColor={colors.textMuted}
                />
                <View style={styles.quickBtnRow}>
                  <Button
                    label="Connect / Reconnect"
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

            {/* CSV ZIP Backup */}
            <Card>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                CSV ZIP Backup & Restore
              </Text>
              <View style={{ marginTop: spacing.sm }}>
                <Button label="Export Backup (CSV ZIP)" onPress={handleExportZip} />
              </View>
              <View style={styles.quickBtnRow}>
                {(['merge', 'replace'] as const).map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => setRestoreMode(m)}
                    style={[
                      styles.modeChip,
                      {
                        backgroundColor:
                          restoreMode === m ? colors.primary : colors.surfaceElevated,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: restoreMode === m ? '#FFFFFF' : colors.textSecondary,
                        fontSize: 12,
                        fontWeight: '700',
                      }}
                    >
                      {m === 'merge' ? 'Merge Data' : 'Replace All'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {Platform.OS === 'web' ? (
                <View style={{ marginTop: spacing.sm }}>
                  <Button
                    label={`Import CSV ZIP (${restoreMode.toUpperCase()})`}
                    variant="secondary"
                    onPress={handleImportWebFile}
                  />
                </View>
              ) : null}
              {backupMessage ? (
                <Text
                  style={{
                    color: colors.income,
                    fontSize: 12,
                    marginTop: spacing.sm,
                  }}
                >
                  {backupMessage}
                </Text>
              ) : null}
            </Card>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardSub: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 12,
  },
  segmentTrack: {
    flexDirection: 'row',
    borderRadius: radius.pill,
    padding: 3,
    marginTop: 6,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: radius.pill,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
  },
  quickBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  urlBox: {
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  modeChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.md,
    alignItems: 'center',
  },
});
