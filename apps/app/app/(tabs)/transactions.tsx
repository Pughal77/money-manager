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
  listCategories,
  listTransactions,
  type TransactionKind,
} from '@mm/core';
import { useVault } from '../../src/data/VaultContext';
import { FloatingAddButton } from '../../src/ui/components';
import { AppIcon } from '../../src/ui/icons';
import {
  groupTransactionsByDay,
  TransactionDayCard,
} from '../../src/ui/TransactionDayGroup';
import { radius, spacing, useTheme } from '../../src/ui/theme';

export default function TransactionsScreen() {
  const { store } = useVault();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<TransactionKind | undefined>();

  const txs = listTransactions(store, { search, kind: kindFilter });
  const dayGroups = groupTransactionsByDay(txs);
  const categoryMap = new Map(listCategories(store).map((c) => [c.id, c]));

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.backBtn}
        >
          <AppIcon name="chevron-left" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.text }]}>
          All Transactions
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search notes, category, or subcategory..."
          placeholderTextColor={colors.textMuted}
          style={[
            styles.searchInput,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: isDark ? 0 : 1,
              color: colors.text,
            },
          ]}
        />

        <View style={styles.filterRow}>
          {(['all', 'expense', 'income'] as const).map((k) => {
            const active = (k === 'all' && !kindFilter) || kindFilter === k;
            return (
              <Pressable
                key={k}
                onPress={() => setKindFilter(k === 'all' ? undefined : k)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {k === 'all' ? 'All' : k === 'expense' ? 'Expense' : 'Income'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {dayGroups.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: isDark ? 0 : 1,
              },
            ]}
          >
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>
              There is no history.
            </Text>
          </View>
        ) : (
          dayGroups.map((group) => (
            <TransactionDayCard
              key={group.date}
              group={group}
              categoryMap={categoryMap}
              onSelectTransaction={(tx) =>
                router.push(`/transaction/new?id=${encodeURIComponent(tx.id)}`)
              }
            />
          ))
        )}
      </ScrollView>

      <FloatingAddButton onPress={() => router.push('/transaction/new')} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, alignItems: 'flex-start' },
  topTitle: { fontSize: 18, fontWeight: '600' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 96 },
  searchInput: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  filterRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  emptyCard: {
    borderRadius: radius.lg,
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
