import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  formatCents,
  getCategoryBreakdown,
  getMonthlySummary,
} from '@mm/core';
import { useVault } from '../../src/data/VaultContext';
import { AmountText, Card, ProgressBar } from '../../src/ui/components';
import { colors, radius, spacing } from '../../src/ui/theme';

export default function ReportsScreen() {
  const { store } = useVault();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const summary = getMonthlySummary(store, month);
  const breakdown = getCategoryBreakdown(store, month);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.label}>Report Month (YYYY-MM)</Text>
        <TextInput
          value={month}
          onChangeText={setMonth}
          style={styles.input}
          placeholder="2026-11"
          placeholderTextColor={colors.textMuted}
        />

        <View style={styles.metricsRow}>
          <View style={styles.metricBox}>
            <Text style={styles.metricTitle}>Income</Text>
            <AmountText cents={summary.income} kind="income" size={18} />
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricTitle}>Expenses</Text>
            <AmountText cents={summary.expense} kind="expense" size={18} />
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricTitle}>Net</Text>
            <AmountText
              cents={summary.net}
              kind={summary.net >= 0 ? 'income' : 'expense'}
              size={18}
            />
          </View>
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Spending by Category ({month})</Text>
      <Card>
        {breakdown.length === 0 ? (
          <Text style={styles.empty}>No expenses in {month}.</Text>
        ) : (
          breakdown.map((item) => (
            <View key={item.categoryId} style={styles.catRow}>
              <View style={styles.catHeader}>
                <Text style={styles.catName}>
                  {item.categoryName} ({item.percentage}%)
                </Text>
                <Text style={styles.catAmount}>{formatCents(item.amount)}</Text>
              </View>
              <ProgressBar
                progress={item.percentage / 100}
                color={item.color}
              />
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, maxWidth: 920, width: '100%', alignSelf: 'center' },
  label: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: 15,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  metricBox: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  metricTitle: { color: colors.textMuted, fontSize: 12, marginBottom: 4 },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  catRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  catName: { color: colors.text, fontWeight: '600', fontSize: 14 },
  catAmount: { color: colors.textSecondary, fontWeight: '700', fontSize: 14 },
  empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg },
});
