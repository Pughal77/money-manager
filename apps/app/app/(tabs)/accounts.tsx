import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  addAccount,
  getAccountBalances,
  parseToCents,
  type AccountType,
} from '@mm/core';
import { useVault } from '../../src/data/VaultContext';
import { AmountText, Button, Card } from '../../src/ui/components';
import { colors, radius, spacing } from '../../src/ui/theme';

export default function AccountsScreen() {
  const { store } = useVault();
  const accounts = getAccountBalances(store);

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('checking');
  const [openingStr, setOpeningStr] = useState('0.00');

  const handleCreate = () => {
    try {
      if (!name.trim()) return;
      const cents = parseToCents(openingStr || '0');
      addAccount(store, { name, type, openingBalance: cents });
      setName('');
      setOpeningStr('0.00');
    } catch {
      // ignore invalid
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Your Accounts</Text>
      <Card>
        {accounts.map((acc) => (
          <View key={acc.id} style={styles.row}>
            <View>
              <Text style={styles.name}>{acc.name}</Text>
              <Text style={styles.sub}>{acc.type.toUpperCase()}</Text>
            </View>
            <AmountText cents={acc.balance} size={17} />
          </View>
        ))}
      </Card>

      <Text style={styles.sectionTitle}>Add Account</Text>
      <Card>
        <Text style={styles.label}>Account Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Chase Sapphire"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />

        <Text style={styles.label}>Account Type</Text>
        <View style={styles.chipWrap}>
          {(['checking', 'savings', 'cash', 'credit'] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setType(t)}
              style={[styles.chip, type === t && styles.chipActive]}
            >
              <Text
                style={[styles.chipText, type === t && styles.chipTextActive]}
              >
                {t.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Opening Balance ($)</Text>
        <TextInput
          value={openingStr}
          onChangeText={setOpeningStr}
          keyboardType="decimal-pad"
          style={styles.input}
        />

        <View style={{ marginTop: spacing.md }}>
          <Button label="Create Account" onPress={handleCreate} />
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, maxWidth: 920, width: '100%', alignSelf: 'center' },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  name: { color: colors.text, fontSize: 16, fontWeight: '700' },
  sub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
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
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#090d16', fontWeight: '700' },
});
