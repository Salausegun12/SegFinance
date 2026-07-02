import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, RefreshControl, TouchableOpacity, Animated,
  Dimensions, StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { useTheme } from '../theme';
import { useAuthStore } from '../store/authStore';
import { HomeStackParamList } from '../navigation/types';
import type { DashboardData, CategoryBreakdownItem, TrendItem } from '../types';
import { getDashboard, getCategoryBreakdown, getTrend } from '../api/analytics';

type NavProp = NativeStackNavigationProp<HomeStackParamList, 'HomeMain'>;

const CHART_COLORS = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
  '#FF9F40', '#C9CBCF', '#FF6384', '#36A2EB', '#FFCE56',
];

const screenWidth = Dimensions.get('window').width - 32;

function formatCurrency(amount: number): string {
  return `₦${Math.round(amount).toLocaleString()}`;
}

function formatShort(amount: number): string {
  if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(1)}K`;
  return `₦${Math.round(amount).toLocaleString()}`;
}

function SkeletonCard({ style }: { style?: object }) {
  const opacity = useRef(new Animated.Value(0.3));
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity.current, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity.current, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);
  return (
    <Animated.View style={[{ opacity: opacity.current, backgroundColor: '#E0E0E0', borderRadius: 12 }, style]} />
  );
}

function SummaryCard({
  label, value, color, accent,
}: {
  label: string; value: string; color: string; accent: string;
}) {
  return (
    <View style={[styles.card, { backgroundColor: color, borderLeftColor: accent, borderLeftWidth: 4 }]}>
      <Text style={[styles.cardLabel, { color: accent }]}>{label}</Text>
      <Text style={[styles.cardValue, { color: accent === '#fff' ? '#fff' : '#1A1A2E' }]}>{value}</Text>
    </View>
  );
}

function MonthPicker({
  current, onChange,
}: {
  current: string; onChange: (m: string) => void;
}) {
  const [y, m] = current.split('-').map(Number);
  const goBack = () => {
    const d = new Date(y, m - 2, 1);
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const goForward = () => {
    const d = new Date(y, m, 1);
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const now = new Date();
  const currentLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const isCurrent = current === currentLabel;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return (
    <View style={styles.monthPicker}>
      <TouchableOpacity onPress={goBack} style={styles.monthArrow}>
        <Text style={{ fontSize: 18, color: '#666' }}>{'<'}</Text>
      </TouchableOpacity>
      <Text style={styles.monthLabel}>
        {months[m - 1]} {y}{isCurrent ? ' (This Month)' : ''}
      </Text>
      <TouchableOpacity onPress={goForward} style={styles.monthArrow} disabled={isCurrent}>
        <Text style={{ fontSize: 18, color: isCurrent ? '#ccc' : '#666' }}>{'>'}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function HomeScreen() {
  const { colors, spacing, borderRadius } = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const navigation = useNavigation<NavProp>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [breakdown, setBreakdown] = useState<CategoryBreakdownItem[]>([]);
  const [trend, setTrend] = useState<TrendItem[]>([]);
  const [trendRange, setTrendRange] = useState<'weekly' | 'monthly'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const fetchData = useCallback(async (month: string, range: string, isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const [dash, cat, tr] = await Promise.all([
        getDashboard(month),
        getCategoryBreakdown(month),
        getTrend(range as 'weekly' | 'monthly'),
      ]);
      setDashboard(dash);
      setBreakdown(cat.data);
      setTrend(tr.data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData(selectedMonth, trendRange);
  }, [selectedMonth, trendRange, fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(selectedMonth, trendRange, true);
  }, [selectedMonth, trendRange, fetchData]);

  const handleMonthChange = (m: string) => {
    setSelectedMonth(m);
  };

  const pieData = breakdown.map((item, i) => ({
    name: item.category,
    population: item.total,
    color: CHART_COLORS[i % CHART_COLORS.length],
    legendFontColor: colors.textSecondary,
    legendFontSize: 12,
  }));

  const trendLabels = trend.map((t) => {
    if (trendRange === 'monthly') {
      return t.label.slice(5);
    }
    const d = new Date(t.label);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  });

  const trendIncomeData = trend.map((t) => t.income);
  const trendExpenseData = trend.map((t) => t.expenses);

  const barData = {
    labels: trendLabels,
    datasets: [
      { data: trendIncomeData.length ? trendIncomeData : [0], color: () => colors.success },
      { data: trendExpenseData.length ? trendExpenseData : [0], color: () => colors.error },
    ],
  };

  const chartConfig = {
    backgroundColor: colors.card,
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalCount: 0,
    color: () => colors.textSecondary,
    labelColor: () => colors.textSecondary,
    propsForBackgroundLines: { stroke: colors.border },
    propsForLabels: { fontSize: 10 },
    barPercentage: 0.6,
  };

  if (loading && !dashboard) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.skeletonHeader}>
          <SkeletonCard style={{ width: 180, height: 24 }} />
          <SkeletonCard style={{ width: 120, height: 16, marginTop: 8 }} />
        </View>
        <View style={styles.skeletonGrid}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} style={{ width: (screenWidth - 12) / 2, height: 80 }} />
          ))}
        </View>
        <SkeletonCard style={{ width: screenWidth, height: 200, marginTop: 16 }} />
        <SkeletonCard style={{ width: screenWidth, height: 220, marginTop: 16 }} />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, { color: colors.text }]}>
            Welcome, {user?.name ?? 'User'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Your financial overview
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary, borderRadius: borderRadius.md }]}
          onPress={() => navigation.navigate('TransactionForm', {})}
        >
          <Text style={[styles.addBtnText, { color: colors.textOnPrimary }]}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <MonthPicker current={selectedMonth} onChange={handleMonthChange} />

      {error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.errorContainer }]}>
          <Text style={{ color: colors.error }}>{error}</Text>
        </View>
      )}

      {dashboard && (
        <>
          <View style={styles.cardGrid}>
            <SummaryCard
              label="Total Balance"
              value={formatCurrency(dashboard.totalBalance)}
              color={colors.surface}
              accent={colors.primary}
            />
            <SummaryCard
              label="Income"
              value={formatShort(dashboard.totalIncome)}
              color={colors.successContainer}
              accent={colors.success}
            />
            <SummaryCard
              label="Expenses"
              value={formatShort(dashboard.totalExpenses)}
              color={colors.errorContainer}
              accent={colors.error}
            />
            <SummaryCard
              label="Savings"
              value={formatShort(dashboard.totalSavings)}
              color={colors.surface}
              accent={colors.warning}
            />
            <SummaryCard
              label="Remaining Budget"
              value={formatCurrency(dashboard.remainingBudget)}
              color={colors.primaryContainer}
              accent={colors.primary}
            />
            <SummaryCard
              label="Daily Avg"
              value={formatShort(dashboard.dailySpendingAverage)}
              color={colors.surface}
              accent={colors.secondary}
            />
          </View>

          {breakdown.length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Spending by Category</Text>
              <PieChart
                data={pieData}
                width={screenWidth - 32}
                height={200}
                chartConfig={chartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute={false}
              />
            </View>
          )}

          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Income vs Expenses</Text>
              <View style={styles.toggleGroup}>
                <TouchableOpacity
                  style={[styles.toggleBtn, trendRange === 'weekly' && { backgroundColor: colors.primary }]}
                  onPress={() => setTrendRange('weekly')}
                >
                  <Text style={[styles.toggleText, { color: trendRange === 'weekly' ? colors.textOnPrimary : colors.textSecondary }]}>Weekly</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, trendRange === 'monthly' && { backgroundColor: colors.primary }]}
                  onPress={() => setTrendRange('monthly')}
                >
                  <Text style={[styles.toggleText, { color: trendRange === 'monthly' ? colors.textOnPrimary : colors.textSecondary }]}>Monthly</Text>
                </TouchableOpacity>
              </View>
            </View>
            {trend.length > 0 ? (
              <BarChart
                data={barData}
                width={screenWidth - 32}
                height={220}
                chartConfig={chartConfig}
                yAxisLabel="₦"
                yAxisSuffix=""
                fromZero
                showBarTops={false}
                showValuesOnTopOfBars={false}
                withCustomBarColorFromData
                flatColor
                style={{ borderRadius: 8 }}
              />
            ) : (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No trend data available</Text>
            )}
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>Income</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
                <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>Expenses</Text>
              </View>
            </View>
          </View>
        </>
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 32 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  greeting: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 2 },
  addBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  addBtnText: { fontSize: 14, fontWeight: '600' },
  monthPicker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, marginHorizontal: 16,
  },
  monthArrow: { paddingHorizontal: 12, paddingVertical: 4 },
  monthLabel: { fontSize: 15, fontWeight: '600', color: '#333', minWidth: 160, textAlign: 'center' },
  errorBanner: { marginHorizontal: 16, padding: 12, borderRadius: 8, marginBottom: 8 },
  cardGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 12, gap: 8, marginTop: 8,
  },
  card: {
    width: (screenWidth - 12) / 2 - 8,
    padding: 14, borderRadius: 12,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4,
  },
  cardLabel: { fontSize: 12, fontWeight: '500', opacity: 0.8 },
  cardValue: { fontSize: 18, fontWeight: '700', marginTop: 6 },
  section: {
    marginHorizontal: 16, marginTop: 16, padding: 16,
    borderRadius: 12, elevation: 1, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  toggleGroup: { flexDirection: 'row', gap: 4 },
  toggleBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
  },
  toggleText: { fontSize: 13, fontWeight: '500' },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 12 },
  emptyText: { textAlign: 'center', paddingVertical: 40, fontSize: 14 },
  skeletonHeader: { padding: 16 },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
  loadingOverlay: { paddingVertical: 20 },
});
