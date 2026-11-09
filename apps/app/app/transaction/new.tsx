import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  addTransaction,
  listAccounts,
  listCategories,
  parseToCents,
  type TransactionKind,
} from '@mm/core';
import { useVault } from '../../src/data/VaultContext';
import { Button, Card } from '../../src/ui/components';
import { colors, radius, spacing } from '../../src/ui/theme';

export default function NewTransactionScreen() {
  const { store } = useVault();
  const router = useRouter();

  const accounts = listAccounts(store);
  const [kind, setKind] = useState<TransactionKind>('expense');
  const categories = listCategories(
    store,
    kind === 'income' ? 'income' : 'expense'
  );

  const [amountStr, setAmountStr] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id ?? '');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    try {
      setError(null);
      const cents = parseToCents(amountStr);
      if (cents <= 0) {
        throw new Error('Please enter an amount greater than 0');
      }
      addTransaction(store, {
        kind,
        amount: cents,
        accountId: accountId || accounts[0]?.id || '',
        toAccountId: kind === 'transfer' ? toAccountId : '',
        categoryId: kind === 'transfer' ? '' : categoryId || categories[0]?.id || '',
        date,
        note,
      });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card>
        <View style={styles.kindRow}>
          {(['expense', 'income', 'transfer'] as const).map((k) => (
            <Pressable
              key={k}
              onPress={() => setKind(k)}
              style={[styles.kindBtn, kind === k && styles.kindBtnActive]}
            >
              <Text
                style={[styles.kindText, kind === k && styles.kindTextActive]}
              >
                {k.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Amount ($)</Text>
        <TextInput
          value={amountStr}
          onChangeText={setAmountStr}
          placeholder="0.00"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          style={styles.amountInput}
        />

        <Text style={styles.label}>Account</Text>
        <View style={styles.chipWrap}>
          {accounts.map((acc) => (
            <Pressable
              key={acc.id}
              onPress={() => setAccountId(acc.id)}
              style={[styles.chip, accountId === acc.id && styles.chipActive]}
            >
              <Text
                style={[
                  styles.chipText,
                  accountId === acc.id && styles.chipTextActive,
                ]}
              >
                {acc.name}
              </Text>
            </Pressable>
          ))}
        </View>

        {kind === 'transfer' ? (
          <>
            <Text style={styles.label}>To Account</Text>
            <View style={styles.chipWrap}>
              {accounts.map((acc) => (
                <Pressable
                  key={acc.id}
                  onPress={() => setToAccountId(acc.id)}
                  style={[
                    styles.chip,
                    toAccountId === acc.id && styles.chipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      toAccountId === acc.id && styles.chipTextActive,
                    ]}
                  >
                    {acc.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.label}>Category</Text>
            <View style={styles.chipWrap}>
              {categories.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => setCategoryId(cat.id)}
                  style={[
                    styles.chip,
                    categoryId === cat.id && styles.chipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      categoryId === cat.id && styles.chipTextActive,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
        <TextInput
          value={date}
          onChangeText={setDate}
          style={styles.input}
          placeholder="2026-11-10"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Note</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          style={styles.input}
          placeholder="Optional description..."
          placeholderTextColor={colors.textMuted}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={{ marginTop: spacing.lg }}>
          <Button label="Save Transaction" onPress={handleSave} />
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, maxWidth: 640, width: '100%', alignSelf: 'center' },
  kindRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  kindBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
  },
  kindBtnActive: { backgroundColor: colors.primary },
  kindText: { color: colors.textSecondary, fontWeight: '700', fontSize: 13 },
  kindTextActive: { color: '#090d16' },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  amountInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
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
  error: { color: colors.expense, marginTop: spacing.sm, fontSize: 13 },
});
