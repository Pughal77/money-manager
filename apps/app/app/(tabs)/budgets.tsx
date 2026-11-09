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
  formatCents,
  getBudgetStatuses,
  listCategories,
  parseToCents,
  setBudget,
} from '@mm/core';
import { useVault } from '../../src/data/VaultContext';
import { Button, Card, ProgressBar } from '../../src/ui/components';
import { colors, radius, spacing } from '../../src/ui/theme';

export default function BudgetsScreen() {
  const { store } = useVault();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const expenseCategories = listCategories(store, 'expense');
  const [selectedCat, setSelectedCat] = useState(
    expenseCategories[0]?.id ?? ''
  );
  const [limitStr, setLimitStr] = useState('');

  const statuses = getBudgetStatuses(store, month);

  const handleSaveBudget = () => {
    try {
      const cents = parseToCents(limitStr);
      const catId = selectedCat || expenseCategories[0]?.id;
      if (!catId) return;
      setBudget(store, {
        categoryId: catId,
        month,
        limitAmount: cents,
      });
      setLimitStr('');
    } catch {
      // ignore invalid input
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Set Monthly Category Budget</Text>
        <Text style={styles.label}>Month (YYYY-MM)</Text>
        <TextInput
          value={month}
          onChangeText={setMonth}
          style={styles.input}
          placeholder="2026-11"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Expense Category</Text>
        <View style={styles.chipWrap}>
          {expenseCategories.map((cat) => (
            <Pressable
              key={cat.id}
              onPress={() => setSelectedCat(cat.id)}
              style={[
                styles.chip,
                selectedCat === cat.id && styles.chipActive,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedCat === cat.id && styles.chipTextActive,
                ]}
              >
                {cat.name}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Monthly Limit ($)</Text>
        <TextInput
          value={limitStr}
          onChangeText={setLimitStr}
          placeholder="400.00"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          style={styles.input}
        />

        <View style={{ marginTop: spacing.md }}>
          <Button label="Save Budget" onPress={handleSaveBudget} />
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Budgets for {month}</Text>
      <Card>
        {statuses.length === 0 ? (
          <Text style={styles.empty}>No budgets configured for {month}.</Text>
        ) : (
          statuses.map((b) => (
            <View key={b.id} style={styles.budgetRow}>
              <View style={styles.rowHeader}>
                <Text style={styles.catName}>{b.categoryName}</Text>
                <Text style={styles.amounts}>
                  {formatCents(b.spent)} spent of {formatCents(b.limitAmount)} (
                  {b.remaining >= 0
                    ? `${formatCents(b.remaining)} left`
                    : `${formatCents(Math.abs(b.remaining))} over`}
                  )
                </Text>
              </View>
              <ProgressBar progress={b.progress} color={b.categoryColor} />
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
  title: { color: colors.text, fontSize: 17, fontWeight: '700' },
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
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  budgetRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  catName: { color: colors.text, fontWeight: '700', fontSize: 15 },
  amounts: { color: colors.textSecondary, fontSize: 13 },
  empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg },
});
