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
  deleteBudget,
  formatAmountPlain,
  getBudgetStatuses,
  listCategories,
  parseToCents,
  setBudget,
} from '@mm/core';
import { useVault } from '../../src/data/VaultContext';
import { Button, Card, ProgressBar } from '../../src/ui/components';
import { AppIcon } from '../../src/ui/icons';
import { radius, spacing, useTheme } from '../../src/ui/theme';

export default function BudgetsScreen() {
  const { store } = useVault();
  const { colors } = useTheme();
  const router = useRouter();
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
          Monthly Budgets
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Text style={[styles.title, { color: colors.text }]}>
            Set Monthly Category Budget
          </Text>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Month (YYYY-MM)
          </Text>
          <TextInput
            value={month}
            onChangeText={setMonth}
            style={[
              styles.input,
              { backgroundColor: colors.surfaceElevated, color: colors.text },
            ]}
            placeholder="2026-11"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Expense Category
          </Text>
          <View style={styles.chipWrap}>
            {expenseCategories.map((cat) => {
              const active = selectedCat === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setSelectedCat(cat.id)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active
                        ? colors.primary
                        : colors.surfaceElevated,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: active ? '#FFFFFF' : colors.textSecondary,
                      fontSize: 13,
                      fontWeight: '600',
                    }}
                  >
                    {cat.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Monthly Limit
          </Text>
          <TextInput
            value={limitStr}
            onChangeText={setLimitStr}
            placeholder="400"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            style={[
              styles.input,
              { backgroundColor: colors.surfaceElevated, color: colors.text },
            ]}
          />

          <View style={{ marginTop: spacing.md }}>
            <Button label="Save Budget" onPress={handleSaveBudget} />
          </View>
        </Card>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Budgets for {month}
        </Text>
        <Card>
          {statuses.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textMuted }]}>
              No budgets configured for {month}.
            </Text>
          ) : (
            statuses.map((b) => (
              <View
                key={b.id}
                style={[styles.budgetRow, { borderBottomColor: colors.border }]}
              >
                <View style={styles.rowHeader}>
                  <Text style={[styles.catName, { color: colors.text }]}>
                    {b.categoryName}
                  </Text>
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                  >
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                      {formatAmountPlain(b.spent)} / {formatAmountPlain(b.limitAmount)}
                    </Text>
                    <Pressable
                      onPress={() => deleteBudget(store, b.id)}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: radius.sm,
                        backgroundColor: colors.surfaceElevated,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.expense,
                          fontSize: 11,
                          fontWeight: '600',
                        }}
                      >
                        Delete
                      </Text>
                    </Pressable>
                  </View>
                </View>
                <ProgressBar progress={b.progress} color={b.categoryColor} />
              </View>
            ))
          )}
        </Card>
      </ScrollView>
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
  content: { padding: spacing.lg, paddingBottom: 48 },
  title: { fontSize: 16, fontWeight: '700' },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  input: {
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 14,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  budgetRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  catName: { fontWeight: '600', fontSize: 15 },
  empty: { textAlign: 'center', paddingVertical: spacing.lg },
});
