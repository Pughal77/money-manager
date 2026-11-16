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
  getAccountBalances,
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
import { useResponsive } from '../../src/ui/useResponsive';
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
  const { isDesktop } = useResponsive();
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

  const displayedGroups = isDesktop ? dayGroups : visibleGroups;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      {/* Top App Bar (Mobile only, Desktop uses Sidebar) */}
      {!isDesktop && (
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
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          isDesktop && styles.desktopContent,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={isDesktop ? styles.desktopLayout : styles.mobileLayout}>
          {/* Left Column on Desktop / Top Section on Mobile */}
          <View style={isDesktop ? styles.desktopColLeft : styles.mobileCol}>
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
                <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>
                  {range.monthLabel}'s balance
                </Text>

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
                  size={128}
                  centerLabel={cardKind === 'expense' ? 'Expense' : 'Income'}
                  maxLabelChars={8}
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
                    <Text
                      style={[styles.balanceValue, { color: colors.text }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {formatAmountPlain(summary.net)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            </View>

            {/* Quick Accounts Card on Desktop */}
            {isDesktop && (
              <View
                style={[
                  styles.accountsCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: isDark ? 0 : 1,
                  },
                ]}
              >
                <View style={styles.accountsCardHeader}>
                  <Text style={[styles.accountsCardTitle, { color: colors.text }]}>
                    Accounts
                  </Text>
                  <Pressable
                    onPress={() => router.push('/(tabs)/accounts')}
                    hitSlop={8}
                  >
                    <Text style={[styles.accountsCardLink, { color: colors.link }]}>
                      Manage
                    </Text>
                  </Pressable>
                </View>
                {getAccountBalances(store).map((acc) => (
                  <View
                    key={acc.id}
                    style={[styles.accountRow, { borderTopColor: colors.border }]}
                  >
                    <View style={styles.accountInfo}>
                      <View
                        style={[
                          styles.accountDot,
                          { backgroundColor: colors.primary },
                        ]}
                      />
                      <Text
                        style={[styles.accountName, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {acc.name}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.accountBalance,
                        {
                          color:
                            acc.balance >= 0 ? colors.income : colors.expense,
                        },
                      ]}
                    >
                      {formatAmountPlain(acc.balance)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Right Column on Desktop / Bottom Section on Mobile */}
          <View style={isDesktop ? styles.desktopColRight : styles.mobileCol}>
            {/* Monthly Transactions Section */}
            <Text style={[styles.sectionHeading, { color: colors.text }]}>
              {range.monthLabel} transactions ({txs.length})
            </Text>

            {displayedGroups.length === 0 ? (
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
              displayedGroups.map((group) => (
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

            {!isDesktop && dayGroups.length > 5 ? (
              <Pressable
                onPress={() => setShowAllDays((v) => !v)}
                style={styles.viewAllBtn}
              >
                <Text style={[styles.viewAllText, { color: colors.link }]}>
                  {showAllDays ? 'Show less' : 'View all'}
                </Text>
              </Pressable>
            ) : !isDesktop && dayGroups.length > 0 ? (
              <Pressable
                onPress={() => router.push('/(tabs)/transactions')}
                style={styles.viewAllBtn}
              >
                <Text style={[styles.viewAllText, { color: colors.link }]}>
                  View all
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </ScrollView>

      {!isDesktop && (
        <FloatingAddButton
          onPress={() => router.push('/transaction/new')}
        />
      )}

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
    paddingBottom: 120,
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
  cardHeaderTitle: {
    fontSize: 15,
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
    gap: 14,
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
    gap: 8,
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
    gap: 8,
  },
  balanceLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  balanceValue: {
    flexShrink: 1,
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.4,
    textAlign: 'right',
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
    gap: 12,
  },
  mobileLayout: {
    flexDirection: 'column',
  },
  mobileCol: {
    width: '100%',
  },
  accountsCard: {
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 4,
  },
  accountsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  accountsCardTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  accountsCardLink: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  accountDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  accountName: {
    fontSize: 13.5,
    fontWeight: '500',
    flex: 1,
  },
  accountBalance: {
    fontSize: 13.5,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    marginLeft: 8,
  },
});
