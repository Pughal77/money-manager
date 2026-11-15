import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  addAccount,
  addTransaction,
  createCalculatorState,
  deleteTransaction,
  formatDisplayDate,
  getCalculatorCents,
  getCalculatorDisplayAmount,
  getCategoryById,
  getTransactionById,
  listAccounts,
  listCategories,
  stepCalculator,
  updateTransaction,
  type CategoryKind,
} from '@mm/core';
import { useVault } from '../../src/data/VaultContext';
import { DatePickerModal } from '../../src/ui/DatePickerModal';
import { AppIcon, CategoryBadge } from '../../src/ui/icons';
import { radius, useTheme } from '../../src/ui/theme';

type ActivePane = 'none' | 'calculator' | 'category';

export default function TransactionSheetScreen() {
  const { store } = useVault();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; date?: string }>();

  const existingTx = useMemo(
    () => (params.id ? getTransactionById(store, String(params.id)) : undefined),
    [store, params.id]
  );
  const isEditing = Boolean(existingTx);

  const initialDate =
    existingTx?.date ||
    (params.date && /^\d{4}-\d{2}-\d{2}$/.test(String(params.date))
      ? String(params.date)
      : new Date().toISOString().slice(0, 10));

  const [kind, setKind] = useState<CategoryKind>(() =>
    existingTx?.kind === 'income' ? 'income' : 'expense'
  );
  const [categoryId, setCategoryId] = useState<string>(
    () => existingTx?.categoryId ?? ''
  );
  const [subcategory, setSubcategory] = useState<string>(
    () => existingTx?.subcategory ?? ''
  );
  const [date, setDate] = useState<string>(initialDate);
  const [note, setNote] = useState<string>(() => existingTx?.note ?? '');
  const [calcState, setCalcState] = useState(() =>
    createCalculatorState(existingTx?.amount ?? 0)
  );
  const [activePane, setActivePane] = useState<ActivePane>(() =>
    isEditing ? 'none' : 'calculator'
  );
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const categoriesForKind = listCategories(store, kind);
  const selectedCategory = categoryId
    ? getCategoryById(store, categoryId)
    : undefined;

  const categoryTitle = useMemo(() => {
    if (!selectedCategory) {
      return 'Uncategorized > Uncategorized';
    }
    if (selectedCategory.kind === 'income') {
      const sub =
        subcategory && subcategory !== selectedCategory.name
          ? subcategory
          : selectedCategory.name;
      return `income > ${sub}`;
    }
    const sub = subcategory || selectedCategory.subcategories[0] || 'Other';
    return `${selectedCategory.name} > ${sub}`;
  }, [selectedCategory, subcategory]);

  const handleSelectCategory = (catId: string) => {
    const cat = getCategoryById(store, catId);
    if (!cat) return;
    setCategoryId(cat.id);
    setKind(cat.kind);
    const firstSub = cat.subcategories[0] ?? (cat.kind === 'income' ? cat.name : 'Other');
    setSubcategory(firstSub);
    setErrorMsg(null);
  };

  const handleDelete = () => {
    if (!existingTx) return;
    deleteTransaction(store, existingTx.id);
    router.back();
  };

  const handleBottomConfirmOrSave = () => {
    // If an arithmetic operator is waiting to be evaluated, evaluate it first
    if (activePane === 'calculator' && calcState.operator !== null) {
      setCalcState((s) => stepCalculator(s, 'confirm'));
      return;
    }

    const cents = getCalculatorCents(calcState);
    if (cents <= 0) {
      setActivePane('calculator');
      setErrorMsg('Please enter an amount greater than 0');
      return;
    }

    // If user confirmed amount in Create mode and hasn't chosen a category yet, switch to Category picker
    if (!isEditing && activePane === 'calculator' && !categoryId) {
      setActivePane('category');
      setErrorMsg(null);
      return;
    }

    const accounts = listAccounts(store);
    const accountId =
      existingTx?.accountId ||
      accounts[0]?.id ||
      addAccount(store, {
        id: 'acc-checking',
        name: 'Main Account',
        type: 'checking',
        openingBalance: 0,
      });

    const finalCatId =
      categoryId ||
      (kind === 'income' ? 'cat-other-income' : 'cat-other-expense');
    const finalCat = getCategoryById(store, finalCatId);
    const finalSub =
      subcategory ||
      finalCat?.subcategories[0] ||
      (kind === 'income' ? finalCat?.name ?? 'Other' : 'Other');

    if (existingTx) {
      updateTransaction(store, existingTx.id, {
        accountId,
        categoryId: finalCatId,
        subcategory: finalSub,
        kind,
        amount: cents,
        date,
        note,
      });
    } else {
      addTransaction(store, {
        accountId,
        categoryId: finalCatId,
        subcategory: finalSub,
        kind,
        amount: cents,
        date,
        note,
      });
    }

    router.back();
  };

  const displayAmount = getCalculatorDisplayAmount(calcState);
  const bottomButtonLabel =
    activePane === 'calculator' && !isEditing ? 'Confirm' : 'Save';

  return (
    <View style={styles.backdrop}>
      <Pressable style={styles.dismissTop} onPress={() => router.back()} />

      <View
        style={[
          styles.sheet,
          {
            backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
            borderColor: colors.border,
          },
        ]}
      >
        {/* Top Handle & Optional Delete Icon */}
        <View style={styles.handleBar}>
          <View style={styles.handleSpacer} />
          <View
            style={[
              styles.dragPill,
              { backgroundColor: isDark ? '#48484A' : '#D1D5DB' },
            ]}
          />
          <View style={styles.handleRight}>
            {isEditing ? (
              <Pressable
                onPress={handleDelete}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.trashCircle,
                  {
                    backgroundColor: isDark ? '#2C2C2E' : '#F4F4F5',
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Delete transaction"
              >
                <AppIcon name="trash" size={18} color={colors.textSecondary} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Amount Display Area */}
        <Pressable
          onPress={() => setActivePane('calculator')}
          style={[styles.amountArea, { borderBottomColor: colors.border }]}
        >
          {activePane === 'calculator' ? (
            <Text style={[styles.exprText, { color: colors.textMuted }]}>
              {calcState.expression}
            </Text>
          ) : null}
          <Text
            style={[
              styles.amountValue,
              {
                color:
                  getCalculatorCents(calcState) > 0
                    ? colors.text
                    : colors.textMuted,
              },
            ]}
          >
            {displayAmount}
          </Text>
          {errorMsg ? (
            <Text style={[styles.errorText, { color: colors.expense }]}>
              {errorMsg}
            </Text>
          ) : null}
        </Pressable>

        {/* Row 1: Category > Subcategory */}
        <Pressable
          onPress={() => setActivePane('category')}
          style={[styles.fieldRow, { borderBottomColor: colors.border }]}
        >
          {selectedCategory ? (
            <CategoryBadge
              icon={selectedCategory.icon}
              color={selectedCategory.color}
              size={38}
            />
          ) : (
            <CategoryBadge
              icon="question"
              color={isDark ? '#D4D4D8' : '#E4E4E7'}
              size={38}
            />
          )}
          <Text style={[styles.fieldTextPrimary, { color: colors.text }]}>
            {categoryTitle}
          </Text>
        </Pressable>

        {/* Row 2: Date */}
        <Pressable
          onPress={() => setDatePickerOpen(true)}
          style={[styles.fieldRow, { borderBottomColor: colors.border }]}
        >
          <View style={styles.fieldIconBox}>
            <AppIcon name="calendar" size={20} color={colors.textMuted} />
          </View>
          <Text style={[styles.fieldTextSecondary, { color: colors.textSecondary }]}>
            {formatDisplayDate(date)}
          </Text>
        </Pressable>

        {/* Row 3: Note */}
        <View style={[styles.fieldRow, { borderBottomColor: colors.border }]}>
          <View style={styles.fieldIconBox}>
            <AppIcon name="note" size={20} color={colors.textMuted} />
          </View>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Note"
            placeholderTextColor={colors.textMuted}
            style={[styles.noteInput, { color: colors.text }]}
          />
        </View>

        {/* Lower Dynamic Area: Category Grid OR Calculator Keypad */}
        <View style={styles.lowerArea}>
          {activePane === 'category' ? (
            <View style={styles.categoryPane}>
              {/* Expense | Income Segmented Pill */}
              <View
                style={[
                  styles.segmentTrack,
                  { backgroundColor: isDark ? '#48484A' : '#E5E7EB' },
                ]}
              >
                {(['expense', 'income'] as const).map((k) => {
                  const active = kind === k;
                  return (
                    <Pressable
                      key={k}
                      onPress={() => setKind(k)}
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
                        {k === 'expense' ? 'Expense' : 'Income'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Subcategory Chip Bar (when selected category has multiple subcategories) */}
              {selectedCategory &&
              selectedCategory.kind === kind &&
              selectedCategory.subcategories.length > 1 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.subcatScroll}
                  style={styles.subcatBar}
                >
                  {selectedCategory.subcategories.map((sub) => {
                    const isSubSelected =
                      (subcategory || selectedCategory.subcategories[0]) === sub;
                    return (
                      <Pressable
                        key={sub}
                        onPress={() => setSubcategory(sub)}
                        style={[
                          styles.subcatChip,
                          {
                            backgroundColor: isSubSelected
                              ? colors.primary
                              : isDark
                                ? '#2C2C2E'
                                : '#F4F4F5',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.subcatText,
                            {
                              color: isSubSelected ? '#FFFFFF' : colors.textSecondary,
                            },
                          ]}
                        >
                          {sub}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : null}

              {/* 5-Column Category Icon Grid */}
              <ScrollView
                contentContainerStyle={styles.catGrid}
                showsVerticalScrollIndicator={false}
              >
                {categoriesForKind.map((cat) => {
                  const selected = cat.id === categoryId;
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => handleSelectCategory(cat.id)}
                      style={styles.catGridItem}
                    >
                      <CategoryBadge
                        icon={cat.icon}
                        color={cat.color}
                        size={44}
                        variant={selected ? 'pastel' : 'grid-idle'}
                      />
                      <Text
                        style={[
                          styles.catGridLabel,
                          {
                            color: selected ? colors.primary : colors.text,
                            fontWeight: selected ? '700' : '400',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {cat.name}
                      </Text>
                    </Pressable>
                  );
                })}

                {/* Setting Tile at End of Grid */}
                <Pressable
                  onPress={() => {
                    router.back();
                    setTimeout(() => router.push('/(tabs)/accounts'), 50);
                  }}
                  style={styles.catGridItem}
                >
                  <CategoryBadge
                    icon="settings"
                    color="#3A3A3C"
                    size={44}
                    variant="grid-idle"
                  />
                  <Text
                    style={[styles.catGridLabel, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    Setting
                  </Text>
                </Pressable>
              </ScrollView>
            </View>
          ) : activePane === 'calculator' ? (
            <View style={styles.calcPad}>
              {[
                ['7', '8', '9', '÷'],
                ['4', '5', '6', '×'],
                ['1', '2', '3', '-'],
                ['.', '0', 'backspace', '+'],
              ].map((row, rIdx) => (
                <View key={rIdx} style={styles.calcRow}>
                  {row.map((key) => {
                    const isOperator =
                      key === '÷' || key === '×' || key === '-' || key === '+';
                    return (
                      <View key={key} style={styles.calcCell}>
                        <Pressable
                          onPress={() => {
                            setErrorMsg(null);
                            setCalcState((s) => stepCalculator(s, key));
                          }}
                          style={({ pressed }) => [
                            isOperator ? styles.calcOpCircle : styles.calcNumBtn,
                            isOperator && {
                              backgroundColor: isDark ? '#3A3A3C' : '#E5E7EB',
                            },
                            { opacity: pressed ? 0.65 : 1 },
                          ]}
                        >
                          {key === 'backspace' ? (
                            <AppIcon
                              name="backspace"
                              size={22}
                              color={colors.text}
                            />
                          ) : (
                            <Text
                              style={[
                                styles.calcKeyText,
                                {
                                  color: colors.text,
                                  fontSize: isOperator ? 24 : 21,
                                },
                              ]}
                            >
                              {key === '-' ? '−' : key}
                            </Text>
                          )}
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          ) : (
            <Pressable
              style={styles.emptyLowerArea}
              onPress={() => setActivePane('category')}
            />
          )}
        </View>

        {/* Bottom Full-Width Golden-Orange Action Bar */}
        <Pressable
          onPress={handleBottomConfirmOrSave}
          style={({ pressed }) => [
            styles.bottomBar,
            {
              backgroundColor: colors.primary,
              opacity: pressed ? 0.88 : 1,
            },
          ]}
        >
          <Text style={styles.bottomBarText}>{bottomButtonLabel}</Text>
        </Pressable>
      </View>

      <DatePickerModal
        visible={datePickerOpen}
        initialDate={date}
        onCancel={() => setDatePickerOpen(false)}
        onConfirm={(nextDate) => {
          setDate(nextDate);
          setDatePickerOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  dismissTop: {
    height: 36,
  },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
  },
  handleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  handleSpacer: {
    width: 36,
  },
  dragPill: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  handleRight: {
    width: 36,
    alignItems: 'flex-end',
  },
  trashCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountArea: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  exprText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    fontVariant: ['tabular-nums'],
  },
  amountValue: {
    fontSize: 40,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.6,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    height: 58,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fieldIconBox: {
    width: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldTextPrimary: {
    fontSize: 15.5,
    fontWeight: '500',
  },
  fieldTextSecondary: {
    fontSize: 15,
    fontWeight: '400',
  },
  noteInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  lowerArea: {
    flex: 1,
  },
  emptyLowerArea: {
    flex: 1,
  },
  categoryPane: {
    flex: 1,
    paddingTop: 14,
  },
  segmentTrack: {
    flexDirection: 'row',
    width: '72%',
    alignSelf: 'center',
    borderRadius: 9,
    padding: 2,
    marginBottom: 12,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  subcatBar: {
    maxHeight: 40,
    marginBottom: 8,
  },
  subcatScroll: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  subcatChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  subcatText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 20,
  },
  catGridItem: {
    width: '20%',
    alignItems: 'center',
    marginBottom: 18,
    paddingHorizontal: 2,
  },
  catGridLabel: {
    fontSize: 11.5,
    marginTop: 6,
    textAlign: 'center',
  },
  calcPad: {
    flex: 1,
    justifyContent: 'space-evenly',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  calcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  calcCell: {
    width: '25%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calcNumBtn: {
    width: 64,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
  },
  calcOpCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calcKeyText: {
    fontWeight: '500',
  },
  bottomBar: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
