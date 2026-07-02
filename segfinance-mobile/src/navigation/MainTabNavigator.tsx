import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import TransactionFormScreen from '../screens/TransactionFormScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import BudgetsScreen from '../screens/BudgetsScreen';
import BudgetFormScreen from '../screens/BudgetFormScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useTheme } from '../theme';
import {
  MainTabParamList,
  HomeStackParamList,
  TransactionsStackParamList,
  BudgetsStackParamList,
  ProfileStackParamList,
} from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const TransactionsStack = createNativeStackNavigator<TransactionsStackParamList>();
const BudgetsStack = createNativeStackNavigator<BudgetsStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="TransactionForm" component={TransactionFormScreen} />
    </HomeStack.Navigator>
  );
}

function TransactionsStackNavigator() {
  return (
    <TransactionsStack.Navigator screenOptions={{ headerShown: false }}>
      <TransactionsStack.Screen name="TransactionsMain" component={TransactionsScreen} />
      <TransactionsStack.Screen name="TransactionForm" component={TransactionFormScreen} />
    </TransactionsStack.Navigator>
  );
}

function BudgetsStackNavigator() {
  return (
    <BudgetsStack.Navigator screenOptions={{ headerShown: false }}>
      <BudgetsStack.Screen name="BudgetsMain" component={BudgetsScreen} />
      <BudgetsStack.Screen name="BudgetForm" component={BudgetFormScreen} />
    </BudgetsStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="Settings" component={SettingsScreen} />
    </ProfileStack.Navigator>
  );
}

function TabIcon({ label, focused, color }: { label: string; focused: boolean; color: string }) {
  const icons: Record<string, string> = {
    Home: 'H',
    Transactions: 'T',
    Budgets: 'B',
    Profile: 'P',
  };
  return <Text style={{ color, fontWeight: focused ? '700' : '400', fontSize: 18 }}>{icons[label] ?? '?'}</Text>;
}

export default function MainTabNavigator() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color }) => <TabIcon label={route.name} focused={focused} color={color} />,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: { backgroundColor: colors.tabBar, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
      })}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen name="Transactions" component={TransactionsStackNavigator} />
      <Tab.Screen name="Budgets" component={BudgetsStackNavigator} />
      <Tab.Screen name="Profile" component={ProfileStackNavigator} />
    </Tab.Navigator>
  );
}
