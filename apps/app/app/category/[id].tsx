import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  formatAmountPlain,
  getCategoryById,
  getMonthDateRange,
  getSubcategoryBreakdown,
  listCategories,
  listTransactions,
  type DonutSliceInput,
} from '@mm/core';
import { useVault } from '../../src/data/VaultContext';
import { DonutChart } from '../../src/ui/DonutChart';
import { AppIcon } from '../../src/ui/icons';
import { PeriodHeader } from '../../src/ui/PeriodHeader';
import {
  groupTransactionsByDay,
  TransactionDayCard,
} from '../../src/ui/TransactionDayGroup';
import { radius, useTheme } from '../../src/ui/theme';

export default function CategoryDrillDownScreen() {
  const { store } = useVault();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    start?: string;
    end?: string;
    label?: string;
    range?: string;
    sub?: string;
  }>();

  const categoryId = String(params.id ?? '');
  const category = getCategoryById(store, categoryId);

  const defaultMonth = new Date().toISOString().slice(0, 7);
  const fallbackRange = getMonthDateRange(defaultMonth);
  const startDate = params.start ? String(params.start) : fallbackRange.startDate;
  const endDate = params.end ? String(params.end) : fallbackRange.endDate;
  const monthLabel = params.label ? String(params.label) : fallbackRange.monthLabel;
  const rangeLabel = params.range ? String(params.range) : fallbackRange.rangeLabel;

  const hasMultipleSubs = (category?.subcategories.length ?? 0) > 1;
  const [selectedSub, setSelectedSub] = useState<string | null>(() => {
    if (params.sub) return String(params.sub);
    if (!hasMultipleSubs) {
      return category?.subcategories[0] ?? null;
    }
    return null;
  });
  const [showAllCategoryTxs, setShowAllCategoryTxs] = useState<boolean>(
    () => !hasMultipleSubs && !params.sub
  );

  const subBreakdown = getSubcategoryBreakdown(
    store,
    categoryId,
    startDate,
    endDate
  );
  const categoryTotal = subBreakdown.reduce((sum, item) => sum + item.amount, 0);

  const isTransactionsStage = selectedSub !== null || showAllCategoryTxs;

  // Stage 1: Category -> Subcategories Donut & List (e.g. "Food")
  if (!isTransactionsStage && category) {
    const donutData: DonutSliceInput[] = subBreakdown
      .filter((s) => s.amount > 0)
      .map((s) => ({
        id: s.subcategory,
        label: s.subcategory,
        value: s.amount,
        color: s.color,
      }));

    return (
      <View style={[styles.screen, { backgroundColor: colors.bg }]}>
        {/* Top Bar */}
        <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <AppIcon name="chevron-left" size={22} color={colors.text} />
          </Pressable>
          <Text style={[styles.topTitle, { color: colors.text }]}>
            {category.name}
          </Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <PeriodHeader monthLabel={monthLabel} rangeLabel={rangeLabel} />

          {/* Subcategory Donut Chart */}
          <View style={styles.donutWrap}>
            <DonutChart data={donutData} size={236} maxLabelChars={13} />
          </View>

          {/* Total of Category Header Row */}
          <Pressable
            onPress={() => setShowAllCategoryTxs(true)}
            style={[
              styles.totalHeaderRow,
              { borderBottomColor: colors.border },
            ]}
          >
            <Text style={[styles.totalHeaderTitle, { color: colors.text }]}>
              Total of {category.name}
            </Text>
            <Text style={[styles.totalHeaderAmount, { color: colors.text }]}>
              {formatAmountPlain(categoryTotal)}
            </Text>
          </Pressable>

          {/* Subcategory Rows */}
          {subBreakdown.map((item) => (
            <Pressable
              key={item.subcategory}
              onPress={() => setSelectedSub(item.subcategory)}
              style={({ pressed }) => [
                styles.subRow,
                {
                  borderBottomColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text style={[styles.subName, { color: colors.textSecondary }]}>
                {item.subcategory}
              </Text>
              <Text style={[styles.subAmount, { color: colors.textSecondary }]}>
                {formatAmountPlain(item.amount)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  // Stage 2: Filtered Transactions List (e.g. "Food > Eating out")
  const filteredTxs = listTransactions(store, {
    categoryId,
    subcategory: selectedSub ?? undefined,
    startDate,
    endDate,
  });
  const filteredTotal = filteredTxs.reduce((sum, tx) => sum + tx.amount, 0);
  const dayGroups = groupTransactionsByDay(filteredTxs);
  const categoryMap = new Map(listCategories(store).map((c) => [c.id, c]));

  const headerTitle = category
    ? selectedSub
      ? `${category.name} > ${selectedSub}`
      : category.name
    : 'Transactions';

  const handleBackFromStage2 = () => {
    if (hasMultipleSubs && !params.sub) {
      setSelectedSub(null);
      setShowAllCategoryTxs(false);
    } else {
      router.back();
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      {/* Top Bar */}
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={handleBackFromStage2}
          hitSlop={10}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <AppIcon name="chevron-left" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.text }]} numberOfLines={1}>
          {headerTitle}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <PeriodHeader monthLabel={monthLabel} rangeLabel={rangeLabel} />

        {/* Period Balance Card */}
        <View
          style={[
            styles.balanceCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: isDark ? 0 : 1,
            },
          ]}
        >
          <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>
              {monthLabel}'s balance
            </Text>
          </View>
          <View style={styles.balanceBody}>
            <Text style={[styles.balanceAmount, { color: colors.text }]}>
              {formatAmountPlain(filteredTotal)}
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionHeading, { color: colors.text }]}>
          {monthLabel}'s transactions
        </Text>

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
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  topTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 48,
  },
  donutWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
  },
  totalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  totalHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  totalHeaderAmount: {
    fontSize: 18,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  subName: {
    fontSize: 15,
    fontWeight: '500',
  },
  subAmount: {
    fontSize: 15,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  balanceCard: {
    borderRadius: radius.lg,
    marginTop: 4,
    marginBottom: 22,
    overflow: 'hidden',
  },
  cardHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  balanceBody: {
    paddingHorizontal: 18,
    paddingVertical: 22,
    alignItems: 'flex-end',
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  emptyCard: {
    borderRadius: radius.lg,
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
