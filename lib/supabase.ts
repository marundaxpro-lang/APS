import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const supabase = createClient(
  'https://pckfynlcusnnqpheujmj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBja2Z5bmxjdXNubnFwaGV1am1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMDUwMDgsImV4cCI6MjA4OTg4MTAwOH0.1sUNgqvHFYdjr69VbXLIqCFHb1g0z4Uwl9zPXMfH5JU',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
