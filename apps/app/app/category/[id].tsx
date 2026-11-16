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
  formatAmountWithPercent,
  getCategoryById,
  getMonthDateRange,
  getSubcategoryBreakdown,
  listAccounts,
  listCategories,
  listTransactions,
  shiftYearMonth,
  type DonutSliceInput,
} from '@mm/core';
import { useVault } from '../../src/data/VaultContext';
import { FloatingAddButton } from '../../src/ui/components';
import { DonutChart } from '../../src/ui/DonutChart';
import { AppIcon } from '../../src/ui/icons';
import { PeriodHeader } from '../../src/ui/PeriodHeader';
import {
  groupTransactionsByDay,
  TransactionDayCard,
} from '../../src/ui/TransactionDayGroup';
import { radius, useTheme } from '../../src/ui/theme';

export default function CategoryDrillDownScreen() {
  const { store, selectedMonth, setSelectedMonth } = useVault();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    start?: string;
    end?: string;
    label?: string;
    range?: string;
    month?: string;
    mode?: string;
    sub?: string;
  }>();

  const categoryId = String(params.id ?? '');
  const category = getCategoryById(store, categoryId);

  const isWeekly = params.mode === 'weekly';
  const [monthCursor, setMonthCursor] = useState<string>(() => {
    if (params.month && /^\d{4}-\d{2}$/.test(String(params.month))) {
      return String(params.month);
    }
    if (params.start && /^\d{4}-\d{2}/.test(String(params.start))) {
      return String(params.start).slice(0, 7);
    }
    return selectedMonth;
  });

  const activeRange = isWeekly
    ? {
        startDate: String(params.start ?? getMonthDateRange(monthCursor).startDate),
        endDate: String(params.end ?? getMonthDateRange(monthCursor).endDate),
        monthLabel: String(params.label ?? getMonthDateRange(monthCursor).monthLabel),
        rangeLabel: String(params.range ?? getMonthDateRange(monthCursor).rangeLabel),
      }
    : getMonthDateRange(monthCursor);

  const startDate = activeRange.startDate;
  const endDate = activeRange.endDate;
  const monthLabel = activeRange.monthLabel;
  const rangeLabel = activeRange.rangeLabel;

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

  const handleStepMonth = (delta: number) => {
    const next = shiftYearMonth(monthCursor, delta);
    setMonthCursor(next);
    setSelectedMonth(next);
  };

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
          <PeriodHeader
            monthLabel={monthLabel}
            rangeLabel={rangeLabel}
            onPrev={isWeekly ? undefined : () => handleStepMonth(-1)}
            onNext={isWeekly ? undefined : () => handleStepMonth(1)}
          />

          {/* Subcategory Donut Chart (Tap slice to drill into subcategory transactions) */}
          <View style={styles.donutWrap}>
            <DonutChart
              data={donutData}
              size={236}
              centerLabel={category.name}
              centerSubLabel={formatAmountPlain(categoryTotal)}
              maxLabelChars={13}
              onSlicePress={(subName) => setSelectedSub(subName)}
              onCenterPress={() => setShowAllCategoryTxs(true)}
            />
          </View>

          {/* Total of Category Header Row */}
          <Pressable
            onPress={() => setShowAllCategoryTxs(true)}
            style={({ pressed }) => [
              styles.totalHeaderRow,
              {
                borderBottomColor: colors.border,
                opacity: pressed ? 0.72 : 1,
              },
            ]}
          >
            <Text style={[styles.totalHeaderTitle, { color: colors.text }]}>
              Total of {category.name}
            </Text>
            <View style={styles.rowRight}>
              <Text style={[styles.totalHeaderAmount, { color: colors.text }]}>
                {formatAmountPlain(categoryTotal)}
              </Text>
              <AppIcon name="chevron-right" size={16} color={colors.textMuted} />
            </View>
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
              <View style={styles.rowRight}>
                <Text style={[styles.subAmount, { color: colors.textSecondary }]}>
                  {item.amount > 0
                    ? formatAmountWithPercent(item.amount, item.percentage)
                    : '0'}
                </Text>
                <AppIcon
                  name="chevron-right"
                  size={15}
                  color={colors.textMuted}
                />
              </View>
            </Pressable>
          ))}
        </ScrollView>

        <FloatingAddButton
          onPress={() =>
            router.push(
              `/transaction/new?categoryId=${encodeURIComponent(categoryId)}&kind=${category.kind}`
            )
          }
        />
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
  const filteredPercent =
    categoryTotal > 0 ? Math.round((filteredTotal / categoryTotal) * 1000) / 10 : 0;
  const dayGroups = groupTransactionsByDay(filteredTxs);
  const categoryMap = new Map(listCategories(store).map((c) => [c.id, c]));
  const accountMap = new Map(listAccounts(store).map((a) => [a.id, a]));

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
        <PeriodHeader
          monthLabel={monthLabel}
          rangeLabel={rangeLabel}
          onPrev={isWeekly ? undefined : () => handleStepMonth(-1)}
          onNext={isWeekly ? undefined : () => handleStepMonth(1)}
        />

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
              {filteredTotal > 0 && selectedSub && hasMultipleSubs
                ? formatAmountWithPercent(filteredTotal, filteredPercent)
                : formatAmountPlain(filteredTotal)}
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
              accountMap={accountMap}
              onSelectTransaction={(tx) =>
                router.push(`/transaction/new?id=${encodeURIComponent(tx.id)}`)
              }
            />
          ))
        )}
      </ScrollView>

      <FloatingAddButton
        onPress={() =>
          router.push(
            `/transaction/new?categoryId=${encodeURIComponent(categoryId)}&subcategory=${encodeURIComponent(selectedSub ?? '')}&kind=${category?.kind ?? 'expense'}`
          )
        }
      />
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
    paddingBottom: 96,
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
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
