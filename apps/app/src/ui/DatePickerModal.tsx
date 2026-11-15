import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  buildCalendarMonthGrid,
  formatPickerBannerDate,
  getMonthDateRange,
  shiftYearMonth,
} from '@mm/core';
import { AppIcon } from './icons';
import { useTheme } from './theme';

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function DatePickerModal({
  visible,
  initialDate,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  initialDate: string; // YYYY-MM-DD
  onCancel: () => void;
  onConfirm: (date: string) => void;
}) {
  const { colors, isDark } = useTheme();
  const todayStr = new Date().toISOString().slice(0, 10);

  const [draftDate, setDraftDate] = useState(initialDate);
  const [viewMonth, setViewMonth] = useState(() => initialDate.slice(0, 7));

  useEffect(() => {
    if (visible) {
      setDraftDate(initialDate);
      setViewMonth(initialDate.slice(0, 7));
    }
  }, [visible, initialDate]);

  const monthInfo = getMonthDateRange(viewMonth);
  // Sunday-first 42-cell grid matching the date picker screenshot (`S M T W T F S`)
  const cells = buildCalendarMonthGrid(viewMonth, false);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.dialog,
            {
              backgroundColor: isDark ? '#252422' : '#FFFFFF',
              borderColor: colors.border,
              borderWidth: isDark ? 0 : 1,
            },
          ]}
        >
          {/* Top Header Area */}
          <View style={[styles.topSection, { borderBottomColor: colors.border }]}>
            <Text style={[styles.selectDateLabel, { color: colors.textSecondary }]}>
              Select date
            </Text>
            <View style={styles.bannerRow}>
              <Text style={[styles.bannerDate, { color: colors.text }]}>
                {formatPickerBannerDate(draftDate)}
              </Text>
              <AppIcon name="pencil" size={20} color={colors.text} />
            </View>
          </View>

          {/* Month Selector Row */}
          <View style={styles.monthBar}>
            <Text style={[styles.monthLabel, { color: colors.textSecondary }]}>
              {monthInfo.fullMonthYearLabel}  ▾
            </Text>
            <View style={styles.monthArrows}>
              <Pressable
                onPress={() => setViewMonth((m) => shiftYearMonth(m, -1))}
                hitSlop={10}
                style={styles.arrowBtn}
              >
                <AppIcon name="chevron-left" size={18} color={colors.textSecondary} />
              </Pressable>
              <Pressable
                onPress={() => setViewMonth((m) => shiftYearMonth(m, 1))}
                hitSlop={10}
                style={styles.arrowBtn}
              >
                <AppIcon name="chevron-right" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          {/* Weekday Header Row */}
          <View style={styles.weekdayRow}>
            {WEEKDAY_INITIALS.map((letter, idx) => (
              <View key={idx} style={styles.dayCellWrap}>
                <Text style={[styles.weekdayText, { color: colors.text }]}>
                  {letter}
                </Text>
              </View>
            ))}
          </View>

          {/* Calendar Days Grid */}
          <View style={styles.grid}>
            {cells.map((cell) => {
              if (!cell.inCurrentMonth) {
                return <View key={cell.date} style={styles.dayCellWrap} />;
              }
              const isSelected = cell.date === draftDate;
              const isToday = cell.date === todayStr;

              return (
                <View key={cell.date} style={styles.dayCellWrap}>
                  <Pressable
                    onPress={() => setDraftDate(cell.date)}
                    style={[
                      styles.dayCircle,
                      isSelected && { backgroundColor: colors.primary },
                      !isSelected &&
                        isToday && {
                          borderWidth: 1.5,
                          borderColor: colors.primary,
                        },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayNumber,
                        {
                          color: isSelected
                            ? '#FFFFFF'
                            : isToday
                              ? colors.primary
                              : colors.text,
                          fontWeight: isSelected || isToday ? '700' : '500',
                        },
                      ]}
                    >
                      {cell.dayNumber}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>

          {/* Dialog Footer Actions */}
          <View style={styles.footer}>
            <Pressable
              onPress={onCancel}
              hitSlop={8}
              style={styles.footerBtn}
            >
              <Text style={[styles.footerBtnText, { color: colors.primary }]}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={() => onConfirm(draftDate)}
              hitSlop={8}
              style={styles.footerBtn}
            >
              <Text style={[styles.footerBtnText, { color: colors.primary }]}>
                OK
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    paddingTop: 20,
    paddingBottom: 14,
  },
  topSection: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  selectDateLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 14,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerDate: {
    fontSize: 30,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  monthArrows: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  arrowBtn: {
    padding: 4,
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  dayCellWrap: {
    width: '14.285%',
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayText: {
    fontSize: 13,
    fontWeight: '500',
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: {
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 22,
    paddingTop: 12,
    gap: 28,
  },
  footerBtn: {
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  footerBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
