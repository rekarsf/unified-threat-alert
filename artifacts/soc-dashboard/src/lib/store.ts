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

// ─── Settings Store ────────────────────────────────────────────────────────────

export const ACCENT_HSL: Record<string, { h: number; s: number; l: number }> = {
  teal:    { h: 172, s: 76, l: 48 },
  blue:    { h: 213, s: 94, l: 62 },
  violet:  { h: 262, s: 80, l: 65 },
  emerald: { h: 152, s: 80, l: 44 },
  amber:   { h:  38, s: 92, l: 54 },
};

export interface SettingsValues {
  refreshInterval: number;
  accentColor: string;
  uiDensity: 'comfortable' | 'compact';
  tickerSpeed: number;
  dataRetention: number;
}

interface SettingsState extends SettingsValues {
  load: () => void;
  save: (patch: Partial<SettingsValues>) => void;
}

function readInt(key: string, fallback: number): number {
  const v = localStorage.getItem(key);
  return v !== null && !isNaN(parseInt(v, 10)) ? parseInt(v, 10) : fallback;
}

function applyAccentToDOM(accentColor: string) {
  const hsl = ACCENT_HSL[accentColor] ?? ACCENT_HSL.teal;
  const root = document.documentElement;
  root.style.setProperty('--primary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
  root.style.setProperty('--accent', `${hsl.h} ${Math.round(hsl.s * 0.65)}% ${Math.round(hsl.l * 0.42)}%`);
}

function applyDensityToDOM(density: 'comfortable' | 'compact') {
  document.documentElement.setAttribute('data-density', density);
}

function readAllSettings(): SettingsValues {
  return {
    refreshInterval: readInt('soc_refresh_interval', 30),
    accentColor: localStorage.getItem('soc_accent_color') ?? 'teal',
    uiDensity: (localStorage.getItem('soc_ui_density') as 'comfortable' | 'compact') ?? 'comfortable',
    tickerSpeed: readInt('soc_ticker_speed', 4500),
    dataRetention: readInt('soc_data_retention', 30),
  };
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...readAllSettings(),

  load: () => {
    const values = readAllSettings();
    set(values);
    applyAccentToDOM(values.accentColor);
    applyDensityToDOM(values.uiDensity);
  },

  save: (patch) => {
    const next: SettingsValues = { ...get(), ...patch };
    set(patch);

    if (patch.refreshInterval !== undefined) localStorage.setItem('soc_refresh_interval', String(patch.refreshInterval));
    if (patch.accentColor !== undefined) localStorage.setItem('soc_accent_color', patch.accentColor);
    if (patch.uiDensity !== undefined) localStorage.setItem('soc_ui_density', patch.uiDensity);
    if (patch.tickerSpeed !== undefined) localStorage.setItem('soc_ticker_speed', String(patch.tickerSpeed));
    if (patch.dataRetention !== undefined) localStorage.setItem('soc_data_retention', String(patch.dataRetention));

    if (patch.accentColor !== undefined) applyAccentToDOM(next.accentColor);
    if (patch.uiDensity !== undefined) applyDensityToDOM(next.uiDensity);
  },
}));
