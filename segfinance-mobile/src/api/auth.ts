import { api } from './client';
import {
  LoginCredentials,
  RegisterCredentials,
  GoogleSignInCredentials,
  ForgotPasswordCredentials,
  ResetPasswordCredentials,
  AuthResponse,
  ForgotPasswordResponse,
  ResetPasswordResponse,
} from '../types';

export const authApi = {
  login: (credentials: LoginCredentials) =>
    api.post<AuthResponse>('/auth/login', credentials),

  register: (credentials: RegisterCredentials) =>
    api.post<AuthResponse>('/auth/register', credentials),

  google: (credentials: GoogleSignInCredentials) =>
    api.post<AuthResponse>('/auth/google', credentials),

  forgotPassword: (credentials: ForgotPasswordCredentials) =>
    api.post<ForgotPasswordResponse>('/auth/forgot-password', credentials),

  resetPassword: (credentials: ResetPasswordCredentials) =>
    api.post<ResetPasswordResponse>('/auth/reset-password', credentials),

  me: () => api.get<{ user: AuthResponse['user'] }>('/me'),
};
