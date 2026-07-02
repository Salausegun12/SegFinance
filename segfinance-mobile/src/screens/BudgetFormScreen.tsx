import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { BudgetsStackParamList } from '../navigation/types';
import type { Budget } from '../types';
import { createBudget, updateBudget, deleteBudget, getBudgets } from '../api/budgets';

type NavProp = NativeStackNavigationProp<BudgetsStackParamList, 'BudgetForm'>;
type FormRouteProp = RouteProp<BudgetsStackParamList, 'BudgetForm'>;

const EXPENSE_CATEGORIES = [
  'Food', 'Transport', 'Fuel', 'Airtime', 'Internet', 'Bills',
  'Rent', 'Shopping', 'Education', 'Entertainment', 'Medical',
  'Investment', 'Charity', 'Others',
];

const now = new Date();
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

export default function BudgetFormScreen() {
  const { colors, borderRadius, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<FormRouteProp>();
  const budgetId = route.params?.budgetId;
  const isEditing = !!budgetId;

  const [category, setCategory] = useState('');
  const [limitAmount, setLimitAmount] = useState('');
  const [month, setMonth] = useState(currentMonth);
  const [saving, setSaving] = useState(false);
  const [loadingBudget, setLoadingBudget] = useState(isEditing);

  useEffect(() => {
    if (budgetId) {
      (async () => {
        try {
          const res = await getBudgets();
          const budget = res.data.find((b) => b.id === budgetId);
          if (budget) {
            setCategory(budget.category);
            setLimitAmount(String(Math.round(budget.limitAmount)));
            setMonth(budget.month);
          }
        } catch {
          Alert.alert('Error', 'Failed to load budget');
          navigation.goBack();
        } finally {
          setLoadingBudget(false);
        }
      })();
    }
  }, [budgetId]);

  const handleSave = async () => {
    if (!category) {
      Alert.alert('Validation', 'Please select a category');
      return;
    }
    const amount = parseFloat(limitAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Validation', 'Please enter a valid limit amount');
      return;
    }
    if (!/^\d{4}-\d{2}$/.test(month)) {
      Alert.alert('Validation', 'Month must be in YYYY-MM format');
      return;
    }

    setSaving(true);
    try {
      if (isEditing && budgetId) {
        await updateBudget(budgetId, { category, limitAmount: amount, month });
        Alert.alert('Success', 'Budget updated');
      } else {
        await createBudget({ category, limitAmount: amount, month });
        Alert.alert('Success', 'Budget created');
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save budget');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!budgetId) return;
    Alert.alert(
      'Delete Budget',
      'Are you sure you want to delete this budget?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await deleteBudget(budgetId);
              Alert.alert('Deleted', 'Budget has been removed');
              navigation.goBack();
            } catch {
              Alert.alert('Error', 'Failed to delete budget');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  if (loadingBudget) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          {isEditing ? 'Edit Budget' : 'Add Budget'}
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
        <View style={styles.categoryGrid}>
          {EXPENSE_CATEGORIES.map((cat) => {
            const selected = category === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: selected ? colors.primary : colors.surfaceVariant,
                    borderColor: selected ? colors.primary : colors.border,
                    borderWidth: 1,
                  },
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    { color: selected ? colors.textOnPrimary : colors.text },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.label, { color: colors.textSecondary, marginTop: 20 }]}>
          Limit Amount (₦)
        </Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.border, borderRadius: borderRadius.md },
          ]}
          value={limitAmount}
          onChangeText={setLimitAmount}
          keyboardType="numeric"
          placeholder="e.g. 80000"
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={[styles.label, { color: colors.textSecondary, marginTop: 20 }]}>Month</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.border, borderRadius: borderRadius.md },
          ]}
          value={month}
          onChangeText={setMonth}
          placeholder="YYYY-MM"
          placeholderTextColor={colors.textSecondary}
        />

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary, borderRadius: borderRadius.md, opacity: saving ? 0.6 : 1 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.textOnPrimary} />
          ) : (
            <Text style={[styles.saveBtnText, { color: colors.textOnPrimary }]}>
              {isEditing ? 'Update Budget' : 'Create Budget'}
            </Text>
          )}
        </TouchableOpacity>

        {isEditing && (
          <TouchableOpacity
            style={[styles.deleteBtn, { borderRadius: borderRadius.md }]}
            onPress={handleDelete}
            disabled={saving}
          >
            <Text style={styles.deleteBtnText}>Delete Budget</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  form: { padding: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  categoryGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  categoryChipText: { fontSize: 13, fontWeight: '500' },
  input: { height: 48, paddingHorizontal: 14, fontSize: 16, borderWidth: 1 },
  saveBtn: { height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  saveBtnText: { fontSize: 16, fontWeight: '600' },
  deleteBtn: {
    height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 12,
    borderWidth: 1, borderColor: '#DC3545',
  },
  deleteBtnText: { color: '#DC3545', fontSize: 16, fontWeight: '600' },
});
