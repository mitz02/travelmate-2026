import { supabase } from './supabase';
import { config } from '../config';

/**
 * Retrieves the stored VTpass mode from app_settings.
 * Returns 'live' or 'sandbox'. Falls back to env config if not set.
 */
export async function getStoredVtpassMode(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'VTPASS_MODE')
      .single();
    if (!error && data && data.value) {
      return data.value as string;
    }
  } catch (e) {
    console.error('Error fetching VTPASS_MODE from app_settings', e);
  }
  // fallback to env config
  return config.vtpass.mode;
}

/**
 * Persists the VTpass mode ("live" | "sandbox") in app_settings.
 */
export async function setStoredVtpassMode(mode: string): Promise<void> {
  const val = mode;
  const { data, error } = await supabase
    .from('app_settings')
    .upsert({ key: 'VTPASS_MODE', value: val, is_public: false }, { onConflict: 'key' });
  if (error) {
    console.error('Error setting VTPASS_MODE', error);
    throw error;
  }
}
