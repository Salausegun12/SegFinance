import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  Modal, FlatList, Image, ScrollView, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';
import { ProfileStackParamList } from '../navigation/types';

const CURRENCIES = [
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'XOF', name: 'West African CFA', symbol: 'CFA' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
];

type NavProp = NativeStackNavigationProp<ProfileStackParamList, 'Settings'>;

export default function SettingsScreen() {
  const { colors, borderRadius } = useTheme();
  const { user, updateUser } = useAuthStore();
  const navigation = useNavigation<NavProp>();

  const [name, setName] = useState(user?.name ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [currency, setCurrency] = useState(user?.currency ?? 'NGN');
  const [monthlyIncome, setMonthlyIncome] = useState(user?.monthlyIncome?.toString() ?? '');
  const [financialGoalAmount, setFinancialGoalAmount] = useState(user?.financialGoalAmount?.toString() ?? '');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Name cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      let updatedUser = user!;

      if (photoUri) {
        const photoRes = await authApi.uploadPhoto(photoUri);
        updatedUser = { ...updatedUser, ...photoRes.user };
      }

      const profileRes = await authApi.updateProfile({
        name: name.trim(),
        currency,
        monthlyIncome: monthlyIncome ? parseFloat(monthlyIncome) : undefined,
        financialGoalAmount: financialGoalAmount ? parseFloat(financialGoalAmount) : undefined,
      });

      updatedUser = { ...updatedUser, ...profileRes.user };
      await updateUser(updatedUser);
      Alert.alert('Saved', 'Your profile has been updated.');
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Photo</Text>
      <TouchableOpacity
        style={[styles.photoButton, { borderColor: colors.border, borderRadius: borderRadius.md }]}
        onPress={pickPhoto}
      >
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={[styles.photoPreview, { borderRadius: borderRadius.lg }]} />
        ) : user?.photoUrl ? (
          <Image source={{ uri: user.photoUrl }} style={[styles.photoPreview, { borderRadius: borderRadius.lg }]} />
        ) : (
          <Text style={[styles.photoPlaceholder, { color: colors.textSecondary }]}>Tap to change photo</Text>
        )}
      </TouchableOpacity>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, borderRadius: borderRadius.md }]}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Currency</Text>
      <TouchableOpacity
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: borderRadius.md }]}
        onPress={() => setShowCurrencyPicker(true)}
      >
        <Text style={[styles.selectorText, { color: colors.text }]}>
          {CURRENCIES.find((c) => c.code === currency)?.symbol} {currency} - {CURRENCIES.find((c) => c.code === currency)?.name}
        </Text>
      </TouchableOpacity>

      <Modal visible={showCurrencyPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Currency</Text>
            <FlatList
              data={CURRENCIES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.currencyItem, { backgroundColor: currency === item.code ? colors.primaryContainer : 'transparent' }]}
                  onPress={() => { setCurrency(item.code); setShowCurrencyPicker(false); }}
                >
                  <Text style={[styles.currencyItemText, { color: colors.text }]}>
                    {item.symbol} {item.code} - {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Monthly Income</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, borderRadius: borderRadius.md }]}
        value={monthlyIncome}
        onChangeText={setMonthlyIncome}
        keyboardType="decimal-pad"
        placeholder="0.00"
        placeholderTextColor={colors.textSecondary}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Financial Goal Amount</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, borderRadius: borderRadius.md }]}
        value={financialGoalAmount}
        onChangeText={setFinancialGoalAmount}
        keyboardType="decimal-pad"
        placeholder="0.00"
        placeholderTextColor={colors.textSecondary}
      />

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: colors.primary, borderRadius: borderRadius.md, opacity: saving ? 0.6 : 1 }]}
        onPress={save}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={colors.textOnPrimary} />
        ) : (
          <Text style={[styles.saveText, { color: colors.textOnPrimary }]}>Save Changes</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  photoButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
  },
  photoPreview: {
    width: 90,
    height: 90,
  },
  photoPlaceholder: {
    fontSize: 14,
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
  currencyItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  currencyItemText: {
    fontSize: 16,
  },
  saveButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
