import { describe, expect, it } from 'vitest';
import {
  addAccount,
  addCategory,
  addTransaction,
  buildCalendarMonthGrid,
  centsToDecimalString,
  computeDonutSlices,
  createAppStore,
  createCalculatorState,
  deleteTransaction,
  exportBackupZip,
  formatAmountPlain,
  formatCents,
  formatDayCardHeader,
  formatDisplayDate,
  formatPickerBannerDate,
  formatTransactionTitle,
  getAccountBalances,
  getBudgetStatuses,
  getCalculatorCents,
  getCalculatorDisplayAmount,
  getCategoryBreakdown,
  getCategoryById,
  getDailyCalendarTotals,
  getMonthDateRange,
  getMonthlySummary,
  getNetWorth,
  getPeriodSummary,
  getSubcategoryBreakdown,
  getThemeMode,
  getWeekDateRange,
  importBackupZip,
  listCategories,
  listTransactions,
  parseToCents,
  seedDefaultData,
  setBudget,
  setThemeMode,
  shiftYearMonth,
  stepCalculator,
  updateTransaction,
  uuidv7,
} from './index';

describe('@mm/core', () => {
  it('generates chronologically sortable UUIDv7 identifiers', () => {
    const id1 = uuidv7(1700000000000);
    const id2 = uuidv7(1700000001000);
    expect(id1 < id2).toBe(true);
    expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('parses and formats integer cents accurately without floating point drift', () => {
    expect(parseToCents('19.99')).toBe(1999);
    expect(parseToCents('0.10')).toBe(10);
    expect(parseToCents('0.20')).toBe(20);
    expect(parseToCents('0.10') + parseToCents('0.20')).toBe(30);
    expect(parseToCents('$1,234.56')).toBe(123456);
    expect(parseToCents('-42.5')).toBe(-4250);
    expect(formatCents(123456, 'USD')).toBe('$1,234.56');
    expect(centsToDecimalString(123456)).toBe('1234.56');
    expect(centsToDecimalString(-50)).toBe('-0.50');

    // Reference UI plain number formatting
    expect(formatAmountPlain(0)).toBe('0');
    expect(formatAmountPlain(391100)).toBe('3,911');
    expect(formatAmountPlain(377310)).toBe('3,773.1');
    expect(formatAmountPlain(425486)).toBe('4,254.86');
    expect(formatAmountPlain(730)).toBe('7.3');
    expect(formatAmountPlain(5245)).toBe('52.45');
  });

  it('computes account balances, transfers, budgets, and monthly summaries', () => {
    const store = createAppStore('test-node');
    const checkingId = addAccount(store, {
      name: 'Checking',
      type: 'checking',
      openingBalance: 100000, // $1,000.00
    });
    const savingsId = addAccount(store, {
      name: 'Savings',
      type: 'savings',
      openingBalance: 500000, // $5,000.00
    });
    const foodId = addCategory(store, {
      name: 'Food',
      kind: 'expense',
      subcategories: ['Eating out', 'Drink', 'Grocery'],
    });
    const salaryId = addCategory(store, {
      name: 'Salary',
      kind: 'income',
      subcategories: ['Salary'],
    });

    // Income +$2,000.00 to Checking
    addTransaction(store, {
      accountId: checkingId,
      categoryId: salaryId,
      subcategory: 'Salary',
      kind: 'income',
      amount: 200000,
      date: '2026-11-05',
      note: 'Paycheck',
    });

    // Expense -$150.00 from Checking
    const txFood = addTransaction(store, {
      accountId: checkingId,
      categoryId: foodId,
      subcategory: 'Eating out',
      kind: 'expense',
      amount: 15000,
      date: '2026-11-06',
      note: 'Supermarket',
    });

    // Transfer $500.00 from Checking to Savings
    addTransaction(store, {
      accountId: checkingId,
      toAccountId: savingsId,
      kind: 'transfer',
      amount: 50000,
      date: '2026-11-07',
      note: 'Save',
    });

    const balances = getAccountBalances(store);
    const checking = balances.find((a) => a.id === checkingId)!;
    const savings = balances.find((a) => a.id === savingsId)!;

    expect(checking.balance).toBe(100000 + 200000 - 15000 - 50000); // 235000
    expect(savings.balance).toBe(500000 + 50000); // 550000
    expect(getNetWorth(store)).toBe(235000 + 550000);

    const summary = getMonthlySummary(store, '2026-11');
    expect(summary.income).toBe(200000);
    expect(summary.expense).toBe(15000);
    expect(summary.net).toBe(185000);

    // Budget status
    setBudget(store, { categoryId: foodId, month: '2026-11', limitAmount: 40000 });
    const budgets = getBudgetStatuses(store, '2026-11');
    expect(budgets).toHaveLength(1);
    expect(budgets[0].spent).toBe(15000);
    expect(budgets[0].remaining).toBe(25000);

    // Update & delete
    updateTransaction(store, txFood, { amount: 20000 });
    expect(getCategoryBreakdown(store, '2026-11')[0].amount).toBe(20000);

    deleteTransaction(store, txFood);
    expect(listTransactions(store, { month: '2026-11', kind: 'expense' })).toHaveLength(0);
  });

  it('seeds 17 expense + 5 income reference categories, subcategories, calendar totals, and period breakdowns', () => {
    const store = createAppStore('node-ref');
    seedDefaultData(store);

    const expenseCats = listCategories(store, 'expense');
    const incomeCats = listCategories(store, 'income');
    expect(expenseCats).toHaveLength(17);
    expect(incomeCats).toHaveLength(5);

    // Theme mode defaults to dark and can toggle to light
    expect(getThemeMode(store)).toBe('dark');
    setThemeMode(store, 'light');
    expect(getThemeMode(store)).toBe('light');

    // Add Food > Eating out and Food > Drink transactions
    const tx1 = addTransaction(store, {
      accountId: 'acc-checking',
      categoryId: 'cat-food',
      subcategory: 'Eating out',
      kind: 'expense',
      amount: 16715,
      date: '2026-11-13',
      note: 'ikea dinner',
    });
    addTransaction(store, {
      accountId: 'acc-checking',
      categoryId: 'cat-food',
      subcategory: 'Drink',
      kind: 'expense',
      amount: 4410,
      date: '2026-11-12',
      note: 'bubble tea',
    });
    const txIncome = addTransaction(store, {
      accountId: 'acc-checking',
      categoryId: 'cat-salary',
      subcategory: 'Salary',
      kind: 'income',
      amount: 391100,
      date: '2026-11-20',
    });

    const foodCat = getCategoryById(store, 'cat-food');
    const salaryCat = getCategoryById(store, 'cat-salary');
    const allTxs = listTransactions(store);
    const eatingOutTx = allTxs.find((t) => t.id === tx1)!;
    const salaryTx = allTxs.find((t) => t.id === txIncome)!;

    expect(formatTransactionTitle(foodCat, eatingOutTx)).toBe('Food > Eating out');
    expect(formatTransactionTitle(salaryCat, salaryTx)).toBe('income > Salary');

    // Subcategory breakdown for Food includes active and 0-amount subcategories
    const subBreakdown = getSubcategoryBreakdown(store, 'cat-food', '2026-11-01', '2026-11-30');
    expect(subBreakdown[0]).toMatchObject({ subcategory: 'Eating out', amount: 16715 });
    expect(subBreakdown[1]).toMatchObject({ subcategory: 'Drink', amount: 4410 });
    expect(subBreakdown.find((s) => s.subcategory === 'Grocery')?.amount).toBe(0);

    // Weekly period summary (10 Nov to 16 Nov)
    const weekSummary = getPeriodSummary(store, '2026-11-10', '2026-11-16');
    expect(weekSummary.expense).toBe(16715 + 4410);
    expect(weekSummary.income).toBe(0);

    // Daily calendar totals
    const calTotals = getDailyCalendarTotals(store, '2026-11-01', '2026-11-30');
    expect(calTotals['2026-11-13']).toEqual({ date: '2026-11-13', income: 0, expense: 16715 });
    expect(calTotals['2026-11-20']).toEqual({ date: '2026-11-20', income: 391100, expense: 0 });
  });

  it('exports to CSV ZIP and restores in both replace and merge modes including subcategories', () => {
    const source = createAppStore('node-a');
    seedDefaultData(source);
    const txId = addTransaction(source, {
      accountId: 'acc-checking',
      categoryId: 'cat-food',
      subcategory: 'Eating out',
      kind: 'expense',
      amount: 5245,
      date: '2026-11-13',
      note: 'ikea dinner',
    });

    const zipBytes = exportBackupZip(source);
    expect(zipBytes.byteLength).toBeGreaterThan(100);

    // Restore in replace mode onto a store that had extra data
    const destReplace = createAppStore('node-b');
    addAccount(destReplace, { id: 'acc-temp', name: 'Temporary', type: 'cash', openingBalance: 999 });
    importBackupZip(destReplace, zipBytes, 'replace');
    expect(destReplace.hasRow('accounts', 'acc-temp')).toBe(false);
    const restoredTx = listTransactions(destReplace).find((t) => t.id === txId);
    expect(restoredTx).toBeDefined();
    expect(restoredTx?.subcategory).toBe('Eating out');

    // Restore in merge mode onto a store that has an extra account
    const destMerge = createAppStore('node-c');
    addAccount(destMerge, { id: 'acc-extra', name: 'Extra Cash', type: 'cash', openingBalance: 5000 });
    importBackupZip(destMerge, zipBytes, 'merge');
    expect(destMerge.hasRow('accounts', 'acc-extra')).toBe(true);
    expect(listTransactions(destMerge).map((t) => t.id)).toContain(txId);
  });

  it('computes SVG donut chart slices, calendar month grids, and period date ranges accurately', () => {
    // 0-value case
    const emptyDonut = computeDonutSlices([]);
    expect(emptyDonut.total).toBe(0);
    expect(emptyDonut.slices).toHaveLength(0);

    // Single 100% slice case (Salary screenshot)
    const singleDonut = computeDonutSlices([
      { id: 'cat-salary', label: 'Salary', value: 423293, color: '#FCE07D' },
    ]);
    expect(singleDonut.isSingleFullRing).toBe(true);
    expect(singleDonut.slices).toHaveLength(1);
    expect(singleDonut.slices[0].percentage).toBe(100);
    expect(singleDonut.slices[0].pathData).toContain('A 95 95');

    // Multi-slice case (Food, Online shopping, Transportation)
    const multiDonut = computeDonutSlices([
      { id: 'cat-food', label: 'Food', value: 21125, color: '#F29B9B' },
      { id: 'cat-online', label: 'Online shopping', value: 14646, color: '#D29BF2' },
      { id: 'cat-transport', label: 'Transportation', value: 12405, color: '#9BAEF2' },
    ]);
    expect(multiDonut.isSingleFullRing).toBe(false);
    expect(multiDonut.slices).toHaveLength(3);
    expect(multiDonut.slices[0].startAngleDeg).toBe(0);
    expect(Math.round(multiDonut.slices[2].endAngleDeg)).toBe(360);

    // Date and period formatting
    const novRange = getMonthDateRange('2026-11');
    expect(novRange.monthLabel).toBe('Nov');
    expect(novRange.rangeLabel).toBe('01/11 - 30/11');
    expect(novRange.startDate).toBe('2026-11-01');
    expect(novRange.endDate).toBe('2026-11-30');
    expect(shiftYearMonth('2026-11', -1)).toBe('2026-10');
    expect(shiftYearMonth('2026-12', 1)).toBe('2027-01');

    const weekRange = getWeekDateRange('2026-11-16');
    expect(weekRange.startDate).toBe('2026-11-16');
    expect(weekRange.endDate).toBe('2026-11-22');
    expect(weekRange.rangeLabel).toBe('16/11 - 22/11');

    // 42-cell Monday-first calendar grid for Nov 2026 (Nov 1 2026 is Sunday -> 6 leading Oct days: Oct 26..31)
    const grid = buildCalendarMonthGrid('2026-11', true);
    expect(grid).toHaveLength(42);
    expect(grid[0]).toEqual({ date: '2026-10-26', dayNumber: 26, inCurrentMonth: false });
    expect(grid[6]).toEqual({ date: '2026-11-01', dayNumber: 1, inCurrentMonth: true });

    expect(formatDayCardHeader('2026-11-13')).toBe('13 Nov (Fri)');
    expect(formatDisplayDate('2026-11-20')).toBe('20 Nov 2026');
    expect(formatPickerBannerDate('2026-11-20')).toBe('Fri, 20 Nov');
  });

  it('evaluates calculator keypad expressions, decimals, backspace, and operators accurately', () => {
    let state = createCalculatorState(0);
    expect(getCalculatorCents(state)).toBe(0);
    expect(getCalculatorDisplayAmount(state)).toBe('0');

    // Type 52.45
    for (const k of ['5', '2', '.', '4', '5']) {
      state = stepCalculator(state, k);
    }
    expect(state.expression).toBe('52.45');
    expect(getCalculatorCents(state)).toBe(5245);
    expect(getCalculatorDisplayAmount(state)).toBe('52.45');

    // Add 7.3 -> 59.75
    for (const k of ['+', '7', '.', '3', 'confirm']) {
      state = stepCalculator(state, k);
    }
    expect(getCalculatorCents(state)).toBe(5975);
    expect(getCalculatorDisplayAmount(state)).toBe('59.75');

    // Backspace from 59.75 -> 59.7
    state = stepCalculator(state, 'backspace');
    expect(getCalculatorCents(state)).toBe(5970);

    // Pre-filled amount (e.g. 3,911 in View/Edit mode)
    const editState = createCalculatorState(391100);
    expect(getCalculatorDisplayAmount(editState)).toBe('3,911');
  });
});
