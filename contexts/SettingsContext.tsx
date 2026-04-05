import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export type UnitSystem = 'metric' | 'imperial';
export type AppTheme = 'dark' | 'light' | 'system';
export type CurrencyCode = string;

export interface AppSettings {
  unitSystem: UnitSystem;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  firstDayOfWeek: 0 | 1;
  theme: AppTheme;
  currency: CurrencyCode;
  notificationsEnabled: boolean;
  marketingEmailsEnabled: boolean;
  analyticsEnabled: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  unitSystem: 'metric',
  dateFormat: 'DD/MM/YYYY',
  firstDayOfWeek: 1,
  theme: 'dark',
  currency: 'USD',
  notificationsEnabled: true,
  marketingEmailsEnabled: false,
  analyticsEnabled: true,
};

const SETTINGS_STORAGE_KEY = 'app_settings';

// ─── Context ──────────────────────────────────────────────────────────────────

interface SettingsContextValue {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
  resetSettings: () => Promise<void>;
  isLoaded: boolean;
  isMetric: boolean;
  formatWeight: (kg: number) => string;
  formatHeight: (cm: number) => string;
  formatDistance: (km: number) => string;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<AppSettings>;
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        }
      } catch {
        // fall back to defaults
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  const updateSetting = useCallback(async <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    console.log(`[Settings] updateSetting: ${String(key)} =`, value);
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const resetSettings = useCallback(async () => {
    console.log('[Settings] resetSettings: restoring defaults');
    setSettings(DEFAULT_SETTINGS);
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
  }, []);

  const isMetric = settings.unitSystem === 'metric';

  const formatWeight = useCallback((kg: number): string => {
    if (isMetric) return `${Math.round(kg)} kg`;
    const lbs = Math.round(kg * 2.20462);
    return `${lbs} lbs`;
  }, [isMetric]);

  const formatHeight = useCallback((cm: number): string => {
    if (isMetric) return `${Math.round(cm)} cm`;
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}'${inches}"`;
  }, [isMetric]);

  const formatDistance = useCallback((km: number): string => {
    if (isMetric) return `${km.toFixed(1)} km`;
    const miles = km * 0.621371;
    return `${miles.toFixed(1)} mi`;
  }, [isMetric]);

  return (
    <SettingsContext.Provider value={{
      settings,
      updateSetting,
      resetSettings,
      isLoaded,
      isMetric,
      formatWeight,
      formatHeight,
      formatDistance,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
