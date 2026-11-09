import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  formatCents,
  getAccountBalances,
  getBudgetStatuses,
  getMonthlySummary,
  getNetWorth,
  listCategories,
  listTransactions,
} from '@mm/core';
import { useVault } from '../../src/data/VaultContext';
import { AmountText, Button, Card, ProgressBar } from '../../src/ui/components';
import { colors, spacing } from '../../src/ui/theme';

export default function DashboardScreen() {
  const { store } = useVault();
  const router = useRouter();

  const currentMonth = new Date().toISOString().slice(0, 7);
  const netWorth = getNetWorth(store);
  const summary = getMonthlySummary(store, currentMonth);
  const accounts = getAccountBalances(store);
  const budgets = getBudgetStatuses(store, currentMonth).slice(0, 3);
  const recentTxs = listTransactions(store).slice(0, 6);
  const categories = new Map(listCategories(store).map((c) => [c.id, c]));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card style={styles.heroCard}>
        <Text style={styles.heroLabel}>Total Net Worth</Text>
        <Text style={styles.heroValue}>{formatCents(netWorth)}</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCol}>
            <Text style={styles.subLabel}>Income ({currentMonth})</Text>
            <AmountText cents={summary.income} kind="income" size={17} />
          </View>
          <View style={styles.summaryCol}>
            <Text style={styles.subLabel}>Spent ({currentMonth})</Text>
            <AmountText cents={summary.expense} kind="expense" size={17} />
          </View>
        </View>
        <View style={{ marginTop: spacing.md }}>
          <Button
            label="+ Add Transaction"
            onPress={() => router.push('/transaction/new')}
          />
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Accounts</Text>
      <Card>
        {accounts.map((acc) => (
          <View key={acc.id} style={styles.row}>
            <View>
              <Text style={styles.rowTitle}>{acc.name}</Text>
              <Text style={styles.rowSub}>{acc.type.toUpperCase()}</Text>
            </View>
            <AmountText cents={acc.balance} size={16} />
          </View>
        ))}
      </Card>

      {budgets.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Monthly Budgets ({currentMonth})</Text>
          <Card>
            {budgets.map((b) => (
              <View key={b.id} style={{ marginBottom: spacing.md }}>
                <View style={styles.row}>
                  <Text style={styles.rowTitle}>{b.categoryName}</Text>
                  <Text style={styles.rowSub}>
                    {formatCents(b.spent)} / {formatCents(b.limitAmount)}
                  </Text>
                </View>
                <ProgressBar progress={b.progress} color={b.categoryColor} />
              </View>
            ))}
          </Card>
        </>
      )}

      <Text style={styles.sectionTitle}>Recent Transactions</Text>
      <Card>
        {recentTxs.length === 0 ? (
          <Text style={styles.emptyText}>No transactions recorded yet.</Text>
        ) : (
          recentTxs.map((tx) => {
            const cat = categories.get(tx.categoryId);
            return (
              <View key={tx.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>
                    {tx.note || cat?.name || tx.kind.toUpperCase()}
                  </Text>
                  <Text style={styles.rowSub}>
                    {tx.date} · {cat?.name ?? 'Transfer'}
                  </Text>
                </View>
                <AmountText cents={tx.amount} kind={tx.kind} size={15} />
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
  heroCard: { backgroundColor: '#131c31', borderColor: '#1e293b' },
  heroLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  heroValue: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '800',
    marginVertical: spacing.xs,
    fontVariant: ['tabular-nums'],
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  summaryCol: { flex: 1 },
  subLabel: { color: colors.textMuted, fontSize: 12, marginBottom: 2 },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  rowSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  emptyText: { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.md },
});
