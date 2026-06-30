import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme';
import { useAuthStore } from '../store/authStore';

export default function HomeScreen() {
  const { colors, spacing } = useTheme();
  const user = useAuthStore((s) => s.user);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.greeting, { color: colors.text }]}>
        Welcome, {user?.name ?? 'User'}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Your financial overview
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
  },
});
