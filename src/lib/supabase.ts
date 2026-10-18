import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const projectUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';

export const supabaseConfigured = Boolean(projectUrl && publishableKey);

export const supabase: SupabaseClient<Database> | null = supabaseConfigured
  ? createClient<Database>(projectUrl, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : null;
