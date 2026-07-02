import { api, apiRequest } from './client';
import { useAuthStore } from '../store/authStore';
import {
  Transaction,
  CreateTransactionData,
  PaginatedResponse,
} from '../types';

export const transactionsApi = {
  getAll: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get<PaginatedResponse<Transaction>>(`/transactions${query}`);
  },
  getById: (id: string) => api.get<{ transaction: Transaction }>(`/transactions/${id}`),
  create: (data: CreateTransactionData) =>
    api.post<{ transaction: Transaction }>('/transactions', data),
  update: (id: string, data: Partial<CreateTransactionData>) =>
    api.patch<{ transaction: Transaction }>(`/transactions/${id}`, data),
  remove: (id: string) =>
    api.delete<{ message: string }>(`/transactions/${id}`),
  exportCsv: async (): Promise<string> => {
    const token = useAuthStore.getState().token;
    const base = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';
    const res = await fetch(`${base}/transactions/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Export failed');
    return res.text();
  },
};
