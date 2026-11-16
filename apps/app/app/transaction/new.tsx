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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  addAccount,
  addTransaction,
  createCalculatorState,
  deleteTransaction,
  formatAmountPlain,
  formatDisplayDate,
  getAccountBalances,
  getAccountById,
  getCalculatorCents,
  getCalculatorDisplayAmount,
  getCategoryById,
  getTransactionById,
  listCategories,
  stepCalculator,
  updateTransaction,
  type AccountType,
  type CategoryKind,
} from '@mm/core';
import { useVault } from '../../src/data/VaultContext';
import { DatePickerModal } from '../../src/ui/DatePickerModal';
import { AppIcon, CategoryBadge } from '../../src/ui/icons';
import { radius, useTheme } from '../../src/ui/theme';

type ActivePane = 'none' | 'calculator' | 'category' | 'subcategory' | 'account';

export default function TransactionSheetScreen() {
  const { store } = useVault();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    date?: string;
    kind?: string;
    categoryId?: string;
    subcategory?: string;
    accountId?: string;
  }>();

  const existingTx = useMemo(
    () => (params.id ? getTransactionById(store, String(params.id)) : undefined),
    [store, params.id]
  );
  const isEditing = Boolean(existingTx);

  const accountsWithBalances = getAccountBalances(store);
  const defaultAccountId =
    existingTx?.accountId ||
    (params.accountId ? String(params.accountId) : '') ||
    accountsWithBalances[0]?.id ||
    'acc-checking';

  const initialDate =
    existingTx?.date ||
    (params.date && /^\d{4}-\d{2}-\d{2}$/.test(String(params.date))
      ? String(params.date)
      : new Date().toISOString().slice(0, 10));

  const [kind, setKind] = useState<CategoryKind>(() => {
    if (existingTx?.kind === 'income' || existingTx?.kind === 'expense') {
      return existingTx.kind;
    }
    if (params.kind === 'income') return 'income';
    return 'expense';
  });
  const [accountId, setAccountId] = useState<string>(defaultAccountId);
  const [categoryId, setCategoryId] = useState<string>(
    () => existingTx?.categoryId ?? (params.categoryId ? String(params.categoryId) : '')
  );
  const [subcategory, setSubcategory] = useState<string>(
    () => existingTx?.subcategory ?? (params.subcategory ? String(params.subcategory) : '')
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

  // Quick inline account creation inside the Account picker pane
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<AccountType>('checking');

  const categoriesForKind = listCategories(store, kind);
  const selectedCategory = categoryId
    ? getCategoryById(store, categoryId)
    : undefined;
  const selectedAccount =
    accountsWithBalances.find((a) => a.id === accountId) ||
    getAccountById(store, accountId);

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
    const firstSub =
      cat.subcategories[0] ?? (cat.kind === 'income' ? cat.name : 'Other');
    setSubcategory(firstSub);
    setErrorMsg(null);

    // Option A: If this category has multiple subcategories, immediately reveal the Subcategory Grid Picker
    if (cat.subcategories.length > 1) {
      setActivePane('subcategory');
    }
  };

  const handleSelectSubcategory = (sub: string) => {
    setSubcategory(sub);
    setErrorMsg(null);
  };

  const handleQuickCreateAccount = () => {
    const trimmed = newAccName.trim();
    if (!trimmed) return;
    const createdId = addAccount(store, {
      name: trimmed,
      type: newAccType,
      openingBalance: 0,
    });
    setAccountId(createdId);
    setNewAccName('');
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

    const ensuredAccountId =
      (selectedAccount && selectedAccount.id) ||
      accountsWithBalances[0]?.id ||
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
        accountId: ensuredAccountId,
        categoryId: finalCatId,
        subcategory: finalSub,
        kind,
        amount: cents,
        date,
        note,
      });
    } else {
      addTransaction(store, {
        accountId: ensuredAccountId,
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
    activePane === 'calculator' && !isEditing && !categoryId
      ? 'Confirm'
      : 'Save';

  const accountRolePrefix = kind === 'income' ? 'Deposit to' : 'Pay from';
  const accountDisplayName = selectedAccount?.name ?? 'Main Account';

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
        {/* Top Handle & Discard / Optional Delete Icon */}
        <View style={styles.handleBar}>
          <View style={styles.handleLeft}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              style={({ pressed }) => [
                styles.iconCircle,
                {
                  backgroundColor: isDark ? '#2C2C2E' : '#F4F4F5',
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Discard transaction"
              testID="discard-transaction-button"
            >
              <AppIcon name="close" size={18} color={colors.text} />
            </Pressable>
          </View>
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
                  styles.iconCircle,
                  {
                    backgroundColor: isDark ? '#2C2C2E' : '#F4F4F5',
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Delete transaction"
                testID="delete-transaction-button"
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
                    ? kind === 'income'
                      ? colors.income
                      : colors.text
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
          onPress={() => {
            if (
              selectedCategory &&
              selectedCategory.subcategories.length > 1 &&
              activePane === 'category'
            ) {
              setActivePane('subcategory');
            } else {
              setActivePane('category');
            }
          }}
          style={[styles.fieldRow, { borderBottomColor: colors.border }]}
        >
          {selectedCategory ? (
            <CategoryBadge
              icon={selectedCategory.icon}
              color={selectedCategory.color}
              size={36}
            />
          ) : (
            <CategoryBadge
              icon="question"
              color={isDark ? '#D4D4D8' : '#E4E4E7'}
              size={36}
            />
          )}
          <Text
            style={[styles.fieldTextPrimary, { color: colors.text, flex: 1 }]}
            numberOfLines={1}
          >
            {categoryTitle}
          </Text>
          {selectedCategory && selectedCategory.subcategories.length > 1 ? (
            <Pressable
              onPress={() => setActivePane('subcategory')}
              hitSlop={10}
              style={({ pressed }) => ({
                paddingLeft: 8,
                opacity: pressed ? 0.65 : 1,
              })}
              accessibilityRole="button"
              accessibilityLabel="Choose subcategory"
            >
              <AppIcon
                name="chevron-right"
                size={16}
                color={colors.textMuted}
              />
            </Pressable>
          ) : null}
        </Pressable>

        {/* Row 2: Compact 2-Column Split Row (Date | Account) */}
        <View style={[styles.splitFieldRow, { borderBottomColor: colors.border }]}>
          <Pressable
            onPress={() => setDatePickerOpen(true)}
            style={({ pressed }) => [
              styles.splitHalfLeft,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={styles.fieldIconBox}>
              <AppIcon name="calendar" size={19} color={colors.textMuted} />
            </View>
            <Text
              style={[styles.fieldTextSecondary, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {formatDisplayDate(date)}
            </Text>
          </Pressable>

          <View
            style={[
              styles.splitDivider,
              { backgroundColor: colors.border },
            ]}
          />

          <Pressable
            onPress={() =>
              setActivePane((p) => (p === 'account' ? 'category' : 'account'))
            }
            style={({ pressed }) => [
              styles.splitHalfRight,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <AppIcon
              name="banknotes"
              size={18}
              color={kind === 'income' ? colors.income : colors.primary}
            />
            <View style={styles.splitAccountMeta}>
              <Text
                style={[styles.accountRoleText, { color: colors.textMuted }]}
                numberOfLines={1}
              >
                {accountRolePrefix}
              </Text>
              <Text
                style={[styles.accountNameText, { color: colors.text }]}
                numberOfLines={1}
              >
                {accountDisplayName}
              </Text>
            </View>
            <AppIcon
              name="chevron-right"
              size={14}
              color={colors.textMuted}
            />
          </Pressable>
        </View>

        {/* Row 4: Note */}
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

        {/* Lower Dynamic Area: Category Grid | Subcategory Grid | Account Picker | Calculator */}
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
          ) : activePane === 'subcategory' && selectedCategory ? (
            <View style={styles.subcatPane}>
              <View
                style={[
                  styles.subcatHeader,
                  { borderBottomColor: colors.border },
                ]}
              >
                <Pressable
                  onPress={() => setActivePane('category')}
                  hitSlop={8}
                  style={styles.backToCatsBtn}
                >
                  <AppIcon name="chevron-left" size={18} color={colors.primary} />
                  <Text style={[styles.backToCatsText, { color: colors.primary }]}>
                    Categories
                  </Text>
                </Pressable>

                <View style={styles.subcatTitleCenter}>
                  <CategoryBadge
                    icon={selectedCategory.icon}
                    color={selectedCategory.color}
                    size={26}
                  />
                  <Text style={[styles.subcatHeaderTitle, { color: colors.text }]}>
                    {selectedCategory.name}
                  </Text>
                </View>

                <View style={{ width: 88 }} />
              </View>

              <ScrollView
                contentContainerStyle={styles.subcatGrid}
                showsVerticalScrollIndicator={false}
              >
                {selectedCategory.subcategories.map((sub) => {
                  const isSubSelected =
                    (subcategory || selectedCategory.subcategories[0]) === sub;
                  return (
                    <Pressable
                      key={sub}
                      onPress={() => handleSelectSubcategory(sub)}
                      style={({ pressed }) => [
                        styles.subcatCard,
                        {
                          backgroundColor: isSubSelected
                            ? colors.primary
                            : isDark
                              ? '#262629'
                              : '#F4F4F5',
                          borderColor: isSubSelected
                            ? colors.primary
                            : colors.border,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.subcatCardText,
                          {
                            color: isSubSelected ? '#FFFFFF' : colors.text,
                            fontWeight: isSubSelected ? '700' : '500',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {sub}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : activePane === 'account' ? (
            <View style={styles.accountPane}>
              <View
                style={[
                  styles.subcatHeader,
                  { borderBottomColor: colors.border },
                ]}
              >
                <Text style={[styles.accountPaneTitle, { color: colors.text }]}>
                  {kind === 'income'
                    ? 'Select Account to Deposit Income Into'
                    : 'Select Account to Pay Expense From'}
                </Text>
                <Pressable
                  onPress={() => {
                    router.back();
                    setTimeout(() => router.push('/(tabs)/accounts'), 50);
                  }}
                >
                  <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>
                    Manage
                  </Text>
                </Pressable>
              </View>

              <ScrollView
                contentContainerStyle={styles.accountListContent}
                showsVerticalScrollIndicator={false}
              >
                {accountsWithBalances.map((acc) => {
                  const isSelected = acc.id === accountId;
                  return (
                    <Pressable
                      key={acc.id}
                      onPress={() => {
                        setAccountId(acc.id);
                        setActivePane('category');
                      }}
                      style={({ pressed }) => [
                        styles.accountOptionRow,
                        {
                          backgroundColor: isSelected
                            ? isDark
                              ? 'rgba(243,168,51,0.14)'
                              : 'rgba(243,168,51,0.1)'
                            : isDark
                              ? '#242426'
                              : '#F9FAFB',
                          borderColor: isSelected ? colors.primary : colors.border,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <View>
                        <Text
                          style={[
                            styles.accountOptionName,
                            {
                              color: isSelected ? colors.primary : colors.text,
                            },
                          ]}
                        >
                          {acc.name}
                        </Text>
                        <Text
                          style={[
                            styles.accountOptionType,
                            { color: colors.textMuted },
                          ]}
                        >
                          {acc.type.toUpperCase()}
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.accountOptionBal,
                          {
                            color:
                              acc.balance >= 0 ? colors.income : colors.expense,
                          },
                        ]}
                      >
                        {formatAmountPlain(acc.balance)}
                      </Text>
                    </Pressable>
                  );
                })}

                {/* Quick Inline New Account Creator */}
                <View
                  style={[
                    styles.quickAccountBox,
                    {
                      backgroundColor: isDark ? '#222225' : '#F4F4F5',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.quickAccountTitle,
                      { color: colors.textSecondary },
                    ]}
                  >
                    + Quick Add Account
                  </Text>
                  <View style={styles.quickAccountInputRow}>
                    <TextInput
                      value={newAccName}
                      onChangeText={setNewAccName}
                      placeholder="Account name (e.g. DBS, Cash)"
                      placeholderTextColor={colors.textMuted}
                      style={[
                        styles.quickAccountInput,
                        {
                          backgroundColor: isDark ? '#18181A' : '#FFFFFF',
                          color: colors.text,
                          borderColor: colors.border,
                        },
                      ]}
                    />
                    <Pressable
                      onPress={handleQuickCreateAccount}
                      style={[
                        styles.quickAccountAddBtn,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text style={styles.quickAccountAddBtnText}>Add</Text>
                    </Pressable>
                  </View>
                  <View style={styles.quickAccountTypes}>
                    {(['checking', 'savings', 'cash', 'credit'] as const).map(
                      (t) => (
                        <Pressable
                          key={t}
                          onPress={() => setNewAccType(t)}
                          style={[
                            styles.quickTypeChip,
                            {
                              backgroundColor:
                                newAccType === t
                                  ? colors.primary
                                  : isDark
                                    ? '#2C2C2E'
                                    : '#E5E7EB',
                            },
                          ]}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '600',
                              color:
                                newAccType === t
                                  ? '#FFFFFF'
                                  : colors.textSecondary,
                            }}
                          >
                            {t.toUpperCase()}
                          </Text>
                        </Pressable>
                      )
                    )}
                  </View>
                </View>
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
              height: 52 + insets.bottom,
              paddingBottom: insets.bottom,
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
    height: 32,
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
  handleLeft: {
    width: 36,
    alignItems: 'flex-start',
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
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountArea: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  exprText: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
    fontVariant: ['tabular-nums'],
  },
  amountValue: {
    fontSize: 38,
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
    height: 48,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  splitFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    height: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  splitHalfLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 10,
    height: '100%',
  },
  splitDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
  },
  splitHalfRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 12,
    height: '100%',
  },
  splitAccountMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  fieldIconBox: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldTextPrimary: {
    fontSize: 15,
    fontWeight: '500',
  },
  fieldTextSecondary: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
  },
  accountRoleText: {
    fontSize: 10.5,
    fontWeight: '500',
  },
  accountNameText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  noteInput: {
    flex: 1,
    fontSize: 14.5,
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
    paddingTop: 12,
  },
  segmentTrack: {
    flexDirection: 'row',
    width: '72%',
    alignSelf: 'center',
    borderRadius: 9,
    padding: 2,
    marginBottom: 10,
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
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 20,
  },
  catGridItem: {
    width: '20%',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  catGridLabel: {
    fontSize: 11.5,
    marginTop: 5,
    textAlign: 'center',
  },
  subcatPane: {
    flex: 1,
  },
  subcatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backToCatsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 88,
  },
  backToCatsText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  subcatTitleCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subcatHeaderTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  subcatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 14,
    gap: 10,
  },
  subcatCard: {
    width: '48%',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subcatCardText: {
    fontSize: 14,
  },
  accountPane: {
    flex: 1,
  },
  accountPaneTitle: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  accountListContent: {
    padding: 14,
    gap: 10,
  },
  accountOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  accountOptionName: {
    fontSize: 15,
    fontWeight: '600',
  },
  accountOptionType: {
    fontSize: 11.5,
    marginTop: 2,
  },
  accountOptionBal: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  quickAccountBox: {
    marginTop: 6,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickAccountTitle: {
    fontSize: 12.5,
    fontWeight: '600',
    marginBottom: 8,
  },
  quickAccountInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickAccountInput: {
    flex: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13.5,
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickAccountAddBtn: {
    paddingHorizontal: 14,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAccountAddBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '600',
  },
  quickAccountTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  quickTypeChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  calcPad: {
    flex: 1,
    justifyContent: 'space-evenly',
    paddingHorizontal: 12,
    paddingVertical: 6,
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
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  calcOpCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
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
