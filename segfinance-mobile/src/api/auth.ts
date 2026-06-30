import { api } from './client';
import { LoginCredentials, RegisterCredentials, AuthResponse } from '../types';

export const authApi = {
  login: (credentials: LoginCredentials) =>
    api.post<AuthResponse>('/auth/login', credentials),

  register: (credentials: RegisterCredentials) =>
    api.post<AuthResponse>('/auth/register', credentials),

  me: () => api.get<{ user: AuthResponse['user'] }>('/auth/me'),
};
