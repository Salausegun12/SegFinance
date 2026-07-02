import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  Modal, FlatList, ActivityIndicator, Platform, SectionList,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { transactionsApi } from '../api/transactions';
import { TransactionsStackParamList } from '../navigation/types';
import { Transaction } from '../types';

const EXPENSE_CATEGORIES = [
  'Food', 'Transport', 'Fuel', 'Airtime', 'Internet', 'Bills',
  'Rent', 'Shopping', 'Education', 'Entertainment', 'Medical',
  'Investment', 'Charity', 'Others',
];

const INCOME_CATEGORIES = [
  'Salary', 'Freelance', 'Business', 'Gift', 'Investment',
];

const PAYMENT_METHODS = ['Cash', 'Card', 'Bank Transfer', 'Other'];

type NavProp = NativeStackNavigationProp<TransactionsStackParamList, 'TransactionsMain'>;

type Section = { title: string; data: Transaction[] };

export default function TransactionsScreen() {
  const { colors, borderRadius } = useTheme();
  const navigation = useNavigation<NavProp>();

  const [data, setData] = useState<Transaction[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const [filterFrom, setFilterFrom] = useState<Date | undefined>();
  const [filterTo, setFilterTo] = useState<Date | undefined>();
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [showPayPicker, setShowPayPicker] = useState(false);

  const [exporting, setExporting] = useState(false);

  const hasActiveFilters = !!filterFrom || !!filterTo || !!filterCategory || !!filterPaymentMethod;

  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const buildParams = useCallback((pageNum: number) => {
    const params: Record<string, string> = {
      page: String(pageNum),
      limit: '20',
      sortBy,
      sortOrder,
    };
    if (filterCategory) params.category = filterCategory;
    if (filterPaymentMethod) params.paymentMethod = filterPaymentMethod;
    if (filterFrom) params.from = filterFrom.toISOString();
    if (filterTo) params.to = filterTo.toISOString();
    if (search.trim()) params.search = search.trim();
    return params;
  }, [sortBy, sortOrder, filterCategory, filterPaymentMethod, filterFrom, filterTo, search]);

  const loadPage = useCallback(async (pageNum: number, append: boolean) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const res = await transactionsApi.getAll(buildParams(pageNum));
      if (append) {
        setData((prev) => [...prev, ...res.data]);
      } else {
        setData(res.data);
      }
      setHasMore(pageNum < res.totalPages);
      setPage(pageNum);
    } catch {
      Alert.alert('Error', 'Failed to load transactions');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [buildParams]);

  useEffect(() => {
    loadPage(1, false);
  }, [loadPage]);

  const loadMore = () => {
    if (!loadingMore && hasMore) loadPage(page + 1, true);
  };

  const refresh = () => {
    setRefreshing(true);
    loadPage(1, false);
  };

  const applyFilters = () => {
    setShowFilterSheet(false);
    loadPage(1, false);
  };

  const clearFilters = () => {
    setFilterFrom(undefined);
    setFilterTo(undefined);
    setFilterCategory('');
    setFilterPaymentMethod('');
    setShowFilterSheet(false);
    setSearch('');
    loadPage(1, false);
  };

  const toggleSort = (field: 'date' | 'amount') => {
    if (sortBy === field) {
      setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const csv = await transactionsApi.exportCsv();
      const file = new File(Paths.document, `transactions-${Date.now()}.csv`);
      file.create();
      file.write(csv);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'text/csv' });
      } else {
        Alert.alert('Exported', 'File saved to device.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const sections: Section[] = (() => {
    const groups: Record<string, Transaction[]> = {};
    data.forEach((t) => {
      const key = formatDate(new Date(t.date));
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => (sortOrder === 'desc' ? b.localeCompare(a) : a.localeCompare(b)))
      .map(([title, items]) => ({ title, data: items }));
  })();

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const isExpense = item.type === 'EXPENSE';
    return (
      <TouchableOpacity
        style={[styles.row, { borderBottomColor: colors.border }]}
        onPress={() => navigation.navigate('TransactionForm', { transactionId: item.id })}
      >
        <View style={[styles.categoryIcon, { backgroundColor: isExpense ? colors.errorContainer : colors.successContainer }]}>
          <Text style={[styles.categoryIconText, { color: isExpense ? colors.error : colors.success }]}>
            {item.category[0]}
          </Text>
        </View>
        <View style={styles.rowBody}>
          <Text style={[styles.rowCategory, { color: colors.text }]}>{item.category}</Text>
          {item.description ? (
            <Text style={[styles.rowDescription, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.description}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.rowAmount, { color: isExpense ? colors.error : colors.success }]}>
          {isExpense ? '-' : '+'}{Number(item.amount).toFixed(2)}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: Section }) => (
    <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
      <Text style={[styles.sectionHeaderText, { color: colors.textSecondary }]}>{section.title}</Text>
    </View>
  );

  const renderDatePicker = (
    label: string,
    value: Date | undefined,
    show: boolean,
    onOpen: () => void,
    onChange: (_: DateTimePickerEvent, d?: Date) => void,
    onClose: () => void,
  ) => (
    <>
      <TouchableOpacity
        style={[styles.filterSelector, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: borderRadius.md }]}
        onPress={onOpen}
      >
        <Text style={[styles.filterSelectorText, { color: value ? colors.text : colors.textSecondary }]}>
          {value ? formatDate(value) : label}
        </Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker value={value ?? new Date()} mode="date" display="default" onChange={onChange} />
      )}
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Transactions</Text>
        <TouchableOpacity
          style={[styles.exportBtn, { borderColor: colors.border, borderRadius: borderRadius.md }]}
          onPress={handleExport}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Text style={[styles.exportText, { color: colors.text }]}>Export CSV</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, borderRadius: borderRadius.md }]}
          placeholder="Search transactions..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => loadPage(1, false)}
          returnKeyType="search"
        />
        <TouchableOpacity
          style={[styles.filterBtn, { backgroundColor: hasActiveFilters ? colors.primaryContainer : colors.surface, borderColor: colors.border, borderRadius: borderRadius.md }]}
          onPress={() => setShowFilterSheet(true)}
        >
          <Text style={[styles.filterBtnText, { color: hasActiveFilters ? colors.primary : colors.text }]}>
            Filters
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sortRow}>
        <TouchableOpacity style={styles.sortChip} onPress={() => toggleSort('date')}>
          <Text style={[styles.sortChipText, { color: sortBy === 'date' ? colors.primary : colors.textSecondary }]}>
            Date {sortBy === 'date' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sortChip} onPress={() => toggleSort('amount')}>
          <Text style={[styles.sortChipText, { color: sortBy === 'amount' ? colors.primary : colors.textSecondary }]}>
            Amount {sortBy === 'amount' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      ) : data.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No transactions found</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          refreshing={refreshing}
          onRefresh={refresh}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" />
              </View>
            ) : null
          }
        />
      )}

      <Modal visible={showFilterSheet} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Filters</Text>

            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Date Range</Text>
            <View style={styles.filterRow}>
              {renderDatePicker('From', filterFrom, showFromPicker, () => setShowFromPicker(true), (_e, d) => { setShowFromPicker(false); if (d) setFilterFrom(d); }, () => setShowFromPicker(false))}
              {renderDatePicker('To', filterTo, showToPicker, () => setShowToPicker(true), (_e, d) => { setShowToPicker(false); if (d) setFilterTo(d); }, () => setShowToPicker(false))}
            </View>

            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Category</Text>
            <TouchableOpacity
              style={[styles.filterSelector, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: borderRadius.md }]}
              onPress={() => setShowCatPicker(true)}
            >
              <Text style={[styles.filterSelectorText, { color: filterCategory ? colors.text : colors.textSecondary }]}>
                {filterCategory || 'All'}
              </Text>
            </TouchableOpacity>

            <Modal visible={showCatPicker} transparent animationType="slide">
              <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Category</Text>
                  <FlatList
                    data={[...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES.filter((c) => !EXPENSE_CATEGORIES.includes(c))]}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[styles.pickerItem, { backgroundColor: filterCategory === item ? colors.primaryContainer : 'transparent' }]}
                        onPress={() => { setFilterCategory(item); setShowCatPicker(false); }}
                      >
                        <Text style={[styles.pickerItemText, { color: colors.text }]}>{item}</Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              </View>
            </Modal>

            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Payment Method</Text>
            <TouchableOpacity
              style={[styles.filterSelector, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: borderRadius.md }]}
              onPress={() => setShowPayPicker(true)}
            >
              <Text style={[styles.filterSelectorText, { color: filterPaymentMethod ? colors.text : colors.textSecondary }]}>
                {filterPaymentMethod || 'All'}
              </Text>
            </TouchableOpacity>

            <Modal visible={showPayPicker} transparent animationType="slide">
              <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Payment Method</Text>
                  <FlatList
                    data={PAYMENT_METHODS}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[styles.pickerItem, { backgroundColor: filterPaymentMethod === item ? colors.primaryContainer : 'transparent' }]}
                        onPress={() => { setFilterPaymentMethod(item); setShowPayPicker(false); }}
                      >
                        <Text style={[styles.pickerItemText, { color: colors.text }]}>{item}</Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              </View>
            </Modal>

            <View style={styles.filterActions}>
              <TouchableOpacity
                style={[styles.filterActionBtn, { borderColor: colors.border, borderRadius: borderRadius.md }]}
                onPress={clearFilters}
              >
                <Text style={[styles.filterActionText, { color: colors.text }]}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterActionBtn, styles.filterActionPrimary, { backgroundColor: colors.primary, borderRadius: borderRadius.md }]}
                onPress={applyFilters}
              >
                <Text style={[styles.filterActionText, { color: colors.textOnPrimary }]}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  exportBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  exportText: {
    fontSize: 13,
    fontWeight: '600',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  filterBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sortRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sortChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryIconText: {
    fontSize: 16,
    fontWeight: '700',
  },
  rowBody: {
    flex: 1,
  },
  rowCategory: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  rowAmount: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  footerLoader: {
    padding: 16,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterSelector: {
    flex: 1,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filterSelectorText: {
    fontSize: 14,
  },
  pickerItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  pickerItemText: {
    fontSize: 16,
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  filterActionBtn: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  filterActionPrimary: {
    borderWidth: 0,
  },
  filterActionText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
