export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
};

export type HomeStackParamList = {
  HomeMain: undefined;
  TransactionForm: { transactionId?: string } | undefined;
};

export type TransactionsStackParamList = {
  TransactionsMain: { refresh?: number } | undefined;
  TransactionForm: { transactionId: string };
};

export type BudgetsStackParamList = {
  BudgetsMain: undefined;
  BudgetForm: { budgetId?: string } | undefined;
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  Settings: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Transactions: undefined;
  Budgets: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  ProfileSetup: undefined;
  Main: undefined;
};
