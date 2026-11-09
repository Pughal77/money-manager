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
  deleteTransaction,
  listAccounts,
  listCategories,
  listTransactions,
  type TransactionKind,
} from '@mm/core';
import { useVault } from '../../src/data/VaultContext';
import { AmountText, Button, Card } from '../../src/ui/components';
import { colors, radius, spacing } from '../../src/ui/theme';

export default function TransactionsScreen() {
  const { store } = useVault();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<TransactionKind | undefined>();

  const txs = listTransactions(store, { search, kind: kindFilter });
  const categories = new Map(listCategories(store).map((c) => [c.id, c]));
  const accounts = new Map(listAccounts(store).map((a) => [a.id, a]));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.topRow}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search notes or category..."
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
        />
        <Button
          label="+ Add"
          onPress={() => router.push('/transaction/new')}
        />
      </View>

      <View style={styles.filterRow}>
        {(['all', 'expense', 'income', 'transfer'] as const).map((k) => {
          const active = (k === 'all' && !kindFilter) || kindFilter === k;
          return (
            <Pressable
              key={k}
              onPress={() => setKindFilter(k === 'all' ? undefined : k)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {k.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Card>
        {txs.length === 0 ? (
          <Text style={styles.empty}>No matching transactions.</Text>
        ) : (
          txs.map((tx) => {
            const cat = categories.get(tx.categoryId);
            const acc = accounts.get(tx.accountId);
            return (
              <View key={tx.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>
                    {tx.note || cat?.name || tx.kind.toUpperCase()}
                  </Text>
                  <Text style={styles.rowSub}>
                    {tx.date} · {acc?.name ?? 'Account'} · {cat?.name ?? 'Transfer'}
                  </Text>
                </View>
                <View style={styles.rightActions}>
                  <AmountText cents={tx.amount} kind={tx.kind} size={15} />
                  <Pressable
                    onPress={() => deleteTransaction(store, tx.id)}
                    style={styles.deleteBtn}
                  >
                    <Text style={styles.deleteText}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, maxWidth: 920, width: '100%', alignSelf: 'center' },
  topRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  searchInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 15,
  },
  filterRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: '#090d16' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  rowSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  rightActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  deleteBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceElevated,
  },
  deleteText: { color: colors.expense, fontSize: 11, fontWeight: '600' },
  empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg },
});
