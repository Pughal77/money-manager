import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  formatAmountPlain,
  formatAmountWithPercent,
  getCategoryBreakdownByRange,
  getMonthDateRange,
  getPeriodSummary,
  getWeekDateRange,
  shiftDateByDays,
  shiftYearMonth,
  type CategoryKind,
  type DonutSliceInput,
} from '@mm/core';
import { useVault } from '../../src/data/VaultContext';
import { DonutChart } from '../../src/ui/DonutChart';
import { AppIcon, CategoryBadge } from '../../src/ui/icons';
import { PeriodHeader } from '../../src/ui/PeriodHeader';
import { radius, useTheme } from '../../src/ui/theme';
import { useResponsive } from '../../src/ui/useResponsive';

export default function StatisticScreen() {
  const { store, selectedMonth, setSelectedMonth } = useVault();
  const { colors, isDark } = useTheme();
  const { isDesktop } = useResponsive();
  const router = useRouter();

  const todayStr = new Date().toISOString().slice(0, 10);
  const [periodMode, setPeriodMode] = useState<'monthly' | 'weekly'>('monthly');
  const [weekAnchorDate, setWeekAnchorDate] = useState(() => todayStr);
  const [chartKind, setChartKind] = useState<CategoryKind>('expense');

  const range =
    periodMode === 'monthly'
      ? getMonthDateRange(selectedMonth)
      : getWeekDateRange(weekAnchorDate);

  const summary = getPeriodSummary(store, range.startDate, range.endDate);
  const incomeBreakdown = getCategoryBreakdownByRange(
    store,
    range.startDate,
    range.endDate,
    'income'
  );
  const expenseBreakdown = getCategoryBreakdownByRange(
    store,
    range.startDate,
    range.endDate,
    'expense'
  );

  const activeChartItems =
    chartKind === 'expense' && expenseBreakdown.length > 0
      ? expenseBreakdown
      : chartKind === 'income' && incomeBreakdown.length > 0
        ? incomeBreakdown
        : expenseBreakdown.length > 0
          ? expenseBreakdown
          : incomeBreakdown;

  const activeCenterLabel =
    activeChartItems === incomeBreakdown && incomeBreakdown.length > 0
      ? 'Income'
      : 'Expense';

  const donutData: DonutSliceInput[] = activeChartItems.map((item) => ({
    id: item.categoryId,
    label: item.categoryName,
    value: item.amount,
    color: item.color,
  }));

  const handlePrev = () => {
    if (periodMode === 'monthly') {
      setSelectedMonth((m) => shiftYearMonth(m, -1));
    } else {
      setWeekAnchorDate((d) => shiftDateByDays(d, -7));
    }
  };

  const handleNext = () => {
    if (periodMode === 'monthly') {
      setSelectedMonth((m) => shiftYearMonth(m, 1));
    } else {
      setWeekAnchorDate((d) => shiftDateByDays(d, 7));
    }
  };

  const handleOpenCategory = (categoryId: string) => {
    const query = `start=${encodeURIComponent(range.startDate)}&end=${encodeURIComponent(range.endDate)}&label=${encodeURIComponent(range.monthLabel)}&range=${encodeURIComponent(range.rangeLabel)}&month=${encodeURIComponent(selectedMonth)}&mode=${periodMode}`;
    router.push(`/category/${encodeURIComponent(categoryId)}?${query}`);
  };

  const handleOpenBreakdown = (kindTarget: CategoryKind) => {
    router.push(
      `/breakdown?month=${encodeURIComponent(selectedMonth)}&kind=${kindTarget}&mode=${periodMode}&anchor=${encodeURIComponent(weekAnchorDate)}`
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      {/* Top Header */}
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <View style={styles.topSpacer} />
        <Text style={[styles.topTitle, { color: colors.text }]}>Statistic</Text>
        <Pressable
          onPress={() =>
            setPeriodMode((m) => (m === 'monthly' ? 'weekly' : 'monthly'))
          }
          hitSlop={10}
          style={({ pressed }) => [
            styles.periodToggleBtn,
            { opacity: pressed ? 0.65 : 1 },
          ]}
        >
          <Text style={[styles.periodToggleText, { color: colors.text }]}>
            {periodMode === 'monthly' ? 'Monthly' : 'Weekly'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          isDesktop && styles.desktopContent,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={isDesktop ? styles.desktopLayout : styles.mobileLayout}>
          <View style={isDesktop ? styles.desktopColLeft : styles.mobileCol}>
            {/* Period Header */}
            <PeriodHeader
          monthLabel={range.monthLabel}
          rangeLabel={range.rangeLabel}
          onPrev={handlePrev}
          onNext={handleNext}
        />

        {/* Balance Summary Card (Tapping opens Decomposition Page) */}
        <Pressable
          onPress={() => handleOpenBreakdown(chartKind)}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: isDark ? 0 : 1,
              opacity: pressed ? 0.88 : 1,
            },
          ]}
        >
          <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>
              {range.monthLabel}'s balance
            </Text>
            <View style={styles.headerAction}>
              <Text style={[styles.headerActionText, { color: colors.textMuted }]}>
                Decomposition
              </Text>
              <AppIcon name="chevron-right" size={15} color={colors.textMuted} />
            </View>
          </View>

          <View style={styles.balanceBody}>
            <Pressable
              onPress={() => handleOpenBreakdown('income')}
              style={styles.statRow}
            >
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                Income
              </Text>
              <Text style={[styles.statAmount, { color: colors.income }]}>
                {formatAmountPlain(summary.income)}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleOpenBreakdown('expense')}
              style={styles.statRow}
            >
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                Expense
              </Text>
              <Text style={[styles.statAmount, { color: colors.expense }]}>
                {formatAmountPlain(summary.expense)}
              </Text>
            </Pressable>

            <View
              style={[
                styles.divider,
                { backgroundColor: colors.border },
              ]}
            />

            <View style={styles.balanceRow}>
              <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>
                Balance
              </Text>
              <Text style={[styles.balanceValue, { color: colors.text }]}>
                {formatAmountPlain(summary.net)}
              </Text>
            </View>
          </View>
        </Pressable>

        {/* Report Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: isDark ? 0 : 1,
            },
          ]}
        >
          <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>
              {range.monthLabel}'s report
            </Text>
            <Pressable
              onPress={() =>
                setChartKind((k) => (k === 'expense' ? 'income' : 'expense'))
              }
              hitSlop={8}
            >
              <Text style={{ color: colors.primary, fontSize: 12.5, fontWeight: '600' }}>
                Switch to {chartKind === 'expense' ? 'Income' : 'Expense'}
              </Text>
            </Pressable>
          </View>

          {/* Donut Chart (Tap center to toggle Expense/Income, tap slice to open category) */}
          <View style={styles.chartContainer}>
            <DonutChart
              data={donutData}
              size={208}
              centerLabel={activeCenterLabel}
              centerSubLabel="Tap to switch"
              maxLabelChars={11}
              onCenterPress={() =>
                setChartKind((k) => (k === 'expense' ? 'income' : 'expense'))
              }
              onSlicePress={(categoryId) => handleOpenCategory(categoryId)}
            />
          </View>
        </View>
      </View>

      <View style={isDesktop ? styles.desktopColRight : styles.mobileCol}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: isDark ? 0 : 1,
            },
          ]}
        >
          {/* Total of Income Section */}
          <View style={styles.reportSection}>
            <Pressable
              onPress={() => handleOpenBreakdown('income')}
              style={({ pressed }) => [
                styles.sectionTotalRow,
                {
                  borderBottomColor: colors.border,
                  opacity: pressed ? 0.72 : 1,
                },
              ]}
            >
              <Text style={[styles.sectionTotalTitle, { color: colors.text }]}>
                Total of income
              </Text>
              <View style={styles.sectionTotalRight}>
                <Text style={[styles.sectionTotalAmount, { color: colors.text }]}>
                  {formatAmountPlain(summary.income)}
                </Text>
                <AppIcon name="chevron-right" size={16} color={colors.textMuted} />
              </View>
            </Pressable>

            {incomeBreakdown.map((item) => (
              <Pressable
                key={item.categoryId}
                onPress={() => handleOpenCategory(item.categoryId)}
                style={({ pressed }) => [
                  styles.categoryRow,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <View style={styles.categoryLeft}>
                  <CategoryBadge icon={item.icon} color={item.color} size={36} />
                  <Text
                    style={[styles.categoryName, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {item.categoryName}
                  </Text>
                </View>
                <Text
                  style={[styles.categoryAmount, { color: colors.textSecondary }]}
                >
                  {formatAmountWithPercent(item.amount, item.percentage)}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Total of Expense Section */}
          <View style={[styles.reportSection, { marginTop: 18 }]}>
            <Pressable
              onPress={() => handleOpenBreakdown('expense')}
              style={({ pressed }) => [
                styles.sectionTotalRow,
                {
                  borderBottomColor: colors.border,
                  opacity: pressed ? 0.72 : 1,
                },
              ]}
            >
              <Text style={[styles.sectionTotalTitle, { color: colors.text }]}>
                Total of expense
              </Text>
              <View style={styles.sectionTotalRight}>
                <Text style={[styles.sectionTotalAmount, { color: colors.text }]}>
                  {formatAmountPlain(summary.expense)}
                </Text>
                <AppIcon name="chevron-right" size={16} color={colors.textMuted} />
              </View>
            </Pressable>

            {expenseBreakdown.map((item) => (
              <Pressable
                key={item.categoryId}
                onPress={() => handleOpenCategory(item.categoryId)}
                style={({ pressed }) => [
                  styles.categoryRow,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <View style={styles.categoryLeft}>
                  <CategoryBadge icon={item.icon} color={item.color} size={36} />
                  <Text
                    style={[styles.categoryName, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {item.categoryName}
                  </Text>
                </View>
                <Text
                  style={[styles.categoryAmount, { color: colors.textSecondary }]}
                >
                  {formatAmountWithPercent(item.amount, item.percentage)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </View>
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
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topSpacer: {
    width: 68,
  },
  topTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  periodToggleBtn: {
    width: 68,
    alignItems: 'flex-end',
  },
  periodToggleText: {
    fontSize: 15,
    fontWeight: '500',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 48,
  },
  card: {
    borderRadius: radius.lg,
    marginTop: 4,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  headerActionText: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  balanceBody: {
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  statAmount: {
    fontSize: 15,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  balanceLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  balanceValue: {
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  reportSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  sectionTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 6,
  },
  sectionTotalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionTotalRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTotalAmount: {
    fontSize: 18,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 9,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexShrink: 1,
    gap: 12,
  },
  categoryName: {
    flex: 1,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  categoryAmount: {
    flexShrink: 0,
    fontSize: 14.5,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  desktopContent: {
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 40,
  },
  desktopLayout: {
    flexDirection: 'row',
    gap: 28,
    alignItems: 'flex-start',
  },
  desktopColLeft: {
    width: 440,
    flexShrink: 0,
    gap: 16,
  },
  desktopColRight: {
    flex: 1,
    minWidth: 0,
    gap: 16,
  },
  mobileLayout: {
    flexDirection: 'column',
  },
  mobileCol: {
    width: '100%',
  },
});
