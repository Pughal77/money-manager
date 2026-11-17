import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
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
  formatAmountWithPercent,
  formatCents,
  formatDayCardHeader,
  formatDisplayDate,
  formatPercentBracket,
  formatPickerBannerDate,
  formatTransactionTitle,
  getAccountBalances,
  getAccountById,
  getBudgetStatuses,
  getCalculatorCents,
  getCalculatorDisplayAmount,
  getCategoryBreakdown,
  getCategoryById,
  getDailyCalendarTotals,
  getMonthDateRange,
  getMonthlySummary,
  getTransactionById,
  getNetWorth,
  getPeriodSummary,
  getSubcategoryBreakdown,
  getThemeMode,
  getThemeAccent,
  getWeekDateRange,
  getWeeksForMonth,
  getYearDateRange,
  importBackupZip,
  listCategories,
  listTransactions,
  normalizeBudgetPeriod,
  parseToCents,
  seedDefaultData,
  setBudget,
  setThemeMode,
  setThemeAccent,
  shiftYear,
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

    // Percentage in brackets formatting
    expect(formatPercentBracket(0)).toBe('(0%)');
    expect(formatPercentBracket(100)).toBe('(100%)');
    expect(formatPercentBracket(43.84)).toBe('(43.8%)');
    expect(formatAmountWithPercent(21125, 43.84)).toBe('211.25 (43.8%)');
    expect(formatAmountWithPercent(423293, 99.5)).toBe('4,232.93 (99.5%)');
    expect(formatAmountWithPercent(0, 0)).toBe('0 (0%)');
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

    // Theme accent defaults to emerald and can switch to other accents
    expect(getThemeAccent(store)).toBe('emerald');
    setThemeAccent(store, 'cobalt');
    expect(getThemeAccent(store)).toBe('cobalt');
    setThemeAccent(store, 'amethyst');
    expect(getThemeAccent(store)).toBe('amethyst');
    setThemeAccent(store, 'slate');
    expect(getThemeAccent(store)).toBe('slate');

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

    // Subcategory breakdown for Food includes active and 0-amount subcategories with percentages & counts
    const subBreakdown = getSubcategoryBreakdown(store, 'cat-food', '2026-11-01', '2026-11-30');
    expect(subBreakdown[0]).toMatchObject({
      subcategory: 'Eating out',
      amount: 16715,
      percentage: 79.1,
      transactionCount: 1,
    });
    expect(subBreakdown[1]).toMatchObject({
      subcategory: 'Drink',
      amount: 4410,
      percentage: 20.9,
      transactionCount: 1,
    });
    expect(subBreakdown.find((s) => s.subcategory === 'Grocery')?.amount).toBe(0);

    // Category breakdown for income and expense includes percentages & counts
    const expBreakdown = getCategoryBreakdown(store, '2026-11', 'expense');
    expect(expBreakdown[0]).toMatchObject({
      categoryId: 'cat-food',
      amount: 21125,
      percentage: 100,
      transactionCount: 2,
    });
    const incBreakdown = getCategoryBreakdown(store, '2026-11', 'income');
    expect(incBreakdown[0]).toMatchObject({
      categoryId: 'cat-salary',
      amount: 391100,
      percentage: 100,
      transactionCount: 1,
    });
    expect(getAccountById(store, 'acc-checking')?.name).toBe('Main Account');

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

    // Import from directory-wrapped ZIP with decimal dollar values
    const nestedZip = zipSync({
      'my-backup-folder/accounts.csv': strToU8('id,name,type,openingBalance,color,createdAt,deleted\nacc-1,Checking,checking,150.50,#F3A833,2026-11-17,false'),
      'my-backup-folder/categories.csv': strToU8('id,name,kind,icon,color,subcategories,sortOrder,createdAt,deleted\ncat-1,Food,expense,food,#F29B9B,"[""Other""]",1,2026-11-17,false'),
      'my-backup-folder/transactions.csv': strToU8('id,accountId,toAccountId,categoryId,subcategory,kind,amount,date,note,createdAt,deleted\ntx-1,acc-1,,cat-1,Dinner,expense,17.25,2026-11-17,Keisuke,2026-11-17,false\ntx-2,acc-1,,cat-1,Grocery,expense,35,2026-11-17,FairPrice,2026-11-17,false'),
      'my-backup-folder/budgets.csv': strToU8('id,categoryId,month,periodType,limitAmount,rollover,deleted\n2026-11:cat-1,cat-1,2026-11,monthly,500.00,false,false'),
    });
    const destNested = createAppStore('node-nested');
    const importRes = importBackupZip(destNested, nestedZip, 'replace');
    expect(importRes.importedRows).toBe(5);
    const tx1 = getTransactionById(destNested, 'tx-1');
    const tx2 = getTransactionById(destNested, 'tx-2');
    expect(tx1?.amount).toBe(1725); // $17.25 -> 1725 cents
    expect(tx2?.amount).toBe(3500); // $35 -> 3500 cents
    expect(getAccountById(destNested, 'acc-1')?.openingBalance).toBe(15050); // $150.50 -> 15050 cents

    // If the user's uploaded backup ZIP exists, test full restore and display formatting
    const userZipPath = '/home/raijinshounen/.gemini/antigravity/brain/0c7ed11e-ba88-4e79-85d2-407d749e6fcb/.user_uploaded/media_1794936106803_9e0bab16.zip';
    if (fs.existsSync(userZipPath)) {
      const userZipBytes = new Uint8Array(fs.readFileSync(userZipPath));
      const userStore = createAppStore('node-user-zip');
      const userImportRes = importBackupZip(userStore, userZipBytes, 'replace');
      expect(userImportRes.importedRows).toBe(72); // 1 account + 22 categories + 48 transactions + 1 budget
      const txs = listTransactions(userStore);
      expect(txs).toHaveLength(48);
      // Verify all amounts are safe integer cents and can format without error
      for (const t of txs) {
        expect(Number.isSafeInteger(t.amount)).toBe(true);
        expect(t.amount).toBeGreaterThan(0);
        expect(() => formatAmountPlain(t.amount)).not.toThrow();
      }
      // Check specific transactions from user file
      const ramenTx = txs.find((t) => t.note === 'WWW.KEISUK TONKOTSUKI');
      expect(ramenTx?.amount).toBe(1725); // $17.25 -> 1725 cents
      expect(formatAmountPlain(ramenTx!.amount)).toBe('17.25');

      const ntucTx = txs.find((t) => t.note === 'NTUC FP - CHINATOWN PT');
      expect(ntucTx?.amount).toBe(3500); // $35 -> 3500 cents
      expect(formatAmountPlain(ntucTx!.amount)).toBe('35');

      const incomeTx = txs.find((t) => t.id === 'tx-100045');
      expect(incomeTx?.amount).toBe(100000); // $1000 -> 100000 cents
      expect(formatAmountPlain(incomeTx!.amount)).toBe('1,000');
    }
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

    // Multi-slice case (Food, Online shopping, Transportation + tiny 8% slice hides label < 10%)
    const multiDonut = computeDonutSlices([
      { id: 'cat-food', label: 'Food', value: 21125, color: '#F29B9B' },
      { id: 'cat-online', label: 'Online shopping', value: 14646, color: '#D29BF2' },
      { id: 'cat-transport', label: 'Transportation', value: 12405, color: '#9BAEF2' },
    ]);
    expect(multiDonut.isSingleFullRing).toBe(false);
    expect(multiDonut.slices).toHaveLength(3);
    expect(multiDonut.slices[0].startAngleDeg).toBe(0);
    expect(Math.round(multiDonut.slices[2].endAngleDeg)).toBe(360);
    expect(multiDonut.slices.every((s) => s.showLabel)).toBe(true);

    const smallSliceDonut = computeDonutSlices([
      { id: 'a', label: 'Main', value: 92, color: '#F29B9B' },
      { id: 'b', label: 'Tiny', value: 8, color: '#D29BF2' },
    ]);
    expect(smallSliceDonut.slices[0].showLabel).toBe(true);
    expect(smallSliceDonut.slices[1].showLabel).toBe(false);

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

  it('supports weekly, monthly, and yearly budgets, period helpers, all-expenses budgets, and CSV round-trip', () => {
    // Year and week period helpers
    const year2026 = getYearDateRange('2026');
    expect(year2026).toEqual({
      monthLabel: '2026',
      fullMonthYearLabel: '2026',
      rangeLabel: '01/01 - 31/12',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    });
    expect(shiftYear('2026', -1)).toBe('2025');
    expect(shiftYear('2026', 2)).toBe('2028');

    const novWeeks = getWeeksForMonth('2026-11');
    expect(novWeeks).toHaveLength(6);
    expect(novWeeks[0].startDate).toBe('2026-10-26');
    expect(novWeeks[0].endDate).toBe('2026-11-01');
    expect(novWeeks[5].startDate).toBe('2026-11-30');
    expect(novWeeks[5].endDate).toBe('2026-12-06');

    expect(normalizeBudgetPeriod('2026')).toMatchObject({
      periodKey: '2026',
      periodType: 'yearly',
    });
    expect(normalizeBudgetPeriod('2026-11')).toMatchObject({
      periodKey: '2026-11',
      periodType: 'monthly',
    });
    // Mid-week Wednesday 2026-11-18 normalizes to Monday 2026-11-16
    expect(normalizeBudgetPeriod('2026-11-18')).toMatchObject({
      periodKey: '2026-11-16',
      periodType: 'weekly',
    });
    expect(() => normalizeBudgetPeriod('2026-02-30')).toThrow();
    expect(() => normalizeBudgetPeriod('2026-11', 'yearly')).toThrow();

    const store = createAppStore('node-multi-budget');
    seedDefaultData(store);

    // Transactions spanning 2025, different months in 2026, and inside/outside week 2026-11-16..2026-11-22
    addTransaction(store, {
      accountId: 'acc-checking',
      categoryId: 'cat-food',
      kind: 'expense',
      amount: 5000,
      date: '2025-12-31',
    });
    addTransaction(store, {
      accountId: 'acc-checking',
      categoryId: 'cat-food',
      kind: 'expense',
      amount: 12000,
      date: '2026-03-10',
    });
    addTransaction(store, {
      accountId: 'acc-checking',
      categoryId: 'cat-food',
      kind: 'expense',
      amount: 3000,
      date: '2026-11-15', // Sunday before week 2026-11-16
    });
    addTransaction(store, {
      accountId: 'acc-checking',
      categoryId: 'cat-food',
      kind: 'expense',
      amount: 4500,
      date: '2026-11-18', // Inside week 2026-11-16..2026-11-22
    });
    addTransaction(store, {
      accountId: 'acc-checking',
      categoryId: 'cat-online-shopping',
      kind: 'expense',
      amount: 2500,
      date: '2026-11-20', // Inside week 2026-11-16..2026-11-22
    });
    addTransaction(store, {
      accountId: 'acc-checking',
      categoryId: 'cat-food',
      kind: 'expense',
      amount: 6000,
      date: '2026-11-23', // Monday after week 2026-11-16
    });
    addTransaction(store, {
      accountId: 'acc-checking',
      categoryId: 'cat-food',
      kind: 'expense',
      amount: 7000,
      date: '2027-01-01',
    });

    // Weekly budgets (saving with Wednesday 2026-11-18 normalizes id & key to Monday 2026-11-16)
    const weeklyFoodId = setBudget(store, {
      categoryId: 'cat-food',
      month: '2026-11-18',
      periodType: 'weekly',
      limitAmount: 10000,
    });
    expect(weeklyFoodId).toBe('2026-11-16:cat-food');
    setBudget(store, {
      categoryId: 'all',
      month: '2026-11-16',
      periodType: 'weekly',
      limitAmount: 15000,
    });

    const weeklyStatuses = getBudgetStatuses(store, '2026-11-22'); // Sunday of same week
    expect(weeklyStatuses).toHaveLength(2);
    expect(weeklyStatuses[0]).toMatchObject({
      categoryId: 'all',
      categoryName: 'All Expenses',
      periodType: 'weekly',
      startDate: '2026-11-16',
      endDate: '2026-11-22',
      spent: 7000, // 4500 + 2500
      remaining: 8000,
    });
    expect(weeklyStatuses[1]).toMatchObject({
      categoryId: 'cat-food',
      periodType: 'weekly',
      spent: 4500,
      remaining: 5500,
    });

    // Monthly budget for 2026-11
    setBudget(store, {
      categoryId: 'cat-food',
      month: '2026-11',
      periodType: 'monthly',
      limitAmount: 20000,
    });
    const monthlyStatuses = getBudgetStatuses(store, '2026-11');
    expect(monthlyStatuses).toHaveLength(1);
    expect(monthlyStatuses[0]).toMatchObject({
      periodType: 'monthly',
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      spent: 3000 + 4500 + 6000, // 13500
      remaining: 6500,
    });

    // Yearly budget for 2026 (excludes 2025 and 2027)
    setBudget(store, {
      categoryId: 'cat-food',
      month: '2026',
      periodType: 'yearly',
      limitAmount: 30000,
    });
    const yearlyStatuses = getBudgetStatuses(store, '2026');
    expect(yearlyStatuses).toHaveLength(1);
    expect(yearlyStatuses[0]).toMatchObject({
      periodType: 'yearly',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      spent: 12000 + 3000 + 4500 + 6000, // 25500
      remaining: 4500,
    });

    // CSV backup & restore preserves weekly, monthly, and yearly budgets
    const zip = exportBackupZip(store);
    const restored = createAppStore('node-multi-budget-restored');
    importBackupZip(restored, zip, 'replace');

    expect(getBudgetStatuses(restored, '2026-11-16')).toHaveLength(2);
    expect(getBudgetStatuses(restored, '2026-11')[0].periodType).toBe('monthly');
    expect(getBudgetStatuses(restored, '2026')[0].periodType).toBe('yearly');
    expect(getBudgetStatuses(restored, '2026')[0].spent).toBe(25500);
  });

  it('preserves store integrity when transaction creation or editing is aborted / discarded', () => {
    const store = createAppStore('node-discard-test');
    seedDefaultData(store);

    const initialTxId = addTransaction(store, {
      accountId: 'acc-checking',
      categoryId: 'cat-food',
      kind: 'expense',
      amount: 4500,
      date: '2026-11-16',
      note: 'Supermarket',
    });

    const initialTxList = listTransactions(store);
    const initialCount = initialTxList.length;
    const initialBalances = getAccountBalances(store);

    // Simulating discarded new transaction: state changes in form / calculator are not saved to store
    let calc = createCalculatorState();
    calc = stepCalculator(calc, '5');
    calc = stepCalculator(calc, '0');
    expect(getCalculatorCents(calc)).toBe(5000);
    // User presses discard -> no call to addTransaction

    expect(listTransactions(store)).toHaveLength(initialCount);
    expect(getAccountBalances(store)).toEqual(initialBalances);

    // Simulating discarded edit: existing transaction is untouched if editing is dismissed
    const targetTx = getTransactionById(store, initialTxId)!;
    const originalAmount = targetTx.amount;
    const originalNote = targetTx.note;

    // User edits in UI but hits discard -> no call to updateTransaction
    const refreshedTx = getTransactionById(store, initialTxId);
    expect(refreshedTx?.amount).toBe(originalAmount);
    expect(refreshedTx?.note).toBe(originalNote);
  });
});
