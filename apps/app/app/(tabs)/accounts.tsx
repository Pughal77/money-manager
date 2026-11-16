import React, { useState } from 'react';
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
  addAccount,
  addCategory,
  centsToDecimalString,
  deleteAccount,
  deleteCategory,
  formatAmountPlain,
  getAccountBalances,
  getNetWorth,
  listCategories,
  listTransactions,
  parseToCents,
  updateAccount,
  updateCategory,
  type AccountType,
  type CategoryKind,
} from '@mm/core';
import { useVault } from '../../src/data/VaultContext';
import { AmountText, Button, Card } from '../../src/ui/components';
import { AppIcon, CategoryBadge } from '../../src/ui/icons';
import { radius, spacing, useTheme } from '../../src/ui/theme';
import { useResponsive } from '../../src/ui/useResponsive';

export default function AccountsScreen() {
  const { store } = useVault();
  const { colors } = useTheme();
  const { isDesktop } = useResponsive();
  const router = useRouter();
  const accounts = getAccountBalances(store);
  const netWorth = getNetWorth(store);
  const allTxs = listTransactions(store);
  const categories = listCategories(store);

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('checking');
  const [openingStr, setOpeningStr] = useState('0.00');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editOpeningStr, setEditOpeningStr] = useState('0.00');

  const [catName, setCatName] = useState('');
  const [catKind, setCatKind] = useState<CategoryKind>('expense');
  const [catSubs, setCatSubs] = useState('Other');

  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatSubs, setEditCatSubs] = useState('');

  const handleCreate = () => {
    try {
      if (!name.trim()) return;
      const cents = parseToCents(openingStr || '0');
      addAccount(store, { name, type, openingBalance: cents });
      setName('');
      setOpeningStr('0.00');
    } catch {
      // ignore invalid
    }
  };

  const startEditing = (acc: { id: string; name: string; openingBalance: number }) => {
    setEditingId(acc.id);
    setEditName(acc.name);
    setEditOpeningStr(centsToDecimalString(acc.openingBalance));
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    try {
      const cents = parseToCents(editOpeningStr || '0');
      updateAccount(store, editingId, {
        name: editName,
        openingBalance: cents,
      });
      setEditingId(null);
    } catch {
      // ignore invalid
    }
  };

  const handleCreateCategory = () => {
    if (!catName.trim()) return;
    const subs = catSubs
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    addCategory(store, {
      name: catName,
      kind: catKind,
      subcategories: subs.length ? subs : ['Other'],
    });
    setCatName('');
    setCatSubs('Other');
  };

  const handleSaveCategorySubs = (catId: string) => {
    const subs = editCatSubs
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    updateCategory(store, catId, {
      subcategories: subs.length ? subs : ['Other'],
    });
    setEditingCatId(null);
  };

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
        <Text style={[styles.topTitle, { color: colors.text }]}>
          Accounts & Categories
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          isDesktop && styles.desktopContent,
        ]}
      >
        <View style={isDesktop ? styles.desktopRow : styles.mobileCol}>
          <View style={isDesktop ? styles.desktopCol : styles.mobileCol}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Categories & Subcategories
            </Text>
        <Card>
          {categories.map((cat) => (
            <View
              key={cat.id}
              style={[styles.accountBlock, { borderBottomColor: colors.border }]}
            >
              <View style={styles.itemTopRow}>
                <View style={styles.catRowLeft}>
                  <CategoryBadge icon={cat.icon} color={cat.color} size={34} />
                  <View style={styles.itemMeta}>
                    <Text style={[styles.name, { color: colors.text }]}>
                      {cat.name}{' '}
                      <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                        ({cat.kind})
                      </Text>
                    </Text>
                    <Text
                      style={[styles.sub, { color: colors.textMuted }]}
                      numberOfLines={2}
                    >
                      {cat.subcategories.join(', ')}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.itemActionsRow}>
                <Pressable
                  onPress={() => {
                    setEditingCatId(cat.id);
                    setEditCatSubs(cat.subcategories.join(', '));
                  }}
                  style={[
                    styles.actionBtn,
                    { backgroundColor: colors.surfaceElevated },
                  ]}
                >
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>
                    Subcategories
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => deleteCategory(store, cat.id)}
                  style={[
                    styles.actionBtn,
                    { backgroundColor: colors.surfaceElevated },
                  ]}
                >
                  <Text style={{ color: colors.expense, fontSize: 12, fontWeight: '600' }}>
                    Delete
                  </Text>
                </Pressable>
              </View>

              {editingCatId === cat.id ? (
                <View
                  style={[
                    styles.editBox,
                    { backgroundColor: colors.surfaceElevated },
                  ]}
                >
                  <Text style={[styles.label, { color: colors.textSecondary }]}>
                    Subcategories (comma-separated)
                  </Text>
                  <TextInput
                    value={editCatSubs}
                    onChangeText={setEditCatSubs}
                    style={[
                      styles.input,
                      { backgroundColor: colors.surface, color: colors.text },
                    ]}
                  />
                  <View style={styles.editBtnRow}>
                    <Button
                      label="Save"
                      onPress={() => handleSaveCategorySubs(cat.id)}
                    />
                    <Button
                      label="Cancel"
                      variant="secondary"
                      onPress={() => setEditingCatId(null)}
                    />
                  </View>
                </View>
              ) : null}
            </View>
          ))}

          <Text style={[styles.label, { color: colors.textSecondary }]}>
            New Category Name
          </Text>
          <TextInput
            value={catName}
            onChangeText={setCatName}
            placeholder="e.g. Pets"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              { backgroundColor: colors.surfaceElevated, color: colors.text },
            ]}
          />
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Subcategories (comma-separated)
          </Text>
          <TextInput
            value={catSubs}
            onChangeText={setCatSubs}
            placeholder="Food, Vet, Toys, Other"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              { backgroundColor: colors.surfaceElevated, color: colors.text },
            ]}
          />
          <View style={[styles.chipWrap, { marginTop: spacing.xs }]}>
            {(['expense', 'income'] as const).map((k) => (
              <Pressable
                key={k}
                onPress={() => setCatKind(k)}
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      catKind === k ? colors.primary : colors.surfaceElevated,
                  },
                ]}
              >
                <Text
                  style={{
                    color: catKind === k ? '#FFFFFF' : colors.textSecondary,
                    fontSize: 13,
                    fontWeight: '600',
                  }}
                >
                  {k.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={{ marginTop: spacing.md }}>
            <Button label="Add Category" onPress={handleCreateCategory} />
          </View>
        </Card>
      </View>

      <View style={isDesktop ? styles.desktopCol : styles.mobileCol}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Your Accounts (Total Net Worth: {formatAmountPlain(netWorth)})
        </Text>
        <Card>
          {accounts.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textMuted }]}>
              No accounts yet. Create your first account below.
            </Text>
          ) : (
            accounts.map((acc) => {
              const accIncome = allTxs
                .filter((t) => t.accountId === acc.id && t.kind === 'income')
                .reduce((s, t) => s + t.amount, 0);
              const accExpense = allTxs
                .filter((t) => t.accountId === acc.id && t.kind === 'expense')
                .reduce((s, t) => s + t.amount, 0);
              return (
              <View
                key={acc.id}
                style={[styles.accountBlock, { borderBottomColor: colors.border }]}
              >
                <View style={styles.itemTopRow}>
                  <View style={styles.itemMeta}>
                    <Text style={[styles.name, { color: colors.text }]}>
                      {acc.name}
                    </Text>
                    <Text style={[styles.sub, { color: colors.textMuted }]}>
                      {acc.type.toUpperCase()} · Opening:{' '}
                      {formatAmountPlain(acc.openingBalance)}
                    </Text>
                    <Text style={[styles.sub, { color: colors.textMuted }]}>
                      <Text style={{ color: colors.income }}>
                        Income +{formatAmountPlain(accIncome)}
                      </Text>
                      {'  ·  '}
                      <Text style={{ color: colors.expense }}>
                        Expense -{formatAmountPlain(accExpense)}
                      </Text>
                    </Text>
                  </View>
                  <View style={styles.balanceCol}>
                    <AmountText cents={acc.balance} size={16} />
                  </View>
                </View>

                <View style={styles.itemActionsRow}>
                  <Pressable
                    onPress={() => startEditing(acc)}
                    style={[
                      styles.actionBtn,
                      { backgroundColor: colors.surfaceElevated },
                    ]}
                  >
                    <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>
                      Edit
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => deleteAccount(store, acc.id)}
                    style={[
                      styles.actionBtn,
                      { backgroundColor: colors.surfaceElevated },
                    ]}
                  >
                    <Text style={{ color: colors.expense, fontSize: 12, fontWeight: '600' }}>
                      Delete
                    </Text>
                  </Pressable>
                </View>

                {editingId === acc.id && (
                  <View
                    style={[
                      styles.editBox,
                      { backgroundColor: colors.surfaceElevated },
                    ]}
                  >
                    <Text style={[styles.label, { color: colors.textSecondary }]}>
                      Account Name
                    </Text>
                    <TextInput
                      value={editName}
                      onChangeText={setEditName}
                      style={[
                        styles.input,
                        { backgroundColor: colors.surface, color: colors.text },
                      ]}
                    />
                    <Text style={[styles.label, { color: colors.textSecondary }]}>
                      Opening Balance
                    </Text>
                    <TextInput
                      value={editOpeningStr}
                      onChangeText={setEditOpeningStr}
                      keyboardType="decimal-pad"
                      style={[
                        styles.input,
                        { backgroundColor: colors.surface, color: colors.text },
                      ]}
                    />
                    <View style={styles.editBtnRow}>
                      <Button label="Save Changes" onPress={handleSaveEdit} />
                      <Button
                        label="Cancel"
                        variant="secondary"
                        onPress={() => setEditingId(null)}
                      />
                    </View>
                  </View>
                )}
              </View>
            );
            })
          )}

          <Text style={[styles.label, { color: colors.textSecondary }]}>
            New Account Name
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. DBS / OCBC / Cash"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              { backgroundColor: colors.surfaceElevated, color: colors.text },
            ]}
          />
          <View style={[styles.chipWrap, { marginTop: spacing.xs }]}>
            {(['checking', 'savings', 'cash', 'credit'] as const).map((t) => (
              <Pressable
                key={t}
                onPress={() => setType(t)}
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      type === t ? colors.primary : colors.surfaceElevated,
                  },
                ]}
              >
                <Text
                  style={{
                    color: type === t ? '#FFFFFF' : colors.textSecondary,
                    fontSize: 12,
                    fontWeight: '600',
                  }}
                >
                  {t.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={{ marginTop: spacing.md }}>
            <Button label="Create Account" onPress={handleCreate} />
          </View>
        </Card>
      </View>
    </View>
  </ScrollView>
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
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  accountBlock: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  itemMeta: {
    flex: 1,
    flexShrink: 1,
  },
  balanceCol: {
    flexShrink: 0,
    alignItems: 'flex-end',
  },
  catRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  itemActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  editBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  editBtnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  name: { fontSize: 15, fontWeight: '600' },
  sub: { fontSize: 12, marginTop: 2 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  input: {
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 14,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  empty: { textAlign: 'center', paddingVertical: spacing.md },
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
  desktopCol: {
    flex: 1,
    minWidth: 0,
    gap: 12,
  },
  mobileCol: {
    width: '100%',
    gap: 12,
  },
});
