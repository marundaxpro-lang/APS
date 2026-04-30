import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// On web, AsyncStorage uses localStorage internally but supabase-js needs a
// storage adapter that matches its expected interface. Use localStorage directly
// on web to avoid any AsyncStorage quirks in the browser.
const webStorage = typeof window !== 'undefined' ? {
  getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
  setItem: (key: string, value: string) => Promise.resolve(localStorage.setItem(key, value)),
  removeItem: (key: string) => Promise.resolve(localStorage.removeItem(key)),
} : undefined;

export const supabase = createClient(
  'https://pckfynlcusnnqpheujmj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBja2Z5bmxjdXNubnFwaGV1am1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMDUwMDgsImV4cCI6MjA4OTg4MTAwOH0.1sUNgqvHFYdjr69VbXLIqCFHb1g0z4Uwl9zPXMfH5JU',
  {
    auth: {
      storage: Platform.OS === 'web' ? webStorage : AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  }
);
