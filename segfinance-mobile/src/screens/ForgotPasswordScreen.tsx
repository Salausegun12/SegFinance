import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useCallback, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { authApi } from '../api/auth';
import { AuthStackParamList } from '../navigation/types';

type ForgotPasswordForm = {
  email: string;
};

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen() {
  const { colors, borderRadius } = useTheme();
  const navigation = useNavigation<NavProp>();
  const [sent, setSent] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordForm>({
    defaultValues: { email: '' },
  });

  const onSubmit = useCallback(async (data: ForgotPasswordForm) => {
    try {
      await authApi.forgotPassword({ email: data.email });
      setSent(true);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Request failed');
    }
  }, []);

  const inputStyle = (hasError: boolean) => ({
    backgroundColor: colors.surface,
    color: colors.text,
    borderColor: hasError ? colors.error : colors.border,
    borderRadius: borderRadius.md,
  });

  if (sent) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Check Your Email</Text>
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          If an account with that email exists, we've sent a password reset link. Please check your
          inbox and follow the instructions.
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary, borderRadius: borderRadius.md }]}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={[styles.buttonText, { color: colors.textOnPrimary }]}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Reset Password</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        Enter your email address and we'll send you a link to reset your password.
      </Text>

      <Controller
        control={control}
        name="email"
        rules={{
          required: 'Email is required',
          pattern: { value: /^\S+@\S+$/i, message: 'Invalid email address' },
        }}
        render={({ field: { onChange, onBlur, value } }) => (
          <>
            <TextInput
              style={[styles.input, inputStyle(!!errors.email)]}
              placeholder="Email"
              placeholderTextColor={colors.textSecondary}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {errors.email && (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.email.message}</Text>
            )}
          </>
        )}
      />

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary, borderRadius: borderRadius.md }]}
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
      >
        <Text style={[styles.buttonText, { color: colors.textOnPrimary }]}>
          {isSubmitting ? 'Sending...' : 'Send Reset Link'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkContainer}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={[styles.linkText, { color: colors.primary }]}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  input: {
    borderWidth: 1,
    padding: 16,
    fontSize: 16,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    marginBottom: 12,
    marginLeft: 4,
  },
  button: {
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  linkContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  linkText: {
    fontSize: 14,
  },
});
