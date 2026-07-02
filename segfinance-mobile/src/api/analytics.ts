import { api } from './client';
import type { DashboardData, CategoryBreakdownItem, TrendItem } from '../types';

export function getDashboard(month?: string): Promise<DashboardData> {
  const params = month ? `?month=${month}` : '';
  return api.get<DashboardData>(`/dashboard${params}`);
}

export function getCategoryBreakdown(month?: string): Promise<{ data: CategoryBreakdownItem[] }> {
  const params = month ? `?month=${month}` : '';
  return api.get<{ data: CategoryBreakdownItem[] }>(`/analytics/category-breakdown${params}`);
}

export function getTrend(range: 'weekly' | 'monthly'): Promise<{ data: TrendItem[] }> {
  return api.get<{ data: TrendItem[] }>(`/analytics/trend?range=${range}`);
}
