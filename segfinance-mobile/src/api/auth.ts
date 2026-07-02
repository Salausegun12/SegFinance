import { api, apiUpload } from './client';
import {
  LoginCredentials,
  RegisterCredentials,
  GoogleSignInCredentials,
  ForgotPasswordCredentials,
  ResetPasswordCredentials,
  UpdateProfileData,
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

  updateProfile: (data: UpdateProfileData) =>
    api.patch<{ user: AuthResponse['user'] }>('/me', data),

  uploadPhoto: (uri: string) => {
    const formData = new FormData();
    const filename = uri.split('/').pop() ?? 'photo.jpg';
    const ext = filename.split('.').pop() ?? 'jpg';
    formData.append('photo', {
      uri,
      name: filename,
      type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    } as any);
    return apiUpload<{ user: AuthResponse['user'] }>('/me/photo', formData);
  },
};
