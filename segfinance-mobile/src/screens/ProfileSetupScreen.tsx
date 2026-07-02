import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  Modal, FlatList, Image, ScrollView, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../theme';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';

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

const STEPS = ['Name & Photo', 'Currency', 'Monthly Income', 'Goal Amount'];

export default function ProfileSetupScreen() {
  const { colors, spacing, borderRadius } = useTheme();
  const { updateUser, setSetupComplete } = useAuthStore();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [currency, setCurrency] = useState('NGN');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [financialGoalAmount, setFinancialGoalAmount] = useState('');
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

  const nextStep = () => {
    if (step === 0 && !name.trim()) {
      Alert.alert('Required', 'Please enter your name.');
      return;
    }
    if (step < 3) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  const finish = async () => {
    setSaving(true);
    try {
      let photoUrl: string | undefined;

      if (photoUri) {
        const photoRes = await authApi.uploadPhoto(photoUri);
        photoUrl = photoRes.user.photoUrl ?? undefined;
      }

      const profileRes = await authApi.updateProfile({
        name: name.trim(),
        currency,
        monthlyIncome: monthlyIncome ? parseFloat(monthlyIncome) : undefined,
        financialGoalAmount: financialGoalAmount ? parseFloat(financialGoalAmount) : undefined,
      });

      await updateUser(profileRes.user);
      await setSetupComplete();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const stepIndicator = (
    <View style={styles.stepRow}>
      {STEPS.map((label, i) => (
        <View key={label} style={styles.stepItem}>
          <View
            style={[
              styles.stepDot,
              { backgroundColor: i <= step ? colors.primary : colors.border },
            ]}
          >
            <Text style={[styles.stepDotText, { color: i <= step ? colors.textOnPrimary : colors.textSecondary }]}>
              {i + 1}
            </Text>
          </View>
          <Text style={[styles.stepLabel, { color: i <= step ? colors.primary : colors.textSecondary }]}>
            {label}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.heading, { color: colors.text }]}>What's your name?</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, borderRadius: borderRadius.md }]}
              placeholder="Full Name"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
            <TouchableOpacity
              style={[styles.photoButton, { borderColor: colors.border, borderRadius: borderRadius.md }]}
              onPress={pickPhoto}
            >
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={[styles.photoPreview, { borderRadius: borderRadius.lg }]} />
              ) : (
                <Text style={[styles.photoPlaceholder, { color: colors.textSecondary }]}>Tap to add a profile photo</Text>
              )}
            </TouchableOpacity>
          </View>
        );

      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.heading, { color: colors.text }]}>Select your currency</Text>
            <TouchableOpacity
              style={[styles.currencySelector, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: borderRadius.md }]}
              onPress={() => setShowCurrencyPicker(true)}
            >
              <Text style={[styles.currencyText, { color: colors.text }]}>
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
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.heading, { color: colors.text }]}>Monthly Income</Text>
            <Text style={[styles.subheading, { color: colors.textSecondary }]}>How much do you earn per month?</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, borderRadius: borderRadius.md }]}
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              value={monthlyIncome}
              onChangeText={setMonthlyIncome}
              keyboardType="decimal-pad"
            />
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.heading, { color: colors.text }]}>Financial Goal</Text>
            <Text style={[styles.subheading, { color: colors.textSecondary }]}>What's your savings target?</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, borderRadius: borderRadius.md }]}
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              value={financialGoalAmount}
              onChangeText={setFinancialGoalAmount}
              keyboardType="decimal-pad"
            />
          </View>
        );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Set Up Your Profile</Text>
      {stepIndicator}

      <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
        {renderStep()}
      </ScrollView>

      <View style={styles.footer}>
        {step > 0 && (
          <TouchableOpacity
            style={[styles.footerButton, { borderColor: colors.border, borderRadius: borderRadius.md }]}
            onPress={prevStep}
            disabled={saving}
          >
            <Text style={[styles.footerButtonText, { color: colors.text }]}>Back</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.footerButton,
            styles.primaryButton,
            { backgroundColor: colors.primary, borderRadius: borderRadius.md, opacity: saving ? 0.6 : 1 },
          ]}
          onPress={step < 3 ? nextStep : finish}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.textOnPrimary} />
          ) : (
            <Text style={[styles.footerButtonText, { color: colors.textOnPrimary }]}>
              {step < 3 ? 'Next' : 'Finish'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepDotText: {
    fontSize: 13,
    fontWeight: '700',
  },
  stepLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  body: {
    flex: 1,
  },
  stepContent: {
    flex: 1,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  subheading: {
    fontSize: 14,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    padding: 16,
    fontSize: 16,
    marginTop: 12,
  },
  photoButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 120,
  },
  photoPreview: {
    width: 100,
    height: 100,
  },
  photoPlaceholder: {
    fontSize: 14,
  },
  currencySelector: {
    borderWidth: 1,
    padding: 16,
    marginTop: 12,
  },
  currencyText: {
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
  currencyItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  currencyItemText: {
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 16,
  },
  footerButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  primaryButton: {
    borderWidth: 0,
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
