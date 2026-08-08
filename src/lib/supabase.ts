import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default Supabase credentials fallback
const DEFAULT_SUPABASE_URL = localStorage.getItem('supabase_url') || import.meta.env.VITE_SUPABASE_URL || '';
const DEFAULT_SUPABASE_KEY = localStorage.getItem('supabase_anon_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsdmF5a2tkdmhrd21kaGhpeXFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNDI0NDEsImV4cCI6MjEwMTYxODQ0MX0.UfjQJ2K7jHuL9o-0D27E6E-DC2tZglM5sv58sCvbOsY';

let isUnreachable = false;

export function getSupabaseConfig() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const localUrl = localStorage.getItem('supabase_url') || '';
  const localKey = localStorage.getItem('supabase_anon_key') || '';

  return {
    url: localUrl || envUrl || DEFAULT_SUPABASE_URL,
    anonKey: localKey || envKey || DEFAULT_SUPABASE_KEY,
  };
}

export function saveSupabaseConfig(url: string, anonKey: string) {
  if (url) localStorage.setItem('supabase_url', url.trim());
  else localStorage.removeItem('supabase_url');

  if (anonKey) localStorage.setItem('supabase_anon_key', anonKey.trim());
  else localStorage.removeItem('supabase_anon_key');

  isUnreachable = false;
}

export function markSupabaseUnreachable() {
  isUnreachable = true;
}

export function isSupabaseDisabled() {
  return isUnreachable;
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (isUnreachable) return null;

  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) return null;

  try {
    if (!supabaseInstance) {
      supabaseInstance = createClient(url, anonKey);
    }
    return supabaseInstance;
  } catch (err) {
    console.warn('Supabase initialization note:', err);
    return null;
  }
}

export function resetSupabaseClient() {
  supabaseInstance = null;
  isUnreachable = false;
}

