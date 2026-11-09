import { createMergeableStore, type MergeableStore } from 'tinybase';
import { uuidv7 } from './id';
import type { Cents } from './money';

export type AccountType = 'checking' | 'savings' | 'cash' | 'credit';
export type CategoryKind = 'expense' | 'income';
export type TransactionKind = 'expense' | 'income' | 'transfer';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: Cents;
  color: string;
  createdAt: string;
  deleted: boolean;
}

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
  createdAt: string;
  deleted: boolean;
}

export interface Transaction {
  id: string;
  accountId: string;
  toAccountId: string; // non-empty only when kind === 'transfer'
  categoryId: string;
  kind: TransactionKind;
  /**
   * Positive integer cents representing the magnitude of the transaction.
   * Direction is determined by `kind`:
   * - 'expense': subtracts `amount` from `accountId`
   * - 'income': adds `amount` to `accountId`
   * - 'transfer': subtracts `amount` from `accountId`, adds `amount` to `toAccountId`
   */
  amount: Cents;
  date: string; // YYYY-MM-DD
  note: string;
  createdAt: string;
  deleted: boolean;
}

export interface Budget {
  id: string; // `${month}:${categoryId}` e.g. "2026-11:cat-food"
  categoryId: string;
  month: string; // YYYY-MM
  limitAmount: Cents;
  rollover: boolean;
  deleted: boolean;
}

export const TABLES = {
  accounts: 'accounts',
  categories: 'categories',
  transactions: 'transactions',
  budgets: 'budgets',
} as const;

export const VALUES = {
  currency: 'currency',
  vaultInitialized: 'vaultInitialized',
} as const;

export function createAppStore(uniqueId?: string): MergeableStore {
  const store = createMergeableStore(uniqueId ?? uuidv7());
  store.setTablesSchema({
    accounts: {
      name: { type: 'string', default: '' },
      type: { type: 'string', default: 'checking' },
      openingBalance: { type: 'number', default: 0 },
      color: { type: 'string', default: '#38bdf8' },
      createdAt: { type: 'string', default: '' },
      deleted: { type: 'boolean', default: false },
    },
    categories: {
      name: { type: 'string', default: '' },
      kind: { type: 'string', default: 'expense' },
      icon: { type: 'string', default: 'tag' },
      color: { type: 'string', default: '#a78bfa' },
      createdAt: { type: 'string', default: '' },
      deleted: { type: 'boolean', default: false },
    },
    transactions: {
      accountId: { type: 'string', default: '' },
      toAccountId: { type: 'string', default: '' },
      categoryId: { type: 'string', default: '' },
      kind: { type: 'string', default: 'expense' },
      amount: { type: 'number', default: 0 },
      date: { type: 'string', default: '' },
      note: { type: 'string', default: '' },
      createdAt: { type: 'string', default: '' },
      deleted: { type: 'boolean', default: false },
    },
    budgets: {
      categoryId: { type: 'string', default: '' },
      month: { type: 'string', default: '' },
      limitAmount: { type: 'number', default: 0 },
      rollover: { type: 'boolean', default: false },
      deleted: { type: 'boolean', default: false },
    },
  });
  store.setValuesSchema({
    currency: { type: 'string', default: 'USD' },
    vaultInitialized: { type: 'boolean', default: false },
  });
  return store;
}

export const DEFAULT_CATEGORIES: Array<Omit<Category, 'createdAt' | 'deleted'>> = [
  { id: 'cat-groceries', name: 'Groceries', kind: 'expense', icon: 'cart', color: '#34d399' },
  { id: 'cat-dining', name: 'Dining Out', kind: 'expense', icon: 'utensils', color: '#fb923c' },
  { id: 'cat-housing', name: 'Housing & Rent', kind: 'expense', icon: 'home', color: '#60a5fa' },
  { id: 'cat-transport', name: 'Transport', kind: 'expense', icon: 'car', color: '#f472b6' },
  { id: 'cat-utilities', name: 'Utilities', kind: 'expense', icon: 'bolt', color: '#facc15' },
  { id: 'cat-entertainment', name: 'Entertainment', kind: 'expense', icon: 'film', color: '#a78bfa' },
  { id: 'cat-health', name: 'Health', kind: 'expense', icon: 'heart', color: '#f87171' },
  { id: 'cat-salary', name: 'Salary', kind: 'income', icon: 'briefcase', color: '#2dd4bf' },
  { id: 'cat-freelance', name: 'Side Income', kind: 'income', icon: 'sparkles', color: '#4ade80' },
];

export const DEFAULT_ACCOUNTS: Array<Omit<Account, 'createdAt' | 'deleted'>> = [
  { id: 'acc-checking', name: 'Main Checking', type: 'checking', openingBalance: 250000, color: '#38bdf8' },
  { id: 'acc-savings', name: 'High-Yield Savings', type: 'savings', openingBalance: 1000000, color: '#34d399' },
  { id: 'acc-cash', name: 'Wallet Cash', type: 'cash', openingBalance: 15000, color: '#fbbf24' },
];

export function seedDefaultData(store: MergeableStore): void {
  if (store.getValue('vaultInitialized')) {
    return;
  }
  const nowIso = new Date().toISOString();
  store.transaction(() => {
    for (const acc of DEFAULT_ACCOUNTS) {
      store.setRow('accounts', acc.id, {
        name: acc.name,
        type: acc.type,
        openingBalance: acc.openingBalance,
        color: acc.color,
        createdAt: nowIso,
        deleted: false,
      });
    }
    for (const cat of DEFAULT_CATEGORIES) {
      store.setRow('categories', cat.id, {
        name: cat.name,
        kind: cat.kind,
        icon: cat.icon,
        color: cat.color,
        createdAt: nowIso,
        deleted: false,
      });
    }
    store.setValue('currency', 'USD');
    store.setValue('vaultInitialized', true);
  });
}
