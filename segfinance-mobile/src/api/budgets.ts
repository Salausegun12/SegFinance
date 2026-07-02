import { api } from './client';
import type { Budget, CreateBudgetData } from '../types';

export function getBudgets(month?: string): Promise<{ data: Budget[] }> {
  const params = month ? `?month=${month}` : '';
  return api.get<{ data: Budget[] }>(`/budgets${params}`);
}

export function createBudget(data: CreateBudgetData): Promise<Budget> {
  return api.post<Budget>('/budgets', data);
}

export function updateBudget(id: string, data: Partial<CreateBudgetData>): Promise<Budget> {
  return api.patch<Budget>(`/budgets/${id}`, data);
}

export function deleteBudget(id: string): Promise<{ message: string }> {
  return api.delete<{ message: string }>(`/budgets/${id}`);
}
