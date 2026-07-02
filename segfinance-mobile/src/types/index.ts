export type User = {
  id: string;
  email: string;
  name: string;
  photoUrl?: string | null;
  currency?: string;
  monthlyIncome?: number | null;
  financialGoalAmount?: number | null;
};

export type UpdateProfileData = {
  name?: string;
  currency?: string;
  monthlyIncome?: number;
  financialGoalAmount?: number;
};

export type AuthState = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type RegisterCredentials = {
  email: string;
  password: string;
  name: string;
};

export type GoogleSignInCredentials = {
  idToken: string;
};

export type ForgotPasswordCredentials = {
  email: string;
};

export type ResetPasswordCredentials = {
  token: string;
  newPassword: string;
};

export type AuthResponse = {
  user: User;
  token: string;
};

export type ForgotPasswordResponse = {
  message: string;
};

export type ResetPasswordResponse = {
  message: string;
};

export type Transaction = {
  id: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  description?: string | null;
  paymentMethod: string;
  date: string;
  createdAt: string;
};

export type CreateTransactionData = {
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  description?: string;
  paymentMethod: string;
  date: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type Account = {
  id: string;
  name: string;
  balance: number;
  currency: string;
  type: 'checking' | 'savings' | 'credit' | 'investment';
};

export type DashboardData = {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  remainingBudget: number;
  dailySpendingAverage: number;
};

export type CategoryBreakdownItem = {
  category: string;
  total: number;
};

export type TrendItem = {
  label: string;
  income: number;
  expenses: number;
};

export type Budget = {
  id: string;
  userId: string;
  category: string;
  limitAmount: number;
  month: string;
  createdAt: string;
  spent: number;
};

export type CreateBudgetData = {
  category: string;
  limitAmount: number;
  month: string;
};
