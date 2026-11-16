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
  listAccounts,
  listCategories,
  listTransactions,
  shiftYearMonth,
  type CategoryKind,
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
  const {
    store,
    role,
    lanState,
    selectedMonth,
    setSelectedMonth,
    setSelectedDate,
  } = useVault();
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const [cardKind, setCardKind] = useState<CategoryKind>('expense');
  const [showAllDays, setShowAllDays] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const range = getMonthDateRange(selectedMonth);
  const summary = getMonthlySummary(store, selectedMonth);
  const breakdown = getCategoryBreakdown(store, selectedMonth, cardKind);
  const txs = listTransactions(store, { month: selectedMonth });
  const dayGroups = groupTransactionsByDay(txs);
  const visibleGroups = showAllDays ? dayGroups : dayGroups.slice(0, 5);
  const categoryMap = new Map(listCategories(store).map((c) => [c.id, c]));
  const accountMap = new Map(listAccounts(store).map((a) => [a.id, a]));

  const donutData: DonutSliceInput[] = breakdown.map((item) => ({
    id: item.categoryId,
    label: item.categoryName,
    value: item.amount,
    color: item.color,
  }));

  const toggleCardKind = () => {
    setCardKind((prev) => (prev === 'expense' ? 'income' : 'expense'));
  };

  const handleOpenBreakdown = (kindOverride?: CategoryKind, focusCategoryId?: string) => {
    const targetKind = kindOverride ?? cardKind;
    const focusParam = focusCategoryId
      ? `&focus=${encodeURIComponent(focusCategoryId)}`
      : '';
    router.push(
      `/breakdown?month=${encodeURIComponent(selectedMonth)}&kind=${targetKind}${focusParam}`
    );
  };

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

        <View style={styles.topBarRight}>
          <Pressable
            onPress={() => router.push('/(tabs)/accounts')}
            hitSlop={8}
            style={({ pressed }) => [
              styles.accountsBtn,
              {
                backgroundColor: isDark ? '#212121' : '#F4F4F5',
                borderColor: colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open accounts view"
          >
            <AppIcon name="banknotes" size={16} color={colors.primary} />
            <Text style={[styles.accountsBtnText, { color: colors.text }]}>
              Accounts
            </Text>
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
          {/* Card Header — Tapping opens Dedicated Decomposition Page */}
          <Pressable
            onPress={() => handleOpenBreakdown(cardKind)}
            style={({ pressed }) => [
              styles.cardHeader,
              {
                borderBottomColor: colors.border,
                opacity: pressed ? 0.72 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open monthly decomposition view"
          >
            <View style={styles.cardHeaderLeft}>
              <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>
                {range.monthLabel}'s balance
              </Text>
              <View
                style={[
                  styles.modePill,
                  {
                    backgroundColor:
                      cardKind === 'expense'
                        ? isDark
                          ? 'rgba(232,92,92,0.16)'
                          : 'rgba(220,38,38,0.1)'
                        : isDark
                          ? 'rgba(46,184,114,0.16)'
                          : 'rgba(22,163,74,0.1)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modePillText,
                    {
                      color:
                        cardKind === 'expense' ? colors.expense : colors.income,
                    },
                  ]}
                >
                  {cardKind === 'expense' ? 'Expense' : 'Income'}
                </Text>
              </View>
            </View>

            <View style={styles.breakdownLink}>
              <Text style={[styles.breakdownLinkText, { color: colors.textMuted }]}>
                Breakdown
              </Text>
              <AppIcon name="chevron-right" size={15} color={colors.textMuted} />
            </View>
          </Pressable>

          {/* Card Body — Tapping the card element toggles between Expense and Income */}
          <Pressable
            onPress={toggleCardKind}
            style={({ pressed }) => [
              styles.balanceBody,
              { opacity: pressed ? 0.88 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Tap to toggle between Expense and Income chart"
          >
            <DonutChart
              data={donutData}
              size={136}
              centerLabel={cardKind === 'expense' ? 'Expense' : 'Income'}
              centerSubLabel="Tap to flip"
              maxLabelChars={10}
              onCenterPress={toggleCardKind}
              onSlicePress={toggleCardKind}
            />

            <View style={styles.balanceStats}>
              <View
                style={[
                  styles.statRow,
                  cardKind === 'income' && {
                    backgroundColor: isDark
                      ? 'rgba(46,184,114,0.1)'
                      : 'rgba(22,163,74,0.08)',
                    borderRadius: 6,
                    paddingHorizontal: 6,
                    marginHorizontal: -6,
                  },
                ]}
              >
                <View style={styles.statLabelWrap}>
                  <View
                    style={[
                      styles.activeDot,
                      {
                        backgroundColor:
                          cardKind === 'income' ? colors.income : 'transparent',
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statLabel,
                      {
                        color:
                          cardKind === 'income' ? colors.text : colors.textMuted,
                        fontWeight: cardKind === 'income' ? '600' : '500',
                      },
                    ]}
                  >
                    Income
                  </Text>
                </View>
                <Text style={[styles.statAmount, { color: colors.income }]}>
                  {formatAmountPlain(summary.income)}
                </Text>
              </View>

              <View
                style={[
                  styles.statRow,
                  cardKind === 'expense' && {
                    backgroundColor: isDark
                      ? 'rgba(232,92,92,0.1)'
                      : 'rgba(220,38,38,0.08)',
                    borderRadius: 6,
                    paddingHorizontal: 6,
                    marginHorizontal: -6,
                  },
                ]}
              >
                <View style={styles.statLabelWrap}>
                  <View
                    style={[
                      styles.activeDot,
                      {
                        backgroundColor:
                          cardKind === 'expense' ? colors.expense : 'transparent',
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statLabel,
                      {
                        color:
                          cardKind === 'expense' ? colors.text : colors.textMuted,
                        fontWeight: cardKind === 'expense' ? '600' : '500',
                      },
                    ]}
                  >
                    Expense
                  </Text>
                </View>
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
          </Pressable>
        </View>

        {/* Monthly Transactions Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>
            {range.monthLabel} transactions
          </Text>
          <Pressable
            onPress={() => handleOpenBreakdown(cardKind)}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
          >
            <Text style={[styles.decompositionLink, { color: colors.primary }]}>
              View decomposition
            </Text>
          </Pressable>
        </View>

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
              accountMap={accountMap}
              onPressDayHeader={(dateStr) => {
                setSelectedDate(dateStr);
                setSelectedMonth(dateStr.slice(0, 7));
                router.push('/(tabs)/calendar');
              }}
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
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  accountsBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  modePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  modePillText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  breakdownLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  breakdownLinkText: {
    fontSize: 12.5,
    fontWeight: '500',
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
    paddingVertical: 4,
    marginBottom: 4,
  },
  statLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statLabel: {
    fontSize: 13.5,
  },
  statAmount: {
    fontSize: 14.5,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  statDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 8,
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
  },
  decompositionLink: {
    fontSize: 13,
    fontWeight: '600',
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
