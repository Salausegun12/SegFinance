import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useState } from 'react';
import { useTheme } from '../theme';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';

export default function LoginScreen() {
  const { colors, spacing, borderRadius } = useTheme();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const res = await authApi.login({ email, password });
      await setAuth(res.user, res.token);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Login failed');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>SegFinance</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, borderRadius: borderRadius.md }]}
        placeholder="Email"
        placeholderTextColor={colors.textSecondary}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, borderRadius: borderRadius.md }]}
        placeholder="Password"
        placeholderTextColor={colors.textSecondary}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary, borderRadius: borderRadius.md }]}
        onPress={handleLogin}
      >
        <Text style={[styles.buttonText, { color: colors.textOnPrimary }]}>Log In</Text>
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
    marginBottom: 16,
  },
  button: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
