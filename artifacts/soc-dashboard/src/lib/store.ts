import { create } from 'zustand';
import { UserProfile, Endpoint } from '@workspace/api-client-react';

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: UserProfile, token: string) => void;
  clearAuth: () => void;
  hasScope: (scope: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('soc_token'),
  isAuthenticated: !!localStorage.getItem('soc_token'),
  setAuth: (user, token) => {
    localStorage.setItem('soc_token', token);
    set({ user, token, isAuthenticated: true });
  },
  clearAuth: () => {
    localStorage.removeItem('soc_token');
    set({ user: null, token: null, isAuthenticated: false });
  },
  hasScope: (scope: string) => {
    const { user } = get();
    return user?.scopes.includes(scope) || false;
  }
}));

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'critical';
  timestamp: Date;
  read: boolean;
}

interface AppState {
  notifications: Notification[];
  addNotification: (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  
  selectedEndpoint: Endpoint | null;
  setSelectedEndpoint: (endpoint: Endpoint | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  notifications: [],
  addNotification: (n) => set((state) => {
    const newNotif: Notification = {
      ...n,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date(),
      read: false
    };
    return { notifications: [newNotif, ...state.notifications].slice(0, 50) };
  }),
  markNotificationRead: (id) => set((state) => ({
    notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
  })),
  clearNotifications: () => set({ notifications: [] }),
  
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  selectedEndpoint: null,
  setSelectedEndpoint: (endpoint) => set({ selectedEndpoint: endpoint }),
}));
