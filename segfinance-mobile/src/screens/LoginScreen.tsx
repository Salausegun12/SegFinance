import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
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

type LoginForm = {
  email: string;
  password: string;
};

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export default function LoginScreen() {
  const { colors, spacing, borderRadius } = useTheme();
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigation = useNavigation<NavProp>();
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    defaultValues: { email: '', password: '' },
  });

  const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  const [, googleResponse, promptGoogle] = useIdTokenAuthRequest(
    { clientId: googleClientId ?? '' }
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

  const onSubmit = useCallback(async (data: LoginForm) => {
    try {
      const res = await authApi.login({ email: data.email, password: data.password });
      await setAuth(res.user, res.token);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Login failed');
    }
  }, [setAuth]);

  const inputStyle = (hasError: boolean) => ({
    backgroundColor: colors.surface,
    color: colors.text,
    borderColor: hasError ? colors.error : colors.border,
    borderRadius: borderRadius.md,
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>SegFinance</Text>

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
          {isSubmitting ? 'Signing In...' : 'Log In'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.googleButton, { borderColor: colors.border, borderRadius: borderRadius.md }]}
        onPress={() => {
          if (!googleClientId) {
            Alert.alert('Not Configured', 'Google Sign-In requires a Google Client ID.');
            return;
          }
          promptGoogle();
        }}
        disabled={googleLoading}
      >
        {googleLoading ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={[styles.buttonText, { color: colors.text }]}>Sign in with Google</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkContainer}
        onPress={() => navigation.navigate('SignUp')}
      >
        <Text style={[styles.linkText, { color: colors.textSecondary }]}>
          Don't have an account?{' '}
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Sign Up</Text>
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkContainer}
        onPress={() => navigation.navigate('ForgotPassword')}
      >
        <Text style={[styles.linkText, { color: colors.primary }]}>Forgot Password?</Text>
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
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 48,
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
    marginTop: 20,
  },
  linkText: {
    fontSize: 14,
  },
});
