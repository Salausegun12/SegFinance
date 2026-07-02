import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator,
  RefreshControl, StyleSheet, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { BudgetsStackParamList } from '../navigation/types';
import type { Budget } from '../types';
import { getBudgets, deleteBudget } from '../api/budgets';

type NavProp = NativeStackNavigationProp<BudgetsStackParamList, 'BudgetsMain'>;

function formatShort(amount: number): string {
  return `₦${Math.round(amount).toLocaleString()}`;
}

function ProgressBar({ spent, limit }: { spent: number; limit: number }) {
  const ratio = limit > 0 ? Math.min(spent / limit, 1) : 0;
  const pct = Math.round(ratio * 100);

  let barColor: string;
  if (pct >= 100) barColor = '#DC3545';
  else if (pct >= 80) barColor = '#FFC107';
  else barColor = '#28A745';

  return (
    <View style={progressStyles.track}>
      <View style={[progressStyles.fill, { width: `${pct}%`, backgroundColor: barColor }]} />
    </View>
  );
}

const progressStyles = StyleSheet.create({
  track: {
    height: 10, backgroundColor: '#E9ECEF', borderRadius: 5, overflow: 'hidden', marginTop: 8,
  },
  fill: { height: '100%', borderRadius: 5 },
});

const EXPENSE_CATEGORIES = [
  'Food', 'Transport', 'Fuel', 'Airtime', 'Internet', 'Bills',
  'Rent', 'Shopping', 'Education', 'Entertainment', 'Medical',
  'Investment', 'Charity', 'Others',
];

const CATEGORY_ICONS: Record<string, string> = {
  Food: '🍔', Transport: '🚌', Fuel: '⛽', Airtime: '📱', Internet: '🌐',
  Bills: '📄', Rent: '🏠', Shopping: '🛍️', Education: '📚', Entertainment: '🎬',
  Medical: '🏥', Investment: '📈', Charity: '🤝', Others: '📦',
};

export default function BudgetsScreen() {
  const { colors, borderRadius } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );

  const fetchBudgets = useCallback(async (month: string, isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const res = await getBudgets(month);
      setBudgets(res.data);
    } catch {
      Alert.alert('Error', 'Failed to load budgets');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBudgets(selectedMonth);
  }, [selectedMonth, fetchBudgets]);

  useFocusEffect(
    useCallback(() => {
      fetchBudgets(selectedMonth);
    }, [selectedMonth, fetchBudgets])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchBudgets(selectedMonth, true);
  };

  const handleDelete = (budget: Budget) => {
    Alert.alert(
      'Delete Budget',
      `Remove ${budget.category} budget for ${budget.month}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await deleteBudget(budget.id);
              setBudgets((prev) => prev.filter((b) => b.id !== budget.id));
            } catch {
              Alert.alert('Error', 'Failed to delete budget');
            }
          },
        },
      ]
    );
  };

  const handleEdit = (budget: Budget) => {
    navigation.navigate('BudgetForm', { budgetId: budget.id });
  };

  const handleCardPress = (budget: Budget) => {
    Alert.alert(budget.category, `${formatShort(budget.spent)} spent of ${formatShort(budget.limitAmount)} limit`, [
      { text: 'Edit', onPress: () => handleEdit(budget) },
      { text: 'Delete', style: 'destructive', onPress: () => handleDelete(budget) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const goBackMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const goForwardMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const currentLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const isCurrent = selectedMonth === currentLabel;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const [y, m] = selectedMonth.split('-').map(Number);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Budgets</Text>
      </View>

      <View style={styles.monthPicker}>
        <TouchableOpacity onPress={goBackMonth} style={styles.arrow}>
          <Text style={{ fontSize: 18, color: colors.textSecondary }}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={[styles.monthLabel, { color: colors.text }]}>
          {months[m - 1]} {y}{isCurrent ? ' (This Month)' : ''}
        </Text>
        <TouchableOpacity onPress={goForwardMonth} style={styles.arrow} disabled={isCurrent}>
          <Text style={{ fontSize: 18, color: isCurrent ? colors.border : colors.textSecondary }}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={budgets.length === 0 ? styles.center : styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        >
          {budgets.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textSecondary }]}>
              No budgets for this month
            </Text>
          ) : (
            budgets.map((budget) => {
              const ratio = budget.limitAmount > 0 ? budget.spent / budget.limitAmount : 0;
              let statusColor = colors.success;
              if (ratio >= 1) statusColor = '#DC3545';
              else if (ratio >= 0.8) statusColor = '#FFC107';

              return (
                <TouchableOpacity
                  key={budget.id}
                  style={[styles.card, { backgroundColor: colors.card }]}
                  onPress={() => handleCardPress(budget)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.cardLeft}>
                      <Text style={styles.categoryIcon}>{CATEGORY_ICONS[budget.category] ?? '📦'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.categoryName, { color: colors.text }]}>{budget.category}</Text>
                        <Text style={[styles.amounts, { color: colors.textSecondary }]}>
                          {formatShort(budget.spent)} / {formatShort(budget.limitAmount)}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.pctBadge, { backgroundColor: statusColor + '20' }]}>
                      <Text style={[styles.pctText, { color: statusColor }]}>
                        {Math.round(ratio * 100)}%
                      </Text>
                    </View>
                  </View>
                  <ProgressBar spent={budget.spent} limit={budget.limitAmount} />
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('BudgetForm', {})}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 24, fontWeight: '700' },
  monthPicker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, marginBottom: 4,
  },
  arrow: { paddingHorizontal: 12, paddingVertical: 4 },
  monthLabel: { fontSize: 15, fontWeight: '600', minWidth: 160, textAlign: 'center' },
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { fontSize: 15 },
  card: {
    padding: 16, borderRadius: 12, marginBottom: 12,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  categoryIcon: { fontSize: 24 },
  categoryName: { fontSize: 16, fontWeight: '600' },
  amounts: { fontSize: 13, marginTop: 2 },
  pctBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pctText: { fontSize: 13, fontWeight: '700' },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 30, fontWeight: '300' },
});
