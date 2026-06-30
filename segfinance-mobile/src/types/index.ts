export type User = {
  id: string;
  email: string;
  name: string;
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

export type AuthResponse = {
  user: User;
  token: string;
};

export type Transaction = {
  id: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  category: string;
  date: string;
};

export type Account = {
  id: string;
  name: string;
  balance: number;
  currency: string;
  type: 'checking' | 'savings' | 'credit' | 'investment';
};
