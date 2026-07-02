import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as WebBrowser from 'expo-web-browser';
import { useIdTokenAuthRequest } from 'expo-auth-session/providers/google';
import { useTheme } from '../theme';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';
import { AuthStackParamList } from '../navigation/types';

WebBrowser.maybeCompleteAuthSession();

type SignUpForm = {
  name: string;
  email: string;
  password: string;
};

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'SignUp'>;

export default function SignUpScreen() {
  const { colors, spacing, borderRadius } = useTheme();
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigation = useNavigation<NavProp>();
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpForm>({
    defaultValues: { name: '', email: '', password: '' },
  });

  const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  const [, googleResponse, promptGoogle] = useIdTokenAuthRequest(
    googleClientId ? { clientId: googleClientId } : ({} as any)
  );

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const idToken = googleResponse.params?.id_token;
      if (!idToken) {
        Alert.alert('Error', 'Failed to get Google ID token');
        return;
      }
      handleGoogleSignIn(idToken);
    }
  }, [googleResponse]);

  const handleGoogleSignIn = async (idToken: string) => {
    setGoogleLoading(true);
    try {
      const res = await authApi.google({ idToken });
      await setAuth(res.user, res.token);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Google Sign-In failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  const onSubmit = useCallback(async (data: SignUpForm) => {
    try {
      const res = await authApi.register({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      await setAuth(res.user, res.token);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Registration failed');
    }
  }, [setAuth]);

  const inputStyle = (hasError: boolean) => ({
    backgroundColor: colors.surface,
    color: colors.text,
    borderColor: hasError ? colors.error : colors.border,
    borderRadius: borderRadius.md,
  });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>

      <Controller
        control={control}
        name="name"
        rules={{ required: 'Name is required' }}
        render={({ field: { onChange, onBlur, value } }) => (
          <>
            <TextInput
              style={[styles.input, inputStyle(!!errors.name)]}
              placeholder="Full Name"
              placeholderTextColor={colors.textSecondary}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              autoCapitalize="words"
            />
            {errors.name && (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.name.message}</Text>
            )}
          </>
        )}
      />

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

      <Controller
        control={control}
        name="password"
        rules={{
          required: 'Password is required',
          minLength: { value: 6, message: 'Password must be at least 6 characters' },
        }}
        render={({ field: { onChange, onBlur, value } }) => (
          <>
            <TextInput
              style={[styles.input, inputStyle(!!errors.password)]}
              placeholder="Password"
              placeholderTextColor={colors.textSecondary}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              secureTextEntry
            />
            {errors.password && (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.password.message}</Text>
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
          {isSubmitting ? 'Creating Account...' : 'Sign Up'}
        </Text>
      </TouchableOpacity>

      {googleClientId && (
        <TouchableOpacity
          style={[styles.googleButton, { borderColor: colors.border, borderRadius: borderRadius.md }]}
          onPress={() => promptGoogle()}
          disabled={googleLoading}
        >
          {googleLoading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={[styles.buttonText, { color: colors.text }]}>Sign up with Google</Text>
          )}
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.linkContainer}
        onPress={() => navigation.goBack()}
      >
        <Text style={[styles.linkText, { color: colors.textSecondary }]}>
          Already have an account?{' '}
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Log In</Text>
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    justifyContent: 'center',
    padding: 24,
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 36,
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
  googleButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
  },
  linkContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  linkText: {
    fontSize: 14,
  },
});
