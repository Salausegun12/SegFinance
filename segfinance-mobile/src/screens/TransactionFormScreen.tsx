import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  Modal, FlatList, ScrollView, Platform, ActivityIndicator,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { transactionsApi } from '../api/transactions';
import { HomeStackParamList, TransactionsStackParamList } from '../navigation/types';
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

type NavProp =
  | NativeStackNavigationProp<HomeStackParamList, 'TransactionForm'>
  | NativeStackNavigationProp<TransactionsStackParamList, 'TransactionForm'>;

type HomeRoute = RouteProp<HomeStackParamList, 'TransactionForm'>;
type TransactionsRoute = RouteProp<TransactionsStackParamList, 'TransactionForm'>;

export default function TransactionFormScreen() {
  const { colors, borderRadius } = useTheme();
  const navigation = useNavigation<NavProp>();
  const homeRoute = useRoute<HomeRoute>();
  const txRoute = useRoute<TransactionsRoute>();
  const transactionId = homeRoute.params?.transactionId ?? txRoute.params?.transactionId;

  const isEditing = !!transactionId;

  const [loading, setLoading] = useState(isEditing);
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showPaymentPicker, setShowPaymentPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (transactionId) {
      transactionsApi.getById(transactionId).then((res) => {
        const t = res.transaction;
        setType(t.type);
        setAmount(String(t.amount));
        setCategory(t.category);
        setDescription(t.description ?? '');
        setPaymentMethod(t.paymentMethod);
        setDate(new Date(t.date));
      }).catch(() => {
        Alert.alert('Error', 'Failed to load transaction');
        navigation.goBack();
      }).finally(() => setLoading(false));
    }
  }, [transactionId]);

  const categories = type === 'EXPENSE' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) setDate(selectedDate);
  };

  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const submit = async () => {
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      Alert.alert('Validation', 'Please enter a valid positive amount.');
      return;
    }
    if (!category) {
      Alert.alert('Validation', 'Please select a category.');
      return;
    }
    if (!paymentMethod) {
      Alert.alert('Validation', 'Please select a payment method.');
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        amount: parsed,
        type,
        category,
        description: description || undefined,
        paymentMethod,
        date: date.toISOString(),
      };

      if (isEditing) {
        await transactionsApi.update(transactionId!, body);
        Alert.alert('Saved', 'Transaction updated.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await transactionsApi.create(body);
        Alert.alert('Success', 'Transaction added.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to save transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await transactionsApi.remove(transactionId!);
              navigation.goBack();
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: colors.text }]}>
        {isEditing ? 'Edit Transaction' : 'Add Transaction'}
      </Text>

      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            { backgroundColor: type === 'EXPENSE' ? colors.error : colors.surface, borderRadius: borderRadius.md },
          ]}
          onPress={() => { setType('EXPENSE'); setCategory(''); }}
        >
          <Text style={[styles.toggleText, { color: type === 'EXPENSE' ? colors.textOnPrimary : colors.text }]}>
            Expense
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            { backgroundColor: type === 'INCOME' ? colors.success : colors.surface, borderRadius: borderRadius.md },
          ]}
          onPress={() => { setType('INCOME'); setCategory(''); }}
        >
          <Text style={[styles.toggleText, { color: type === 'INCOME' ? colors.textOnPrimary : colors.text }]}>
            Income
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Amount</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, borderRadius: borderRadius.md }]}
        placeholder="0.00"
        placeholderTextColor={colors.textSecondary}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
      <TouchableOpacity
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: borderRadius.md }]}
        onPress={() => setShowCategoryPicker(true)}
      >
        <Text style={[styles.selectorText, { color: category ? colors.text : colors.textSecondary }]}>
          {category || 'Select a category'}
        </Text>
      </TouchableOpacity>

      <Modal visible={showCategoryPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Category</Text>
            <FlatList
              data={categories}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, { backgroundColor: category === item ? colors.primaryContainer : 'transparent' }]}
                  onPress={() => { setCategory(item); setShowCategoryPicker(false); }}
                >
                  <Text style={[styles.pickerItemText, { color: colors.text }]}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, borderRadius: borderRadius.md }]}
        placeholder="Optional"
        placeholderTextColor={colors.textSecondary}
        value={description}
        onChangeText={setDescription}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Date</Text>
      <TouchableOpacity
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: borderRadius.md }]}
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={[styles.selectorText, { color: colors.text }]}>{formatDate(date)}</Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      <Text style={[styles.label, { color: colors.textSecondary }]}>Payment Method</Text>
      <TouchableOpacity
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: borderRadius.md }]}
        onPress={() => setShowPaymentPicker(true)}
      >
        <Text style={[styles.selectorText, { color: paymentMethod ? colors.text : colors.textSecondary }]}>
          {paymentMethod || 'Select payment method'}
        </Text>
      </TouchableOpacity>

      <Modal visible={showPaymentPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Payment Method</Text>
            <FlatList
              data={PAYMENT_METHODS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, { backgroundColor: paymentMethod === item ? colors.primaryContainer : 'transparent' }]}
                  onPress={() => { setPaymentMethod(item); setShowPaymentPicker(false); }}
                >
                  <Text style={[styles.pickerItemText, { color: colors.text }]}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      <TouchableOpacity
        style={[styles.submitButton, { backgroundColor: colors.primary, borderRadius: borderRadius.md, opacity: submitting ? 0.6 : 1 }]}
        onPress={submit}
        disabled={submitting}
      >
        <Text style={[styles.submitText, { color: colors.textOnPrimary }]}>
          {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Transaction'}
        </Text>
      </TouchableOpacity>

      {isEditing && (
        <TouchableOpacity
          style={[styles.deleteButton, { borderColor: colors.error, borderRadius: borderRadius.md }]}
          onPress={confirmDelete}
        >
          <Text style={[styles.deleteText, { color: colors.error }]}>Delete Transaction</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  toggleBtn: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    padding: 14,
    fontSize: 16,
  },
  selector: {
    borderWidth: 1,
    padding: 14,
  },
  selectorText: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '60%',
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  pickerItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  pickerItemText: {
    fontSize: 16,
  },
  submitButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
  },
  deleteText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
