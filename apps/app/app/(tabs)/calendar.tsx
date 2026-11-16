import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  buildCalendarMonthGrid,
  formatAmountPlain,
  formatDayCardHeader,
  getDailyCalendarTotals,
  getMonthDateRange,
  listAccounts,
  listCategories,
  listTransactions,
  shiftYearMonth,
} from '@mm/core';
import { useVault } from '../../src/data/VaultContext';
import { FloatingAddButton } from '../../src/ui/components';
import { PeriodHeader } from '../../src/ui/PeriodHeader';
import {
  groupTransactionsByDay,
  TransactionDayCard,
} from '../../src/ui/TransactionDayGroup';
import { radius, useTheme } from '../../src/ui/theme';
import { useResponsive } from '../../src/ui/useResponsive';

const WEEKDAYS_MON_FIRST = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CalendarScreen() {
  const {
    store,
    selectedMonth,
    setSelectedMonth,
    selectedDate,
    setSelectedDate,
  } = useVault();
  const { colors, isDark } = useTheme();
  const { isDesktop } = useResponsive();
  const router = useRouter();

  const range = getMonthDateRange(selectedMonth);
  const cells = buildCalendarMonthGrid(selectedMonth, true);

  // Fetch daily totals covering the full 42-cell grid range (including leading/trailing days)
  const gridStart = cells[0]?.date ?? range.startDate;
  const gridEnd = cells[cells.length - 1]?.date ?? range.endDate;
  const dailyTotals = getDailyCalendarTotals(store, gridStart, gridEnd);

  const selectedDayTxs = listTransactions(store, { date: selectedDate });
  const selectedDayGroups = groupTransactionsByDay(selectedDayTxs);
  const categoryMap = new Map(listCategories(store).map((c) => [c.id, c]));
  const accountMap = new Map(listAccounts(store).map((a) => [a.id, a]));

  const handleChangeMonth = (delta: number) => {
    const nextMonth = shiftYearMonth(selectedMonth, delta);
    setSelectedMonth(nextMonth);
    setSelectedDate(`${nextMonth}-01`);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      {/* Top Header */}
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <Text style={[styles.topTitle, { color: colors.text }]}>Calendar</Text>
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
          {/* Left Column: Calendar Grid */}
          <View style={isDesktop ? styles.desktopColLeft : styles.mobileCol}>
            {/* Month Period Selector */}
            <PeriodHeader
              monthLabel={range.monthLabel}
              rangeLabel={range.rangeLabel}
              onPrev={() => handleChangeMonth(-1)}
              onNext={() => handleChangeMonth(1)}
            />

            {/* Calendar Card */}
            <View
              style={[
                styles.calendarCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: isDark ? 0 : 1,
                },
              ]}
            >
              <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>
                  {range.monthLabel}'s calendar
                </Text>
              </View>

              {/* Weekday Row */}
              <View style={[styles.weekdayRow, { borderBottomColor: colors.border }]}>
                {WEEKDAYS_MON_FIRST.map((day) => (
                  <View key={day} style={styles.weekdayCell}>
                    <Text style={[styles.weekdayText, { color: colors.textMuted }]}>
                      {day}
                    </Text>
                  </View>
                ))}
              </View>

              {/* 42-Cell Grid */}
              <View style={styles.grid}>
                {cells.map((cell) => {
                  const isSelected = cell.date === selectedDate;
                  const totals = dailyTotals[cell.date];
                  const dayIncome = totals?.income ?? 0;
                  const dayExpense = totals?.expense ?? 0;

                  return (
                    <Pressable
                      key={cell.date}
                      onPress={() => {
                        setSelectedDate(cell.date);
                        if (!cell.inCurrentMonth) {
                          setSelectedMonth(cell.date.slice(0, 7));
                        }
                      }}
                      style={[
                        styles.dayCell,
                        isDesktop && styles.dayCellDesktop,
                        !cell.inCurrentMonth && {
                          backgroundColor: colors.calendarOutBg,
                        },
                        isSelected && {
                          backgroundColor: colors.calendarSelectedBg,
                          borderRadius: 10,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayNumber,
                          {
                            color: isSelected
                              ? colors.primary
                              : cell.inCurrentMonth
                                ? colors.text
                                : colors.textMuted,
                            opacity: cell.inCurrentMonth || isSelected ? 1 : 0.45,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {cell.dayNumber}
                      </Text>

                      <View style={styles.cellTotals}>
                        {dayIncome > 0 ? (
                          <Text
                            style={[styles.cellIncome, { color: colors.income }]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                          >
                            {formatAmountPlain(dayIncome)}
                          </Text>
                        ) : null}
                        {dayExpense > 0 ? (
                          <Text
                            style={[styles.cellExpense, { color: colors.expense }]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                          >
                            {formatAmountPlain(dayExpense)}
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Right Column: Selected Day Detail */}
          <View style={isDesktop ? styles.desktopColRight : styles.mobileCol}>
            <View
              style={[
                styles.dayHeaderCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: isDark ? 0 : 1,
                },
              ]}
            >
              <View>
                <Text style={[styles.dayHeaderTitle, { color: colors.text }]}>
                  {formatDayCardHeader(selectedDate)}
                </Text>
                <Text style={[styles.dayHeaderSubtitle, { color: colors.textMuted }]}>
                  {selectedDayTxs.length}{' '}
                  {selectedDayTxs.length === 1 ? 'transaction' : 'transactions'}
                </Text>
              </View>
              <Pressable
                onPress={() =>
                  router.push(`/transaction/new?date=${encodeURIComponent(selectedDate)}`)
                }
                style={({ pressed }) => [
                  styles.addDayTxBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text style={styles.addDayTxBtnText}>+ Add</Text>
              </Pressable>
            </View>

            {/* Selected Date Transactions Card */}
            {selectedDayGroups.length > 0 ? (
              selectedDayGroups.map((group) => (
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
            ) : (
              <View
                style={[
                  styles.emptyDayCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: isDark ? 0 : 1,
                  },
                ]}
              >
                <View style={styles.emptyBody}>
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    There is no history for this date.
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {!isDesktop && (
        <FloatingAddButton
          onPress={() =>
            router.push(`/transaction/new?date=${encodeURIComponent(selectedDate)}`)
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topBar: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 120,
  },
  calendarCard: {
    borderRadius: radius.lg,
    marginTop: 4,
    marginBottom: 16,
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
  weekdayRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  weekdayCell: {
    width: '14.285%',
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.285%',
    minHeight: 64,
    paddingVertical: 6,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayNumber: {
    fontSize: 13,
  },
  cellTotals: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 2,
  },
  cellIncome: {
    fontSize: 9.5,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  cellExpense: {
    fontSize: 9.5,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  emptyDayCard: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  emptyBody: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
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
    flex: 1.3,
    minWidth: 0,
    gap: 16,
  },
  desktopColRight: {
    width: 380,
    flexShrink: 0,
    gap: 14,
  },
  mobileLayout: {
    flexDirection: 'column',
  },
  mobileCol: {
    width: '100%',
  },
  dayCellDesktop: {
    minHeight: 74,
    paddingVertical: 8,
  },
  dayHeaderCard: {
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayHeaderTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  dayHeaderSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  addDayTxBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.md,
  },
  addDayTxBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#000000',
  },
});
