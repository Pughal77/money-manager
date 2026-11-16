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
  getCategoryBreakdownByRange,
  getMonthDateRange,
  getPeriodSummary,
  getWeekDateRange,
  shiftDateByDays,
  shiftYearMonth,
  type CategoryKind,
  type DonutSliceInput,
} from '@mm/core';
import { useVault } from '../src/data/VaultContext';
import { FloatingAddButton } from '../src/ui/components';
import { DonutChart } from '../src/ui/DonutChart';
import { AppIcon, CategoryBadge } from '../src/ui/icons';
import { PeriodHeader } from '../src/ui/PeriodHeader';
import { radius, useTheme } from '../src/ui/theme';

export default function BreakdownScreen() {
  const { store, selectedMonth, setSelectedMonth } = useVault();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    month?: string;
    kind?: string;
    mode?: string;
    anchor?: string;
    focus?: string;
  }>();

  const [periodMode, setPeriodMode] = useState<'monthly' | 'weekly'>(() =>
    params.mode === 'weekly' ? 'weekly' : 'monthly'
  );
  const [monthCursor, setMonthCursor] = useState<string>(() =>
    params.month && /^\d{4}-\d{2}$/.test(String(params.month))
      ? String(params.month)
      : selectedMonth
  );
  const [weekAnchor, setWeekAnchor] = useState<string>(() =>
    params.anchor && /^\d{4}-\d{2}-\d{2}$/.test(String(params.anchor))
      ? String(params.anchor)
      : new Date().toISOString().slice(0, 10)
  );
  const [kind, setKind] = useState<CategoryKind>(() =>
    params.kind === 'income' ? 'income' : 'expense'
  );
  const [selectedSliceId, setSelectedSliceId] = useState<string | null>(() =>
    params.focus ? String(params.focus) : null
  );

  const range =
    periodMode === 'monthly'
      ? getMonthDateRange(monthCursor)
      : getWeekDateRange(weekAnchor);

  const summary = getPeriodSummary(store, range.startDate, range.endDate);
  const items = getCategoryBreakdownByRange(
    store,
    range.startDate,
    range.endDate,
    kind
  );
  const totalForKind = kind === 'expense' ? summary.expense : summary.income;

  const donutData: DonutSliceInput[] = items.map((item) => ({
    id: item.categoryId,
    label: item.categoryName,
    value: item.amount,
    color: item.color,
  }));

  const handlePrev = () => {
    setSelectedSliceId(null);
    if (periodMode === 'monthly') {
      const next = shiftYearMonth(monthCursor, -1);
      setMonthCursor(next);
      setSelectedMonth(next);
    } else {
      setWeekAnchor((d) => shiftDateByDays(d, -7));
    }
  };

  const handleNext = () => {
    setSelectedSliceId(null);
    if (periodMode === 'monthly') {
      const next = shiftYearMonth(monthCursor, 1);
      setMonthCursor(next);
      setSelectedMonth(next);
    } else {
      setWeekAnchor((d) => shiftDateByDays(d, 7));
    }
  };

  const handleOpenCategory = (categoryId: string) => {
    const query = `start=${encodeURIComponent(range.startDate)}&end=${encodeURIComponent(range.endDate)}&label=${encodeURIComponent(range.monthLabel)}&range=${encodeURIComponent(range.rangeLabel)}&month=${encodeURIComponent(monthCursor)}&mode=${periodMode}`;
    router.push(`/category/${encodeURIComponent(categoryId)}?${query}`);
  };

  const handleSlicePress = (sliceId: string) => {
    if (selectedSliceId === sliceId) {
      handleOpenCategory(sliceId);
    } else {
      setSelectedSliceId(sliceId);
    }
  };

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
          {kind === 'expense' ? 'Expense Breakdown' : 'Income Breakdown'}
        </Text>

        <Pressable
          onPress={() =>
            setPeriodMode((m) => (m === 'monthly' ? 'weekly' : 'monthly'))
          }
          hitSlop={10}
          style={styles.periodToggleBtn}
        >
          <Text style={[styles.periodToggleText, { color: colors.textSecondary }]}>
            {periodMode === 'monthly' ? 'Monthly' : 'Weekly'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Period Selector */}
        <PeriodHeader
          monthLabel={range.monthLabel}
          rangeLabel={range.rangeLabel}
          onPrev={handlePrev}
          onNext={handleNext}
        />

        {/* Expense | Income Segmented Switcher */}
        <View
          style={[
            styles.segmentTrack,
            { backgroundColor: isDark ? '#262629' : '#E5E7EB' },
          ]}
        >
          {(['expense', 'income'] as const).map((k) => {
            const active = kind === k;
            return (
              <Pressable
                key={k}
                onPress={() => {
                  setKind(k);
                  setSelectedSliceId(null);
                }}
                style={[
                  styles.segmentBtn,
                  active && { backgroundColor: colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.segmentLabel,
                    {
                      color: active
                        ? '#FFFFFF'
                        : isDark
                          ? '#AEAEB2'
                          : '#4B5563',
                    },
                  ]}
                >
                  {k === 'expense'
                    ? `Expense (${formatAmountPlain(summary.expense)})`
                    : `Income (${formatAmountPlain(summary.income)})`}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Decomposition Card */}
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
              {range.monthLabel}'s {kind === 'expense' ? 'expense' : 'income'} decomposition
            </Text>
            {selectedSliceId ? (
              <Pressable
                onPress={() => setSelectedSliceId(null)}
                hitSlop={8}
              >
                <Text style={{ color: colors.primary, fontSize: 12.5, fontWeight: '600' }}>
                  Reset selection
                </Text>
              </Pressable>
            ) : null}
          </View>

          {/* Interactive Donut Chart */}
          <View style={styles.chartWrap}>
            <DonutChart
              data={donutData}
              size={224}
              centerLabel={kind === 'expense' ? 'Expense' : 'Income'}
              maxLabelChars={11}
              selectedSliceId={selectedSliceId}
              onSlicePress={handleSlicePress}
              onCenterPress={() => {
                setKind((prev) => (prev === 'expense' ? 'income' : 'expense'));
                setSelectedSliceId(null);
              }}
            />
            {items.length > 0 ? (
              <Text style={[styles.chartHint, { color: colors.textMuted }]}>
                Tap a slice to highlight (tap again to drill in), or tap center to switch
              </Text>
            ) : null}
          </View>

          {/* Total Header Row */}
          <View style={styles.listSection}>
            <View
              style={[
                styles.totalRow,
                { borderBottomColor: colors.border },
              ]}
            >
              <Text style={[styles.totalTitle, { color: colors.text }]}>
                {kind === 'expense' ? 'Total of expense' : 'Total of income'}
              </Text>
              <Text
                style={[
                  styles.totalAmount,
                  { color: kind === 'expense' ? colors.expense : colors.income },
                ]}
              >
                {formatAmountWithPercent(totalForKind, items.length > 0 ? 100 : 0)}
              </Text>
            </View>

            {items.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No {kind} transactions in this period.
                </Text>
              </View>
            ) : (
              items.map((item) => {
                const isHighlighted = selectedSliceId === item.categoryId;
                return (
                  <Pressable
                    key={item.categoryId}
                    onPress={() => handleOpenCategory(item.categoryId)}
                    style={({ pressed }) => [
                      styles.categoryRow,
                      {
                        borderBottomColor: colors.border,
                        backgroundColor: isHighlighted
                          ? isDark
                            ? 'rgba(243,168,51,0.12)'
                            : 'rgba(243,168,51,0.08)'
                          : 'transparent',
                        opacity: pressed ? 0.72 : 1,
                      },
                    ]}
                  >
                    <View style={styles.rowTop}>
                      <View style={styles.categoryLeft}>
                        <CategoryBadge
                          icon={item.icon}
                          color={item.color}
                          size={38}
                        />
                        <View style={styles.categoryMeta}>
                          <Text
                            style={[styles.categoryName, { color: colors.text }]}
                            numberOfLines={1}
                          >
                            {item.categoryName}
                          </Text>
                          <Text style={[styles.txCountText, { color: colors.textMuted }]}>
                            {item.transactionCount}{' '}
                            {item.transactionCount === 1 ? 'transaction' : 'transactions'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.categoryRight}>
                        <Text
                          style={[
                            styles.categoryAmount,
                            { color: colors.text },
                          ]}
                        >
                          {formatAmountWithPercent(item.amount, item.percentage)}
                        </Text>
                        <AppIcon
                          name="chevron-right"
                          size={16}
                          color={colors.textMuted}
                        />
                      </View>
                    </View>

                    {/* Proportion Progress Bar */}
                    <View
                      style={[
                        styles.barTrack,
                        { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6' },
                      ]}
                    >
                      <View
                        style={[
                          styles.barFill,
                          {
                            backgroundColor: item.color,
                            width: `${Math.max(2, Math.min(100, item.percentage))}%`,
                          },
                        ]}
                      />
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      <FloatingAddButton
        onPress={() => router.push(`/transaction/new?kind=${kind}`)}
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
    width: 64,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  topTitle: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  periodToggleBtn: {
    width: 64,
    alignItems: 'flex-end',
  },
  periodToggleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 120,
  },
  segmentTrack: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  card: {
    borderRadius: radius.lg,
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
  chartWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 22,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  chartHint: {
    fontSize: 11.5,
    marginTop: 10,
    textAlign: 'center',
  },
  listSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  totalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  emptyWrap: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryRow: {
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    flexShrink: 1,
  },
  categoryMeta: {
    flex: 1,
    flexShrink: 1,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
  },
  txCountText: {
    fontSize: 12,
    marginTop: 1,
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 6,
  },
  categoryAmount: {
    fontSize: 14.5,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  barTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
});
