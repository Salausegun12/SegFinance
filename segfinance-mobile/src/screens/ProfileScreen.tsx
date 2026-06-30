import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme';
import { useAuthStore } from '../store/authStore';

export default function ProfileScreen() {
  const { colors, spacing, borderRadius } = useTheme();
  const { user, logout } = useAuthStore();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.card, borderRadius: borderRadius.lg }]}>
        <Text style={[styles.name, { color: colors.text }]}>{user?.name}</Text>
        <Text style={[styles.email, { color: colors.textSecondary }]}>{user?.email}</Text>
      </View>
      <TouchableOpacity
        style={[styles.logoutButton, { backgroundColor: colors.error, borderRadius: borderRadius.md }]}
        onPress={logout}
      >
        <Text style={[styles.logoutText, { color: colors.textOnPrimary }]}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    padding: 24,
    marginBottom: 16,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
  },
  email: {
    fontSize: 14,
    marginTop: 4,
  },
  logoutButton: {
    padding: 16,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
