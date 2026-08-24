import { supabase } from './supabase';
import { config } from '../config';

/**
 * Admin-managed API keys stored in the `app_settings` table and applied
 * over the runtime config so changes take effect without a restart.
 *
 * - MAPBOX_ACCESS_TOKEN  → public (served to the frontend via GET /api/config)
 * - BARDETECH_API_KEY    → secret, used by the VTU services
 * - PAYSTACK_SECRET_KEY  → secret, used by payments
 */

export type ApiKeyName = 'MAPBOX_ACCESS_TOKEN' | 'BARDETECH_API_KEY' | 'PAYSTACK_SECRET_KEY';

export const API_KEY_NAMES: ApiKeyName[] = ['MAPBOX_ACCESS_TOKEN', 'BARDETECH_API_KEY', 'PAYSTACK_SECRET_KEY'];

const PUBLIC_KEYS: ApiKeyName[] = ['MAPBOX_ACCESS_TOKEN'];

export function maskSecret(value: string | null | undefined): string {
  if (!value) return '';
  const v = String(value);
  if (v.length <= 12) return '••••••••';
  return `${v.slice(0, 8)}${'•'.repeat(6)}${v.slice(-4)}`;
}

export async function getAppSetting(key: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .single();
    if (error || !data || data.value === null || data.value === undefined) return null;
    const raw = typeof data.value === 'string' ? data.value : String(data.value);
    // Values may have been stored JSON-encoded; unwrap simple quoted strings.
    if (raw.length >= 2 && raw.startsWith('"') && raw.endsWith('"')) {
      try {
        return JSON.parse(raw);
      } catch {
        /* fall through */
      }
    }
    return raw;
  } catch (e) {
    console.error(`Failed to read app_settings[${key}]:`, e);
    return null;
  }
}

export async function setAppSetting(key: ApiKeyName, value: string): Promise<void> {
  const isPublic = PUBLIC_KEYS.includes(key);
  const { error } = await supabase
    .from('app_settings')
    .upsert(
      {
        key,
        value,
        is_public: isPublic,
        description: key === 'MAPBOX_ACCESS_TOKEN'
          ? 'Public token for Mapbox frontend rendering'
          : key === 'BARDETECH_API_KEY'
            ? 'Bardetech VTU API key'
            : 'Paystack secret key',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
  if (error) throw new Error(`Failed to save ${key}: ${error.message}`);
}

function envFallback(name: ApiKeyName): string {
  switch (name) {
    case 'MAPBOX_ACCESS_TOKEN':
      return process.env.MAPBOX_ACCESS_TOKEN || process.env.VITE_MAPBOX_TOKEN || '';
    case 'BARDETECH_API_KEY':
      return process.env.BARDETECH_API_KEY || process.env.BARDTECH_API_KEY || '';
    case 'PAYSTACK_SECRET_KEY':
      return process.env.PAYSTACK_SECRET_KEY || '';
  }
}

/** Current effective value: DB override wins over environment. */
export async function getEffectiveApiKey(name: ApiKeyName): Promise<string> {
  const fromDb = await getAppSetting(name);
  return fromDb && fromDb.trim() !== '' ? fromDb : envFallback(name);
}

/**
 * Apply DB-stored keys over the in-memory config so every service picks
 * them up immediately. Safe to call at boot and after each update.
 */
export async function applyRuntimeSettings(): Promise<void> {
  try {
    const mapbox = await getAppSetting('MAPBOX_ACCESS_TOKEN');
    if (mapbox && mapbox.trim() !== '') {
      config.mapbox.accessToken = mapbox;
      process.env.MAPBOX_ACCESS_TOKEN = mapbox;
    }

    const bardetech = await getAppSetting('BARDETECH_API_KEY');
    if (bardetech && bardetech.trim() !== '') {
      config.bardetech.apiKey = bardetech;
      process.env.BARDTECH_API_KEY = bardetech;
      process.env.BARDETECH_API_KEY = bardetech;
    }

    const paystack = await getAppSetting('PAYSTACK_SECRET_KEY');
    if (paystack && paystack.trim() !== '') {
      config.paystack.secretKey = paystack;
    }
  } catch (e) {
    console.error('applyRuntimeSettings failed:', e);
  }
}

export async function getApiKeysState(): Promise<Record<ApiKeyName, { configured: boolean; masked: string; source: 'custom' | 'env' | 'none' }>> {
  const state = {} as Record<ApiKeyName, { configured: boolean; masked: string; source: 'custom' | 'env' | 'none' }>;
  for (const name of API_KEY_NAMES) {
    const dbValue = await getAppSetting(name);
    const effective = dbValue && dbValue.trim() !== '' ? dbValue : envFallback(name);
    state[name] = {
      configured: Boolean(effective && effective.trim() !== ''),
      masked: maskSecret(effective),
      source: dbValue && dbValue.trim() !== '' ? 'custom' : effective ? 'env' : 'none',
    };
  }
  return state;
}
