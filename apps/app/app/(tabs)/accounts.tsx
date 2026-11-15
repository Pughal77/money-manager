import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  addAccount,
  addCategory,
  centsToDecimalString,
  deleteAccount,
  deleteCategory,
  getAccountBalances,
  listCategories,
  parseToCents,
  updateAccount,
  type AccountType,
  type CategoryKind,
} from '@mm/core';
import { useVault } from '../../src/data/VaultContext';
import { AmountText, Button, Card } from '../../src/ui/components';
import { colors, radius, spacing } from '../../src/ui/theme';

export default function AccountsScreen() {
  const { store } = useVault();
  const accounts = getAccountBalances(store);
  const categories = listCategories(store);

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('checking');
  const [openingStr, setOpeningStr] = useState('0.00');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editOpeningStr, setEditOpeningStr] = useState('0.00');

  const [catName, setCatName] = useState('');
  const [catKind, setCatKind] = useState<CategoryKind>('expense');

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
    addCategory(store, { name: catName, kind: catKind });
    setCatName('');
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Your Accounts</Text>
      <Card>
        {accounts.length === 0 ? (
          <Text style={styles.empty}>
            No accounts yet. Create your first account below.
          </Text>
        ) : (
          accounts.map((acc) => (
            <View key={acc.id} style={styles.accountBlock}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{acc.name}</Text>
                  <Text style={styles.sub}>
                    {acc.type.toUpperCase()} · Opening:{' '}
                    ${centsToDecimalString(acc.openingBalance)}
                  </Text>
                </View>
                <View style={styles.rightActions}>
                  <AmountText cents={acc.balance} size={16} />
                  <Pressable
                    onPress={() => startEditing(acc)}
                    style={styles.actionBtn}
                  >
                    <Text style={styles.editText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => deleteAccount(store, acc.id)}
                    style={styles.actionBtn}
                  >
                    <Text style={styles.deleteText}>Delete</Text>
                  </Pressable>
                </View>
              </View>

              {editingId === acc.id && (
                <View style={styles.editBox}>
                  <Text style={styles.label}>Account Name</Text>
                  <TextInput
                    value={editName}
                    onChangeText={setEditName}
                    style={styles.input}
                  />
                  <Text style={styles.label}>Opening Balance ($)</Text>
                  <TextInput
                    value={editOpeningStr}
                    onChangeText={setEditOpeningStr}
                    keyboardType="decimal-pad"
                    style={styles.input}
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
          ))
        )}
      </Card>

      <Text style={styles.sectionTitle}>Add Account</Text>
      <Card>
        <Text style={styles.label}>Account Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. DBS Multiplier / OCBC"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />

        <Text style={styles.label}>Account Type</Text>
        <View style={styles.chipWrap}>
          {(['checking', 'savings', 'cash', 'credit'] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setType(t)}
              style={[styles.chip, type === t && styles.chipActive]}
            >
              <Text
                style={[styles.chipText, type === t && styles.chipTextActive]}
              >
                {t.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Opening Balance ($)</Text>
        <TextInput
          value={openingStr}
          onChangeText={setOpeningStr}
          keyboardType="decimal-pad"
          style={styles.input}
        />

        <View style={{ marginTop: spacing.md }}>
          <Button label="Create Account" onPress={handleCreate} />
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Categories</Text>
      <Card>
        <View style={styles.chipWrap}>
          {categories.map((cat) => (
            <View key={cat.id} style={styles.catBadge}>
              <Text style={styles.catBadgeText}>
                {cat.name} ({cat.kind === 'income' ? '+' : '-'})
              </Text>
              <Pressable onPress={() => deleteCategory(store, cat.id)}>
                <Text style={styles.catRemove}>✕</Text>
              </Pressable>
            </View>
          ))}
        </View>

        <Text style={styles.label}>New Category Name</Text>
        <TextInput
          value={catName}
          onChangeText={setCatName}
          placeholder="e.g. Hawker / MRT"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <View style={[styles.chipWrap, { marginTop: spacing.xs }]}>
          {(['expense', 'income'] as const).map((k) => (
            <Pressable
              key={k}
              onPress={() => setCatKind(k)}
              style={[styles.chip, catKind === k && styles.chipActive]}
            >
              <Text
                style={[
                  styles.chipText,
                  catKind === k && styles.chipTextActive,
                ]}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, maxWidth: 920, width: '100%', alignSelf: 'center' },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  accountBlock: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceElevated,
  },
  editText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  deleteText: { color: colors.expense, fontSize: 12, fontWeight: '600' },
  editBox: {
    backgroundColor: '#0f172a',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  editBtnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  name: { color: colors.text, fontSize: 16, fontWeight: '700' },
  sub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: 15,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#090d16', fontWeight: '700' },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
  },
  catBadgeText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  catRemove: { color: colors.expense, fontSize: 12, fontWeight: '800' },
  empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.md },
});
