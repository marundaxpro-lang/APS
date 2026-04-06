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

  // ── Conversion helpers ──────────────────────────────────────────────────────
  // IMPORTANT: Stored values are ALWAYS metric (kg, cm, km).
  // These helpers convert only at UI boundaries — never modify stored values.
  lbsToKg: (lbs: number) => number;
  kgToLbs: (kg: number) => number;
  cmToFtIn: (cm: number) => { feet: number; inches: number };
  ftInToCm: (feet: number, inches: number) => number;
  kmToMiles: (km: number) => number;
  milesToKm: (miles: number) => number;

  // ── Display formatters (metric stored → display string) ─────────────────────
  formatWeight: (kg: number) => string;
  formatHeight: (cm: number) => string;
  formatDistance: (km: number) => string;

  // ── Raw value helpers (metric stored → display unit number) ─────────────────
  formatWeightValue: (kg: number) => number;
  formatHeightValue: (cm: number) => { primary: number; secondary?: number };
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

  // ── Conversion helpers ──────────────────────────────────────────────────────

  const lbsToKg = useCallback((lbs: number): number => {
    const val = Number(lbs);
    if (!isFinite(val) || val <= 0) return 0;
    return val * 0.453592;
  }, []);

  const kgToLbs = useCallback((kg: number): number => {
    const val = Number(kg);
    if (!isFinite(val) || val <= 0) return 0;
    return val * 2.20462;
  }, []);

  const cmToFtIn = useCallback((cm: number): { feet: number; inches: number } => {
    const val = Number(cm);
    if (!isFinite(val) || val <= 0) return { feet: 0, inches: 0 };
    const totalInches = val / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return { feet, inches };
  }, []);

  const ftInToCm = useCallback((feet: number, inches: number): number => {
    const f = Number(feet);
    const i = Number(inches);
    if (!isFinite(f) || !isFinite(i)) return 0;
    return f * 30.48 + i * 2.54;
  }, []);

  const kmToMiles = useCallback((km: number): number => {
    const val = Number(km);
    if (!isFinite(val) || val <= 0) return 0;
    return val * 0.621371;
  }, []);

  const milesToKm = useCallback((miles: number): number => {
    const val = Number(miles);
    if (!isFinite(val) || val <= 0) return 0;
    return val / 0.621371;
  }, []);

  // ── Display formatters ──────────────────────────────────────────────────────

  const formatWeight = useCallback((kg: number): string => {
    const val = Number(kg);
    if (!isFinite(val) || val <= 0) return 'Not set';
    if (isMetric) return `${Math.round(val)} kg`;
    const lbs = Math.round(val * 2.20462);
    return `${lbs} lbs`;
  }, [isMetric]);

  const formatHeight = useCallback((cm: number): string => {
    const val = Number(cm);
    if (!isFinite(val) || val <= 0) return 'Not set';
    if (isMetric) return `${Math.round(val)} cm`;
    const totalInches = val / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}'${inches}"`;
  }, [isMetric]);

  const formatDistance = useCallback((km: number): string => {
    const val = Number(km);
    if (!isFinite(val) || val < 0) return '0.0 km';
    if (isMetric) return `${val.toFixed(1)} km`;
    const miles = val * 0.621371;
    return `${miles.toFixed(1)} mi`;
  }, [isMetric]);

  // ── Raw value helpers ───────────────────────────────────────────────────────

  const formatWeightValue = useCallback((kg: number): number => {
    const val = Number(kg);
    if (!isFinite(val) || val <= 0) return 0;
    if (isMetric) return Math.round(val);
    return Math.round(val * 2.20462);
  }, [isMetric]);

  const formatHeightValue = useCallback((cm: number): { primary: number; secondary?: number } => {
    const val = Number(cm);
    if (!isFinite(val) || val <= 0) return { primary: 0 };
    if (isMetric) return { primary: Math.round(val) };
    const totalInches = val / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return { primary: feet, secondary: inches };
  }, [isMetric]);

  return (
    <SettingsContext.Provider value={{
      settings,
      updateSetting,
      resetSettings,
      isLoaded,
      isMetric,
      lbsToKg,
      kgToLbs,
      cmToFtIn,
      ftInToCm,
      kmToMiles,
      milesToKm,
      formatWeight,
      formatHeight,
      formatDistance,
      formatWeightValue,
      formatHeightValue,
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
