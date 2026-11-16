import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import {
  formatAmountPlain,
  formatDayCardHeader,
  formatTransactionTitle,
  type Account,
  type Category,
  type Transaction,
} from '@mm/core';
import { AppIcon, CategoryBadge } from './icons';
import { radius, useTheme } from './theme';

export interface DayGroup {
  date: string;
  incomeTotal: number;
  expenseTotal: number;
  transactions: Transaction[];
}

export function groupTransactionsByDay(transactions: Transaction[]): DayGroup[] {
  const byDate = new Map<string, DayGroup>();
  for (const tx of transactions) {
    let group = byDate.get(tx.date);
    if (!group) {
      group = {
        date: tx.date,
        incomeTotal: 0,
        expenseTotal: 0,
        transactions: [],
      };
      byDate.set(tx.date, group);
    }
    if (tx.kind === 'income') {
      group.incomeTotal += tx.amount;
    } else if (tx.kind === 'expense') {
      group.expenseTotal += tx.amount;
    }
    group.transactions.push(tx);
  }
  return Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date));
}

export function TransactionDayCard({
  group,
  categoryMap,
  accountMap,
  onSelectTransaction,
  onPressDayHeader,
}: {
  group: DayGroup;
  categoryMap: Map<string, Category>;
  accountMap?: Map<string, Account>;
  onSelectTransaction: (tx: Transaction) => void;
  onPressDayHeader?: (date: string) => void;
}) {
  const { colors, isDark } = useTheme();
  const showAccountPill = Boolean(accountMap && accountMap.size > 1);

  return (
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
      {/* Day Header */}
      <Pressable
        disabled={!onPressDayHeader}
        onPress={() => onPressDayHeader?.(group.date)}
        style={({ pressed }) => [
          styles.dayHeader,
          {
            borderBottomColor: colors.border,
            opacity: pressed && onPressDayHeader ? 0.72 : 1,
          },
        ]}
      >
        <Text style={[styles.dayTitle, { color: colors.text }]}>
          {formatDayCardHeader(group.date)}
        </Text>
        <View style={styles.dayTotals}>
          {group.incomeTotal > 0 ? (
            <View style={styles.dayTotalPair}>
              <Text style={[styles.dayTotalLabel, { color: colors.income }]}>
                Income
              </Text>
              <Text style={[styles.dayTotalAmount, { color: colors.income }]}>
                {formatAmountPlain(group.incomeTotal)}
              </Text>
            </View>
          ) : null}
          {group.expenseTotal > 0 ? (
            <View style={styles.dayTotalPair}>
              <Text style={[styles.dayTotalLabel, { color: colors.textMuted }]}>
                Expense
              </Text>
              <Text style={[styles.dayTotalAmount, { color: colors.text }]}>
                {formatAmountPlain(group.expenseTotal)}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>

      {/* Transaction Rows */}
      <View style={styles.txList}>
        {group.transactions.map((tx) => {
          const cat = categoryMap.get(tx.categoryId);
          const acc = accountMap?.get(tx.accountId);
          const title = formatTransactionTitle(cat, tx);
          const badgeColor =
            cat?.color ?? (tx.kind === 'income' ? '#FCE07D' : '#CBD5E1');
          const badgeIcon =
            cat?.icon ?? (tx.kind === 'income' ? 'banknotes' : 'question');
          const amountColor = tx.kind === 'income' ? colors.income : colors.text;

          return (
            <Pressable
              key={tx.id}
              onPress={() => onSelectTransaction(tx)}
              style={({ pressed }) => [
                styles.txRow,
                { opacity: pressed ? 0.72 : 1 },
              ]}
            >
              <CategoryBadge icon={badgeIcon} color={badgeColor} size={38} />
              <View style={styles.txCenter}>
                <Text
                  style={[styles.txTitle, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {title}
                </Text>
                {tx.note || (showAccountPill && acc) ? (
                  <View style={styles.noteRow}>
                    {showAccountPill && acc ? (
                      <View
                        style={[
                          styles.accountPill,
                          {
                            backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.accountPillText,
                            { color: colors.textSecondary },
                          ]}
                          numberOfLines={1}
                        >
                          {acc.name}
                        </Text>
                      </View>
                    ) : null}
                    {tx.note ? (
                      <View style={styles.noteTextWrap}>
                        <AppIcon name="note" size={13} color={colors.textMuted} />
                        <Text
                          style={[styles.txNote, { color: colors.textMuted }]}
                          numberOfLines={1}
                        >
                          {tx.note}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
              <Text style={[styles.txAmount, { color: amountColor }]}>
                {formatAmountPlain(tx.amount)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    marginBottom: 14,
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dayTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  dayTotals: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  dayTotalPair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayTotalLabel: {
    fontSize: 13.5,
    fontWeight: '500',
  },
  dayTotalAmount: {
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  txList: {
    paddingVertical: 6,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 14,
  },
  txCenter: {
    flex: 1,
    justifyContent: 'center',
    gap: 3,
  },
  txTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 1,
  },
  accountPill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  accountPillText: {
    fontSize: 11,
    fontWeight: '500',
  },
  noteTextWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  txNote: {
    flex: 1,
    fontSize: 13,
    fontWeight: '400',
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
});
