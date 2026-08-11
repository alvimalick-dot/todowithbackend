'use client';

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  ReactNode,
} from 'react';

export interface AppSettings {
  /** Master toggle for browser notifications */
  browserNotifications: boolean;
  /** Show the reminders widget on the dashboard */
  remindersOnDashboard: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  browserNotifications: false,
  remindersOnDashboard: true,
};

const STORAGE_KEY = 'productivity-settings';

interface SettingsContextType extends AppSettings {
  updateSettings: (patch: Partial<AppSettings>) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// Module-level cache so the snapshot stays referentially stable between
// writes (required by useSyncExternalStore). Lazy-loads from localStorage
// on the first client read.
let cachedSettings: AppSettings | null = null;
function getSnapshot(): AppSettings {
  if (!cachedSettings) cachedSettings = loadSettings();
  return cachedSettings;
}

function subscribe(callback: () => void) {
  const handler = (e: StorageEvent) => {
    if (e.key === null || e.key === STORAGE_KEY) {
      cachedSettings = loadSettings();
      callback();
    }
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const settings = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => DEFAULT_SETTINGS
  );

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    cachedSettings = { ...loadSettings(), ...patch };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedSettings));
    window.dispatchEvent(new Event('storage'));
  }, []);

  return (
    <SettingsContext.Provider value={{ ...settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
