import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Types
export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  profile?: {
    name?: string;
    avatar?: string;
  };
}

export interface Product {
  id: string;
  name: string;
  unit: string;
  meta_por_animal?: number;
}

export interface AppNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  timestamp: number;
  read: boolean;
}

export interface AppPreferences {
  theme: 'light' | 'dark' | 'system';
  language: 'pt' | 'en';
  hapticFeedback: boolean;
  pushNotifications: boolean;
  autoRefresh: boolean;
  offlineMode: boolean;
}

export interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;

  // Data
  products: Product[];
  productsLastUpdated: number;

  // UI State
  notifications: AppNotification[];

  // App Preferences
  preferences: AppPreferences;

  // Network State
  isOnline: boolean;
  lastSyncTimestamp: number;
}

export interface AppActions {
  // Auth Actions
  setUser: (user: User | null) => void;
  logout: () => void;

  // Product Actions
  setProducts: (products: Product[]) => void;
  addProduct: (product: Product) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;

  // Notification Actions
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  clearNotification: (id: string) => void;

  // Preferences
  updatePreferences: (updates: Partial<AppPreferences>) => void;

  // Network State
  setOnlineStatus: (online: boolean) => void;

  // Utility Actions
  reset: () => void;
}

const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  products: [],
  productsLastUpdated: 0,
  notifications: [],
  preferences: {
    theme: 'system',
    language: 'pt',
    hapticFeedback: true,
    pushNotifications: true,
    autoRefresh: true,
    offlineMode: false,
  },
  isOnline: true,
  lastSyncTimestamp: 0,
};

type StoreState = AppState & AppActions;

export const useAppStore = create<StoreState>()(
  persist(
    // CORRIGIDO: O parâmetro 'get' não utilizado foi renomeado para '_get'
    (set, _get) => ({
      ...initialState,

      // Auth Actions
      setUser: user =>
        set({
          user,
          isAuthenticated: user !== null,
        }),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          products: [],
          notifications: [],
        }),

      // Product Actions
      setProducts: products =>
        set({
          products,
          productsLastUpdated: Date.now(),
        }),

      addProduct: product =>
        set(state => ({
          products: [...state.products, product],
          productsLastUpdated: Date.now(),
        })),

      updateProduct: (id, updates) =>
        set(state => ({
          products: state.products.map(p => (p.id === id ? { ...p, ...updates } : p)),
          productsLastUpdated: Date.now(),
        })),

      // Notification Actions
      addNotification: notification =>
        set(state => {
          const newNotification: AppNotification = {
            ...notification,
            id: Date.now().toString() + Math.random().toString(36),
            timestamp: Date.now(),
            read: false,
          };

          return {
            notifications: [newNotification, ...state.notifications].slice(0, 50),
          };
        }),

      clearNotification: id =>
        set(state => ({
          notifications: state.notifications.filter(n => n.id !== id),
        })),

      // Preferences
      updatePreferences: updates =>
        set(state => ({
          preferences: {
            ...state.preferences,
            ...updates,
          },
        })),

      // Network State
      setOnlineStatus: online => set({ isOnline: online }),

      // Utility Actions
      reset: () => set(initialState),
    }),
    {
      name: 'app-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        preferences: state.preferences,
        products: state.products,
        productsLastUpdated: state.productsLastUpdated,
      }),
    }
  )
);

// Selectors
export const useUser = () => useAppStore(state => state.user);
export const useIsAuthenticated = () => useAppStore(state => state.isAuthenticated);
export const useProducts = () => useAppStore(state => state.products);
export const useNotifications = () => useAppStore(state => state.notifications);
export const usePreferences = () => useAppStore(state => state.preferences);
export const useIsOnline = () => useAppStore(state => state.isOnline);

export default useAppStore;
