import { describe, expect, it } from 'vitest';
import {
  addAccount,
  addCategory,
  addTransaction,
  centsToDecimalString,
  createAppStore,
  deleteTransaction,
  exportBackupZip,
  formatCents,
  getAccountBalances,
  getBudgetStatuses,
  getCategoryBreakdown,
  getMonthlySummary,
  getNetWorth,
  importBackupZip,
  listTransactions,
  parseToCents,
  seedDefaultData,
  setBudget,
  updateTransaction,
  uuidv7,
} from './index.js';

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
    const foodId = addCategory(store, { name: 'Food', kind: 'expense' });
    const salaryId = addCategory(store, { name: 'Salary', kind: 'income' });

    // Income +$2,000.00 to Checking
    addTransaction(store, {
      accountId: checkingId,
      categoryId: salaryId,
      kind: 'income',
      amount: 200000,
      date: '2026-11-05',
      note: 'Paycheck',
    });

    // Expense -$150.00 from Checking
    const txFood = addTransaction(store, {
      accountId: checkingId,
      categoryId: foodId,
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

  it('exports to CSV ZIP and restores in both replace and merge modes', () => {
    const source = createAppStore('node-a');
    seedDefaultData(source);
    const txId = addTransaction(source, {
      accountId: 'acc-checking',
      categoryId: 'cat-groceries',
      kind: 'expense',
      amount: 4299,
      date: '2026-11-09',
      note: 'Trader Joes',
    });

    const zipBytes = exportBackupZip(source);
    expect(zipBytes.byteLength).toBeGreaterThan(100);

    // Restore in replace mode onto a store that had extra data
    const destReplace = createAppStore('node-b');
    addAccount(destReplace, { id: 'acc-temp', name: 'Temporary', type: 'cash', openingBalance: 999 });
    importBackupZip(destReplace, zipBytes, 'replace');
    expect(destReplace.hasRow('accounts', 'acc-temp')).toBe(false);
    expect(listTransactions(destReplace).map((t) => t.id)).toContain(txId);

    // Restore in merge mode onto a store that has an extra account
    const destMerge = createAppStore('node-c');
    addAccount(destMerge, { id: 'acc-extra', name: 'Extra Cash', type: 'cash', openingBalance: 5000 });
    importBackupZip(destMerge, zipBytes, 'merge');
    expect(destMerge.hasRow('accounts', 'acc-extra')).toBe(true);
    expect(listTransactions(destMerge).map((t) => t.id)).toContain(txId);
  });
});
