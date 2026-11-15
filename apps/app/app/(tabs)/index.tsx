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
  getCategoryBreakdown,
  getMonthDateRange,
  getMonthlySummary,
  listCategories,
  listTransactions,
  shiftYearMonth,
  type DonutSliceInput,
} from '@mm/core';
import { useVault } from '../../src/data/VaultContext';
import { webSyncClient } from '../../src/platform/client';
import { phoneLanServer } from '../../src/server/lanServer';
import { FloatingAddButton } from '../../src/ui/components';
import { DonutChart } from '../../src/ui/DonutChart';
import { AppIcon } from '../../src/ui/icons';
import { PeriodHeader } from '../../src/ui/PeriodHeader';
import { SettingsModal } from '../../src/ui/SettingsModal';
import {
  groupTransactionsByDay,
  TransactionDayCard,
} from '../../src/ui/TransactionDayGroup';
import { radius, useTheme } from '../../src/ui/theme';

export default function HomeScreen() {
  const { store, role, lanState } = useVault();
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const [selectedMonth, setSelectedMonth] = useState(() =>
    new Date().toISOString().slice(0, 7)
  );
  const [showAllDays, setShowAllDays] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const range = getMonthDateRange(selectedMonth);
  const summary = getMonthlySummary(store, selectedMonth);
  const breakdown = getCategoryBreakdown(store, selectedMonth, 'expense');
  const txs = listTransactions(store, { month: selectedMonth });
  const dayGroups = groupTransactionsByDay(txs);
  const visibleGroups = showAllDays ? dayGroups : dayGroups.slice(0, 5);
  const categoryMap = new Map(listCategories(store).map((c) => [c.id, c]));

  const donutData: DonutSliceInput[] = breakdown.map((item) => ({
    id: item.categoryId,
    label: item.categoryName,
    value: item.amount,
    color: item.color,
  }));

  const handleSyncPress = () => {
    if (role === 'web-thin-client') {
      void webSyncClient.syncNow();
    } else if (!lanState.running) {
      void phoneLanServer.start(store, 8787).catch(() => {});
      setMenuOpen(true);
    } else {
      setMenuOpen(true);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      {/* Top App Bar */}
      <View
        style={[
          styles.topBar,
          { borderBottomColor: colors.border },
        ]}
      >
        <Pressable
          onPress={() => setMenuOpen(true)}
          hitSlop={10}
          style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Open menu and settings"
        >
          <AppIcon name="menu" size={23} color={colors.text} />
        </Pressable>

        <Pressable
          onPress={handleSyncPress}
          hitSlop={10}
          style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Sync or manage web server"
        >
          <AppIcon name="sync" size={21} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Month Period Selector */}
        <PeriodHeader
          monthLabel={range.monthLabel}
          rangeLabel={range.rangeLabel}
          onPrev={() => setSelectedMonth((m) => shiftYearMonth(m, -1))}
          onNext={() => setSelectedMonth((m) => shiftYearMonth(m, 1))}
        />

        {/* Monthly Balance & Donut Card */}
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
          <View
            style={[
              styles.cardHeader,
              { borderBottomColor: colors.border },
            ]}
          >
            <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>
              {range.monthLabel}'s balance
            </Text>
          </View>

          <View style={styles.balanceBody}>
            <DonutChart
              data={donutData}
              size={136}
              centerLabel="Expense"
              maxLabelChars={10}
            />

            <View style={styles.balanceStats}>
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                  Income
                </Text>
                <Text style={[styles.statAmount, { color: colors.income }]}>
                  {formatAmountPlain(summary.income)}
                </Text>
              </View>

              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                  Expense
                </Text>
                <Text style={[styles.statAmount, { color: colors.expense }]}>
                  {formatAmountPlain(summary.expense)}
                </Text>
              </View>

              <View
                style={[
                  styles.statDivider,
                  { backgroundColor: colors.border },
                ]}
              />

              <View style={styles.balanceTotalRow}>
                <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>
                  Balance
                </Text>
                <Text style={[styles.balanceValue, { color: colors.text }]}>
                  {formatAmountPlain(summary.net)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Monthly Transactions Section */}
        <Text style={[styles.sectionHeading, { color: colors.text }]}>
          {range.monthLabel} transactions
        </Text>

        {visibleGroups.length === 0 ? (
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
          visibleGroups.map((group) => (
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

        {dayGroups.length > 5 ? (
          <Pressable
            onPress={() => setShowAllDays((v) => !v)}
            style={styles.viewAllBtn}
          >
            <Text style={[styles.viewAllText, { color: colors.link }]}>
              {showAllDays ? 'Show less' : 'View all'}
            </Text>
          </Pressable>
        ) : dayGroups.length > 0 ? (
          <Pressable
            onPress={() => router.push('/(tabs)/transactions')}
            style={styles.viewAllBtn}
          >
            <Text style={[styles.viewAllText, { color: colors.link }]}>
              View all
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <FloatingAddButton
        onPress={() => router.push('/transaction/new')}
      />

      <SettingsModal visible={menuOpen} onClose={() => setMenuOpen(false)} />
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
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: {
    padding: 4,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 96,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 16,
  },
  balanceStats: {
    flex: 1,
    justifyContent: 'center',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 13.5,
    fontWeight: '500',
  },
  statAmount: {
    fontSize: 14.5,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  statDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },
  balanceTotalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  balanceLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  balanceValue: {
    fontSize: 26,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
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
  viewAllBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  viewAllText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
