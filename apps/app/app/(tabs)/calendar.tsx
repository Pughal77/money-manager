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
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
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
            <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>
                {formatDayCardHeader(selectedDate)}
              </Text>
            </View>
            <View style={styles.emptyBody}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                There is no history.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <FloatingAddButton
        onPress={() =>
          router.push(`/transaction/new?date=${encodeURIComponent(selectedDate)}`)
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
});
