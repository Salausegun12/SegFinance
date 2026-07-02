import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { User } from '../types';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const SETUP_KEY = 'setup_complete';

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setupComplete: boolean;
  setAuth: (user: User, token: string) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  setSetupComplete: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  setupComplete: false,

  setAuth: async (user: User, token: string) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    set({ user, token, isLoading: false });
  },

  updateUser: async (user: User) => {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    set({ user });
  },

  setSetupComplete: async () => {
    await SecureStore.setItemAsync(SETUP_KEY, 'true');
    set({ setupComplete: true });
  },

  loadStoredAuth: async () => {
    try {
      const [token, userJson, setupRaw] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY),
        SecureStore.getItemAsync(SETUP_KEY),
      ]);
      if (token && userJson) {
        const user: User = JSON.parse(userJson);
        set({ user, token, setupComplete: setupRaw === 'true', isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
      SecureStore.deleteItemAsync(SETUP_KEY),
    ]);
    set({ user: null, token: null, setupComplete: false, isLoading: false });
  },
}));
