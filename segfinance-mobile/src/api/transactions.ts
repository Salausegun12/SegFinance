import { api } from './client';
import { Transaction } from '../types';

export const transactionsApi = {
  getAll: () => api.get<Transaction[]>('/transactions'),
  getById: (id: string) => api.get<Transaction>(`/transactions/${id}`),
};
