import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  centsToDecimalString,
  deleteBudget,
  formatAmountPlain,
  getBudgetStatuses,
  getWeekDateRange,
  getWeeksForMonth,
  listCategories,
  normalizeBudgetPeriod,
  parseToCents,
  setBudget,
  shiftDateByDays,
  shiftYear,
  shiftYearMonth,
  SHORT_MONTHS,
  type BudgetPeriodType,
} from '@mm/core';
import { useVault } from '../../src/data/VaultContext';
import { Button, Card, ProgressBar } from '../../src/ui/components';
import { DatePickerModal } from '../../src/ui/DatePickerModal';
import { AppIcon } from '../../src/ui/icons';
import { radius, spacing, useTheme } from '../../src/ui/theme';
import { useResponsive } from '../../src/ui/useResponsive';

const PERIOD_TABS: Array<{ key: BudgetPeriodType; label: string }> = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

const QUICK_LIMIT_DELTAS = [50, 100, 500, 1000] as const;

function formatEditableDecimal(cents: number): string {
  return centsToDecimalString(cents).replace(/\.00$/, '');
}

export default function BudgetsScreen() {
  const { store, selectedMonth } = useVault();
  const { colors } = useTheme();
  const { isDesktop } = useResponsive();
  const router = useRouter();

  const todayStr = new Date().toISOString().slice(0, 10);
  const currentYearMonth = todayStr.slice(0, 7);
  const currentYear = todayStr.slice(0, 4);
  const currentWeekStart = getWeekDateRange(todayStr).startDate;

  const initialYm = /^\d{4}-\d{2}$/.test(selectedMonth) ? selectedMonth : currentYearMonth;
  const initialYearNum = Number(initialYm.slice(0, 4)) || Number(currentYear);

  const [periodType, setPeriodType] = useState<BudgetPeriodType>('monthly');
  const [selectedYear, setSelectedYear] = useState<string>(() => initialYm.slice(0, 4));
  const [yearPageStart, setYearPageStart] = useState<number>(() => initialYearNum - 3);
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>(() => initialYm);
  const [monthPickerYear, setMonthPickerYear] = useState<number>(() => initialYearNum);
  const [selectedWeekAnchor, setSelectedWeekAnchor] = useState<string>(() => currentWeekStart);
  const [weekViewMonth, setWeekViewMonth] = useState<string>(() => initialYm);
  const [pickerExpanded, setPickerExpanded] = useState<boolean>(true);
  const [calendarModalOpen, setCalendarModalOpen] = useState<boolean>(false);

  const expenseCategories = listCategories(store, 'expense');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [limitStr, setLimitStr] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activePeriodInput =
    periodType === 'weekly'
      ? selectedWeekAnchor
      : periodType === 'yearly'
        ? selectedYear
        : selectedYearMonth;
  const activePeriod = useMemo(
    () => normalizeBudgetPeriod(activePeriodInput, periodType),
    [activePeriodInput, periodType]
  );

  const statuses = getBudgetStatuses(store, activePeriod.periodKey);
  const existingForSelected = statuses.find((b) => b.categoryId === selectedCat);

  const weeksInMonth = useMemo(() => getWeeksForMonth(weekViewMonth), [weekViewMonth]);
  const weekMonthInfo = useMemo(
    () => normalizeBudgetPeriod(weekViewMonth, 'monthly').range,
    [weekViewMonth]
  );
  const yearGrid = useMemo(
    () => Array.from({ length: 8 }, (_, idx) => String(yearPageStart + idx)),
    [yearPageStart]
  );

  const currentPeriodKey =
    periodType === 'weekly'
      ? currentWeekStart
      : periodType === 'yearly'
        ? currentYear
        : currentYearMonth;
  const isCurrentPeriod = activePeriod.periodKey === currentPeriodKey;

  const periodHeadline =
    periodType === 'weekly'
      ? `Week: ${activePeriod.range.rangeLabel}`
      : periodType === 'yearly'
        ? `Year ${activePeriod.range.fullMonthYearLabel}`
        : activePeriod.range.fullMonthYearLabel;

  const periodSummaryHeading =
    periodType === 'weekly'
      ? `${activePeriod.range.rangeLabel} (${activePeriod.range.fullMonthYearLabel})`
      : periodType === 'yearly'
        ? `Year ${activePeriod.range.fullMonthYearLabel}`
        : activePeriod.range.fullMonthYearLabel;

  const selectCategory = (categoryId: string) => {
    setSelectedCat(categoryId);
    setErrorMsg(null);
    const match = statuses.find((b) => b.categoryId === categoryId);
    if (match) {
      setLimitStr(formatEditableDecimal(match.limitAmount));
    }
  };

  const handleStepPeriod = (delta: -1 | 1) => {
    if (periodType === 'weekly') {
      const next = shiftDateByDays(activePeriod.periodKey, delta * 7);
      setSelectedWeekAnchor(next);
      setWeekViewMonth(next.slice(0, 7));
    } else if (periodType === 'monthly') {
      const next = shiftYearMonth(selectedYearMonth, delta);
      setSelectedYearMonth(next);
      setMonthPickerYear(Number(next.slice(0, 4)));
    } else {
      const next = shiftYear(selectedYear, delta);
      setSelectedYear(next);
      const yr = Number(next);
      if (yr < yearPageStart || yr > yearPageStart + 7) {
        setYearPageStart(yr - 3);
      }
    }
  };

  const handleResetToCurrent = () => {
    if (periodType === 'weekly') {
      setSelectedWeekAnchor(currentWeekStart);
      setWeekViewMonth(currentYearMonth);
    } else if (periodType === 'monthly') {
      setSelectedYearMonth(currentYearMonth);
      setMonthPickerYear(Number(currentYear));
    } else {
      setSelectedYear(currentYear);
      setYearPageStart(Number(currentYear) - 3);
    }
  };

  const handleQuickAddLimit = (deltaUnits: number) => {
    setErrorMsg(null);
    let currentCents = 0;
    if (limitStr.trim()) {
      try {
        currentCents = Math.max(0, parseToCents(limitStr));
      } catch {
        currentCents = 0;
      }
    }
    setLimitStr(formatEditableDecimal(currentCents + deltaUnits * 100));
  };

  const handleSaveBudget = () => {
    const trimmed = limitStr.trim();
    if (!trimmed) {
      setErrorMsg('Enter or tap a budget limit amount first.');
      return;
    }
    try {
      const cents = parseToCents(trimmed);
      if (cents < 0) {
        setErrorMsg('Budget limit cannot be negative.');
        return;
      }
      const catId = selectedCat || 'all';
      setBudget(store, {
        categoryId: catId,
        month: activePeriod.periodKey,
        periodType,
        limitAmount: cents,
      });
      setErrorMsg(null);
      setLimitStr('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Invalid budget limit.');
    }
  };

  const periodLimitLabel =
    periodType === 'weekly'
      ? 'Weekly Limit'
      : periodType === 'yearly'
        ? 'Yearly Limit'
        : 'Monthly Limit';

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.backBtn}
        >
          <AppIcon name="chevron-left" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.text }]}>Budgets</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          isDesktop && styles.desktopContent,
        ]}
      >
        <View style={isDesktop ? styles.desktopRow : styles.mobileCol}>
          <View style={isDesktop ? styles.desktopColLeft : styles.mobileCol}>
            <Card>
              <Text style={[styles.title, { color: colors.text }]}>
            Set Category Budget
          </Text>

          {/* Period Type Segmented Control */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Budget Period
          </Text>
          <View
            style={[
              styles.segmentTrack,
              { backgroundColor: colors.surfaceElevated },
            ]}
          >
            {PERIOD_TABS.map((tab) => {
              const active = periodType === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => {
                    setPeriodType(tab.key);
                    setErrorMsg(null);
                  }}
                  style={[
                    styles.segmentBtn,
                    active && { backgroundColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: active ? '#FFFFFF' : colors.textSecondary },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Active Period Stepper Bar */}
          <View
            style={[
              styles.stepperBar,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
          >
            <Pressable
              onPress={() => handleStepPeriod(-1)}
              hitSlop={10}
              style={styles.stepperArrow}
              accessibilityRole="button"
              accessibilityLabel="Previous period"
            >
              <AppIcon name="chevron-left" size={18} color={colors.text} />
            </Pressable>

            <Pressable
              onPress={() => setPickerExpanded((prev) => !prev)}
              style={styles.stepperCenter}
            >
              <Text style={[styles.stepperTitle, { color: colors.text }]}>
                {periodHeadline}
              </Text>
              <Text style={[styles.stepperSub, { color: colors.textMuted }]}>
                {activePeriod.range.startDate} to {activePeriod.range.endDate}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleStepPeriod(1)}
              hitSlop={10}
              style={styles.stepperArrow}
              accessibilityRole="button"
              accessibilityLabel="Next period"
            >
              <AppIcon name="chevron-right" size={18} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.pickerToggleRow}>
            {!isCurrentPeriod ? (
              <Pressable
                onPress={handleResetToCurrent}
                hitSlop={8}
                style={[
                  styles.currentPill,
                  { backgroundColor: colors.surface, borderColor: colors.primary },
                ]}
              >
                <Text style={[styles.currentPillText, { color: colors.primary }]}>
                  Reset to current
                </Text>
              </Pressable>
            ) : (
              <View />
            )}
            <Pressable
              onPress={() => setPickerExpanded((prev) => !prev)}
              hitSlop={8}
            >
              <Text style={[styles.pickerToggleText, { color: colors.primary }]}>
                {pickerExpanded ? 'Hide period picker' : 'Select period'}
              </Text>
            </Pressable>
          </View>

          {/* Interactive Period Picker Grid */}
          {pickerExpanded ? (
            <View
              style={[
                styles.pickerPanel,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              {periodType === 'monthly' ? (
                <View>
                  <View style={styles.pickerHeaderRow}>
                    <Pressable
                      onPress={() => setMonthPickerYear((y) => y - 1)}
                      hitSlop={10}
                      style={styles.pickerNavBtn}
                    >
                      <AppIcon name="chevron-left" size={18} color={colors.textSecondary} />
                    </Pressable>
                    <Text style={[styles.pickerHeaderTitle, { color: colors.text }]}>
                      {monthPickerYear}
                    </Text>
                    <Pressable
                      onPress={() => setMonthPickerYear((y) => y + 1)}
                      hitSlop={10}
                      style={styles.pickerNavBtn}
                    >
                      <AppIcon name="chevron-right" size={18} color={colors.textSecondary} />
                    </Pressable>
                  </View>

                  <View style={styles.gridWrap}>
                    {SHORT_MONTHS.map((mLabel, idx) => {
                      const ym = `${String(monthPickerYear).padStart(4, '0')}-${String(idx + 1).padStart(2, '0')}`;
                      const isSelected = ym === selectedYearMonth;
                      const isCurrent = ym === currentYearMonth;
                      return (
                        <Pressable
                          key={ym}
                          onPress={() => setSelectedYearMonth(ym)}
                          style={[
                            styles.monthCell,
                            {
                              backgroundColor: isSelected
                                ? colors.primary
                                : colors.surface,
                              borderColor:
                                !isSelected && isCurrent ? colors.primary : colors.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.cellText,
                              {
                                color: isSelected
                                  ? '#FFFFFF'
                                  : isCurrent
                                    ? colors.primary
                                    : colors.text,
                              },
                            ]}
                          >
                            {mLabel}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {periodType === 'yearly' ? (
                <View>
                  <View style={styles.pickerHeaderRow}>
                    <Pressable
                      onPress={() => setYearPageStart((y) => y - 8)}
                      hitSlop={10}
                      style={styles.pickerNavBtn}
                    >
                      <AppIcon name="chevron-left" size={18} color={colors.textSecondary} />
                    </Pressable>
                    <Text style={[styles.pickerHeaderTitle, { color: colors.text }]}>
                      {yearPageStart} – {yearPageStart + 7}
                    </Text>
                    <Pressable
                      onPress={() => setYearPageStart((y) => y + 8)}
                      hitSlop={10}
                      style={styles.pickerNavBtn}
                    >
                      <AppIcon name="chevron-right" size={18} color={colors.textSecondary} />
                    </Pressable>
                  </View>

                  <View style={styles.gridWrap}>
                    {yearGrid.map((yr) => {
                      const isSelected = yr === selectedYear;
                      const isCurrent = yr === currentYear;
                      return (
                        <Pressable
                          key={yr}
                          onPress={() => setSelectedYear(yr)}
                          style={[
                            styles.yearCell,
                            {
                              backgroundColor: isSelected
                                ? colors.primary
                                : colors.surface,
                              borderColor:
                                !isSelected && isCurrent ? colors.primary : colors.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.cellText,
                              {
                                color: isSelected
                                  ? '#FFFFFF'
                                  : isCurrent
                                    ? colors.primary
                                    : colors.text,
                              },
                            ]}
                          >
                            {yr}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {periodType === 'weekly' ? (
                <View>
                  <View style={styles.pickerHeaderRow}>
                    <Pressable
                      onPress={() => setWeekViewMonth((m) => shiftYearMonth(m, -1))}
                      hitSlop={10}
                      style={styles.pickerNavBtn}
                    >
                      <AppIcon name="chevron-left" size={18} color={colors.textSecondary} />
                    </Pressable>
                    <Text style={[styles.pickerHeaderTitle, { color: colors.text }]}>
                      {weekMonthInfo.fullMonthYearLabel}
                    </Text>
                    <Pressable
                      onPress={() => setWeekViewMonth((m) => shiftYearMonth(m, 1))}
                      hitSlop={10}
                      style={styles.pickerNavBtn}
                    >
                      <AppIcon name="chevron-right" size={18} color={colors.textSecondary} />
                    </Pressable>
                  </View>

                  <View style={styles.weekList}>
                    {weeksInMonth.map((week, idx) => {
                      const isSelected = week.startDate === activePeriod.periodKey;
                      const isCurrent = week.startDate === currentWeekStart;
                      return (
                        <Pressable
                          key={week.startDate}
                          onPress={() => setSelectedWeekAnchor(week.startDate)}
                          style={[
                            styles.weekPill,
                            {
                              backgroundColor: isSelected
                                ? colors.primary
                                : colors.surface,
                              borderColor:
                                !isSelected && isCurrent ? colors.primary : colors.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.weekPillLabel,
                              {
                                color: isSelected
                                  ? '#FFFFFF'
                                  : isCurrent
                                    ? colors.primary
                                    : colors.text,
                              },
                            ]}
                          >
                            W{idx + 1}: {week.rangeLabel}
                          </Text>
                          <Text
                            style={[
                              styles.weekPillSub,
                              {
                                color: isSelected
                                  ? 'rgba(255,255,255,0.85)'
                                  : colors.textMuted,
                              },
                            ]}
                          >
                            {week.startDate}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Pressable
                    onPress={() => setCalendarModalOpen(true)}
                    style={[
                      styles.calendarBtn,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <AppIcon name="calendar" size={16} color={colors.primary} />
                    <Text style={[styles.calendarBtnText, { color: colors.text }]}>
                      Pick from Calendar
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Category Selector */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Expense Category
          </Text>
          <View style={styles.chipWrap}>
            <Pressable
              key="all"
              onPress={() => selectCategory('all')}
              style={[
                styles.chip,
                {
                  backgroundColor:
                    selectedCat === 'all' ? colors.primary : colors.surfaceElevated,
                },
              ]}
            >
              <Text
                style={{
                  color: selectedCat === 'all' ? '#FFFFFF' : colors.textSecondary,
                  fontSize: 13,
                  fontWeight: '600',
                }}
              >
                All Expenses
              </Text>
            </Pressable>
            {expenseCategories.map((cat) => {
              const active = selectedCat === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => selectCategory(cat.id)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active
                        ? colors.primary
                        : colors.surfaceElevated,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: active ? '#FFFFFF' : colors.textSecondary,
                      fontSize: 13,
                      fontWeight: '600',
                    }}
                  >
                    {cat.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Limit Input + Quick Presets */}
          <View style={styles.limitLabelRow}>
            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 0, marginBottom: 0 }]}>
              {periodLimitLabel}
            </Text>
            {existingForSelected ? (
              <Text style={[styles.existingHint, { color: colors.primary }]}>
                Current: {formatAmountPlain(existingForSelected.limitAmount)}
              </Text>
            ) : null}
          </View>
          <TextInput
            value={limitStr}
            onChangeText={(val) => {
              setLimitStr(val);
              if (errorMsg) setErrorMsg(null);
            }}
            placeholder="400"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            style={[
              styles.input,
              { backgroundColor: colors.surfaceElevated, color: colors.text },
            ]}
          />

          <View style={styles.quickPresetRow}>
            {QUICK_LIMIT_DELTAS.map((amt) => (
              <Pressable
                key={amt}
                onPress={() => handleQuickAddLimit(amt)}
                style={[
                  styles.presetBtn,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.presetText, { color: colors.textSecondary }]}>
                  +{amt.toLocaleString()}
                </Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => {
                setLimitStr('');
                setErrorMsg(null);
              }}
              style={[
                styles.presetBtn,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.presetText, { color: colors.textMuted }]}>
                Clear
              </Text>
            </Pressable>
          </View>

          {errorMsg ? (
            <Text style={[styles.errorText, { color: colors.expense }]}>
              {errorMsg}
            </Text>
          ) : null}

          <View style={{ marginTop: spacing.md }}>
            <Button
              label={existingForSelected ? 'Update Budget' : 'Save Budget'}
              onPress={handleSaveBudget}
            />
          </View>
        </Card>
      </View>

      <View style={isDesktop ? styles.desktopColRight : styles.mobileCol}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Budgets for {periodSummaryHeading}
        </Text>
        <Card>
          {statuses.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textMuted }]}>
              No budgets configured for {periodSummaryHeading}.
            </Text>
          ) : (
            statuses.map((b) => (
              <Pressable
                key={b.id}
                onPress={() => {
                  setSelectedCat(b.categoryId);
                  setLimitStr(formatEditableDecimal(b.limitAmount));
                  setErrorMsg(null);
                }}
                style={[styles.budgetRow, { borderBottomColor: colors.border }]}
              >
                <View style={styles.rowHeader}>
                  <View style={styles.catTitleWrap}>
                    <Text style={[styles.catName, { color: colors.text }]}>
                      {b.categoryName}
                    </Text>
                    <Text style={[styles.remainingHint, { color: b.remaining < 0 ? colors.expense : colors.textMuted }]}>
                      {b.remaining >= 0
                        ? `${formatAmountPlain(b.remaining)} left`
                        : `${formatAmountPlain(Math.abs(b.remaining))} over`}
                    </Text>
                  </View>
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                  >
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                      {formatAmountPlain(b.spent)} / {formatAmountPlain(b.limitAmount)}
                    </Text>
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation?.();
                        deleteBudget(store, b.id);
                      }}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: radius.sm,
                        backgroundColor: colors.surfaceElevated,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.expense,
                          fontSize: 11,
                          fontWeight: '600',
                        }}
                      >
                        Delete
                      </Text>
                    </Pressable>
                  </View>
                </View>
                <ProgressBar progress={b.progress} color={b.categoryColor} />
              </Pressable>
            ))
          )}
        </Card>
      </View>
    </View>
  </ScrollView>

      <DatePickerModal
        visible={calendarModalOpen}
        initialDate={selectedWeekAnchor}
        onCancel={() => setCalendarModalOpen(false)}
        onConfirm={(pickedDate) => {
          const range = getWeekDateRange(pickedDate);
          setSelectedWeekAnchor(range.startDate);
          setWeekViewMonth(pickedDate.slice(0, 7));
          setCalendarModalOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, alignItems: 'flex-start' },
  topTitle: { fontSize: 18, fontWeight: '600' },
  content: { padding: spacing.lg, paddingBottom: 48 },
  desktopContent: {
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 40,
  },
  desktopRow: {
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
  mobileCol: {
    width: '100%',
    gap: 16,
  },
  title: { fontSize: 16, fontWeight: '700' },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  segmentTrack: {
    flexDirection: 'row',
    borderRadius: radius.pill,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
  },
  stepperBar: {
    marginTop: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  stepperArrow: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  stepperTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  stepperSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  currentPill: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  currentPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pickerToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 24,
    marginTop: 6,
  },
  pickerToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pickerPanel: {
    marginTop: 8,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.sm,
  },
  pickerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },
  pickerNavBtn: {
    padding: 4,
  },
  pickerHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  monthCell: {
    width: '22.5%',
    flexGrow: 1,
    paddingVertical: 9,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearCell: {
    width: '22.5%',
    flexGrow: 1,
    paddingVertical: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 13,
    fontWeight: '600',
  },
  weekList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  weekPill: {
    width: '48%',
    flexGrow: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  weekPillLabel: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  weekPillSub: {
    fontSize: 11,
    marginTop: 2,
  },
  calendarBtn: {
    marginTop: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  calendarBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 14,
  },
  limitLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  existingHint: {
    fontSize: 12,
    fontWeight: '600',
  },
  quickPresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.xs,
  },
  presetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  budgetRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  catTitleWrap: {
    flex: 1,
    marginRight: 8,
  },
  catName: { fontWeight: '600', fontSize: 15 },
  remainingHint: { fontSize: 11.5, marginTop: 1 },
  empty: { textAlign: 'center', paddingVertical: spacing.lg },
});
