import { createMergeableStore, type MergeableStore } from 'tinybase';
import { uuidv7 } from './id';
import type { Cents } from './money';

export type AccountType = 'checking' | 'savings' | 'cash' | 'credit';
export type CategoryKind = 'expense' | 'income';
export type TransactionKind = 'expense' | 'income' | 'transfer';
export type ThemeMode = 'dark' | 'light';

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
  subcategories: string[];
  sortOrder: number;
  createdAt: string;
  deleted: boolean;
}

export interface Transaction {
  id: string;
  accountId: string;
  toAccountId: string; // non-empty only when kind === 'transfer'
  categoryId: string;
  subcategory: string;
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
  theme: 'theme',
  presetVersion: 'presetVersion',
} as const;

export function parseSubcategoriesJson(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((s) => String(s).trim()).filter(Boolean);
  }
  if (typeof raw !== 'string' || !raw.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((s) => String(s).trim()).filter(Boolean);
    }
  } catch {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

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
      icon: { type: 'string', default: 'dots' },
      color: { type: 'string', default: '#F29B9B' },
      subcategories: { type: 'string', default: '[]' },
      sortOrder: { type: 'number', default: 0 },
      createdAt: { type: 'string', default: '' },
      deleted: { type: 'boolean', default: false },
    },
    transactions: {
      accountId: { type: 'string', default: '' },
      toAccountId: { type: 'string', default: '' },
      categoryId: { type: 'string', default: '' },
      subcategory: { type: 'string', default: '' },
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
    theme: { type: 'string', default: 'dark' },
    presetVersion: { type: 'number', default: 0 },
  });
  return store;
}

/**
 * 17 Expense + 5 Income preset categories matching the reference design grid,
 * each with its pastel circle color, line-art SVG icon key, and subcategories.
 */
export const DEFAULT_CATEGORIES: Array<Omit<Category, 'createdAt' | 'deleted'>> = [
  // Row 1 (Expense)
  {
    id: 'cat-online-shopping',
    name: 'Online shopping',
    kind: 'expense',
    icon: 'cart',
    color: '#D29BF2',
    subcategories: ['Clothes', 'Electronics', 'Home', 'Other'],
    sortOrder: 1,
  },
  {
    id: 'cat-tax',
    name: 'Tax',
    kind: 'expense',
    icon: 'document',
    color: '#D4D4D8',
    subcategories: ['Income tax', 'Property tax', 'GST / VAT', 'Other'],
    sortOrder: 2,
  },
  {
    id: 'cat-daily-goods',
    name: 'Daily goods',
    kind: 'expense',
    icon: 'box',
    color: '#9BD8F2',
    subcategories: ['Supermarket', 'Household', 'Personal care', 'Other'],
    sortOrder: 3,
  },
  {
    id: 'cat-medical',
    name: 'Medical',
    kind: 'expense',
    icon: 'medical',
    color: '#9BF2C8',
    subcategories: ['Doctor', 'Pharmacy', 'Dental', 'Hospital', 'Other'],
    sortOrder: 4,
  },
  {
    id: 'cat-hobby',
    name: 'Hobby',
    kind: 'expense',
    icon: 'star',
    color: '#F2C89B',
    subcategories: ['Games', 'Movies', 'Sports', 'Books', 'Other'],
    sortOrder: 5,
  },
  // Row 2 (Expense)
  {
    id: 'cat-car-bike',
    name: 'Car · Bike',
    kind: 'expense',
    icon: 'car',
    color: '#A8E6CF',
    subcategories: ['Fuel', 'Parking', 'Maintenance', 'Toll', 'Other'],
    sortOrder: 6,
  },
  {
    id: 'cat-education',
    name: 'Education',
    kind: 'expense',
    icon: 'book',
    color: '#B5B9FF',
    subcategories: ['Tuition', 'Courses', 'Books', 'Stationery', 'Other'],
    sortOrder: 7,
  },
  {
    id: 'cat-house',
    name: 'House',
    kind: 'expense',
    icon: 'home',
    color: '#F6D186',
    subcategories: ['Rent', 'Mortgage', 'Furniture', 'Repairs', 'Other'],
    sortOrder: 8,
  },
  {
    id: 'cat-communication',
    name: 'Communication',
    kind: 'expense',
    icon: 'phone',
    color: '#9BF2E6',
    subcategories: ['Mobile', 'Internet', 'Subscriptions', 'Postage', 'Other'],
    sortOrder: 9,
  },
  {
    id: 'cat-fashion',
    name: 'Fashion',
    kind: 'expense',
    icon: 'glasses',
    color: '#F29BD4',
    subcategories: ['Clothing', 'Shoes', 'Bags', 'Accessories', 'Other'],
    sortOrder: 10,
  },
  // Row 3 (Expense)
  {
    id: 'cat-food',
    name: 'Food',
    kind: 'expense',
    icon: 'toast',
    color: '#F29B9B',
    subcategories: ['Eating out', 'Drink', 'Grocery', 'Breakfast', 'Lunch', 'Diner', 'Cafe', 'Other'],
    sortOrder: 11,
  },
  {
    id: 'cat-insurance',
    name: 'Insurance',
    kind: 'expense',
    icon: 'heart',
    color: '#F2A69B',
    subcategories: ['Health', 'Life', 'Vehicle', 'Travel', 'Other'],
    sortOrder: 12,
  },
  {
    id: 'cat-other-expense',
    name: 'Other',
    kind: 'expense',
    icon: 'dots',
    color: '#CBD5E1',
    subcategories: ['Other', 'Uncategorized'],
    sortOrder: 13,
  },
  {
    id: 'cat-socializing',
    name: 'Socializing',
    kind: 'expense',
    icon: 'people',
    color: '#C8F29B',
    subcategories: ['Drinks', 'Party', 'Gifts', 'Events', 'Other'],
    sortOrder: 14,
  },
  {
    id: 'cat-transportation',
    name: 'Transportation',
    kind: 'expense',
    icon: 'bus',
    color: '#9BAEF2',
    subcategories: ['Bus', 'MRT / Train', 'Taxi', 'Flight', 'Other'],
    sortOrder: 15,
  },
  // Row 4 (Expense)
  {
    id: 'cat-utility-fee',
    name: 'Utility Fee',
    kind: 'expense',
    icon: 'plugs',
    color: '#85E3FF',
    subcategories: ['Electricity', 'Water', 'Gas', 'Other'],
    sortOrder: 16,
  },
  {
    id: 'cat-beauty',
    name: 'Beauty',
    kind: 'expense',
    icon: 'scissors',
    color: '#FFB5E8',
    subcategories: ['Haircut', 'Skincare', 'Cosmetics', 'Spa', 'Other'],
    sortOrder: 17,
  },
  // Income Categories (5)
  {
    id: 'cat-salary',
    name: 'Salary',
    kind: 'income',
    icon: 'banknotes',
    color: '#FCE07D',
    subcategories: ['Salary'],
    sortOrder: 101,
  },
  {
    id: 'cat-bonus',
    name: 'Bonus',
    kind: 'income',
    icon: 'banknotes',
    color: '#FCE07D',
    subcategories: ['Bonus'],
    sortOrder: 102,
  },
  {
    id: 'cat-allowance',
    name: 'Allowance',
    kind: 'income',
    icon: 'banknotes',
    color: '#FCE07D',
    subcategories: ['Allowance'],
    sortOrder: 103,
  },
  {
    id: 'cat-investment',
    name: 'Investment',
    kind: 'income',
    icon: 'banknotes',
    color: '#FCE07D',
    subcategories: ['Dividends', 'Interest', 'Capital gains', 'Other'],
    sortOrder: 104,
  },
  {
    id: 'cat-other-income',
    name: 'Other',
    kind: 'income',
    icon: 'banknotes',
    color: '#FCE07D',
    subcategories: ['Other'],
    sortOrder: 105,
  },
];

export const DEFAULT_ACCOUNTS: Array<Omit<Account, 'createdAt' | 'deleted'>> = [
  { id: 'acc-checking', name: 'Main Account', type: 'checking', openingBalance: 0, color: '#F3A833' },
];

const LEGACY_CATEGORY_IDS = [
  'cat-groceries',
  'cat-dining',
  'cat-housing',
  'cat-transport',
  'cat-utilities',
  'cat-entertainment',
  'cat-health',
  'cat-freelance',
];

export function ensureReferenceCategories(store: MergeableStore): void {
  const currentVersion = Number(store.getValue('presetVersion') ?? 0);
  if (currentVersion >= 2) {
    return;
  }
  const nowIso = new Date().toISOString();
  const txTable = store.getTable('transactions');
  const usedCatIds = new Set<string>();
  for (const row of Object.values(txTable)) {
    if (!row.deleted && row.categoryId) {
      usedCatIds.add(String(row.categoryId));
    }
  }

  store.transaction(() => {
    for (const cat of DEFAULT_CATEGORIES) {
      const existing = store.getRow('categories', cat.id);
      if (!existing || Object.keys(existing).length === 0) {
        store.setRow('categories', cat.id, {
          name: cat.name,
          kind: cat.kind,
          icon: cat.icon,
          color: cat.color,
          subcategories: JSON.stringify(cat.subcategories),
          sortOrder: cat.sortOrder,
          createdAt: nowIso,
          deleted: false,
        });
      } else {
        store.setCell('categories', cat.id, 'icon', cat.icon);
        store.setCell('categories', cat.id, 'color', cat.color);
        store.setCell('categories', cat.id, 'subcategories', JSON.stringify(cat.subcategories));
        store.setCell('categories', cat.id, 'sortOrder', cat.sortOrder);
      }
    }

    for (const legacyId of LEGACY_CATEGORY_IDS) {
      if (store.hasRow('categories', legacyId) && !usedCatIds.has(legacyId)) {
        store.setCell('categories', legacyId, 'deleted', true);
      }
    }

    store.setValue('presetVersion', 2);
  });
}

export function seedDefaultData(store: MergeableStore): void {
  if (store.getValue('vaultInitialized')) {
    ensureReferenceCategories(store);
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
        subcategories: JSON.stringify(cat.subcategories),
        sortOrder: cat.sortOrder,
        createdAt: nowIso,
        deleted: false,
      });
    }
    store.setValue('currency', 'USD');
    store.setValue('theme', 'dark');
    store.setValue('presetVersion', 2);
    store.setValue('vaultInitialized', true);
  });
}
