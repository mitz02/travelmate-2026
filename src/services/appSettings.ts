import { supabase } from './supabase';
import { config } from '../config';
import { resetFirebaseAdmin } from './firebase';
import { resetFlutterwaveToken } from './flutterwave';

/**
 * Admin-managed API keys stored in the `app_settings` table and applied
 * over the runtime config so changes take effect without a restart.
 *
 * - MAPBOX_ACCESS_TOKEN  → public (served to the frontend via GET /api/config)
 * - BARDETECH_API_KEY    → secret, used by the VTU services
 * - PAYSTACK_SECRET_KEY  → secret, used by payments
 */

export type ApiKeyName =
  | 'MAPBOX_ACCESS_TOKEN'
  | 'BARDETECH_API_KEY'
  | 'PAYSTACK_SECRET_KEY'
  | 'DOJAH_APP_ID'
  | 'DOJAH_SECRET_KEY'
  | 'DOJAH_BASE_URL'
  | 'AGORA_APP_ID'
  | 'AGORA_APP_CERTIFICATE'
  | 'TWILIO_ACCOUNT_SID'
  | 'TWILIO_AUTH_TOKEN'
  | 'FLW_CLIENT_ID'
  | 'FLW_SECRET_KEY'
  | 'FLW_ENCRYPTION_KEY'
  | 'FIREBASE_PROJECT_ID'
  | 'FIREBASE_CLIENT_EMAIL'
  | 'FIREBASE_PRIVATE_KEY';

export const API_KEY_NAMES: ApiKeyName[] = [
  'MAPBOX_ACCESS_TOKEN',
  'BARDETECH_API_KEY',
  'PAYSTACK_SECRET_KEY',
  'DOJAH_APP_ID',
  'DOJAH_SECRET_KEY',
  'DOJAH_BASE_URL',
  'AGORA_APP_ID',
  'AGORA_APP_CERTIFICATE',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'FLW_CLIENT_ID',
  'FLW_SECRET_KEY',
  'FLW_ENCRYPTION_KEY',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
];

const PUBLIC_KEYS: ApiKeyName[] = ['MAPBOX_ACCESS_TOKEN'];

const KEY_DESCRIPTIONS: Record<ApiKeyName, string> = {
  MAPBOX_ACCESS_TOKEN: 'Public token for Mapbox frontend rendering',
  BARDETECH_API_KEY: 'Bardetech VTU API key',
  PAYSTACK_SECRET_KEY: 'Paystack secret key',
  DOJAH_APP_ID: 'Dojah identity verification app ID',
  DOJAH_SECRET_KEY: 'Dojah identity verification secret key',
  DOJAH_BASE_URL: 'Dojah API base URL (sandbox or production)',
  AGORA_APP_ID: 'Agora real-time audio/video app ID',
  AGORA_APP_CERTIFICATE: 'Agora app certificate for token generation',
  TWILIO_ACCOUNT_SID: 'Twilio account SID for SMS',
  TWILIO_AUTH_TOKEN: 'Twilio auth token for SMS',
  FLW_CLIENT_ID: 'Flutterwave OAuth client ID (withdrawals)',
  FLW_SECRET_KEY: 'Flutterwave client secret (withdrawals)',
  FLW_ENCRYPTION_KEY: 'Flutterwave payload encryption key',
  FIREBASE_PROJECT_ID: 'Firebase project ID (push notifications / phone OTP)',
  FIREBASE_CLIENT_EMAIL: 'Firebase service account client email',
  FIREBASE_PRIVATE_KEY: 'Firebase service account private key (PEM)',
};

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
        description: KEY_DESCRIPTIONS[key],
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
    case 'DOJAH_APP_ID':
      return process.env.DOJAH_APP_ID || '';
    case 'DOJAH_SECRET_KEY':
      return process.env.DOJAH_SECRET_KEY || '';
    case 'DOJAH_BASE_URL':
      return process.env.DOJAH_BASE_URL || '';
    case 'AGORA_APP_ID':
      return process.env.AGORA_APP_ID || '';
    case 'AGORA_APP_CERTIFICATE':
      return process.env.AGORA_APP_CERTIFICATE || '';
    case 'TWILIO_ACCOUNT_SID':
      return process.env.TWILIO_ACCOUNT_SID || '';
    case 'TWILIO_AUTH_TOKEN':
      return process.env.TWILIO_AUTH_TOKEN || '';
    case 'FLW_CLIENT_ID':
      return process.env.FLW_CLIENT_ID || '';
    case 'FLW_SECRET_KEY':
      return process.env.FLW_SECRET_KEY || '';
    case 'FLW_ENCRYPTION_KEY':
      return process.env.FLW_ENCRYPTION_KEY || '';
    case 'FIREBASE_PROJECT_ID':
      return process.env.FIREBASE_PROJECT_ID || '';
    case 'FIREBASE_CLIENT_EMAIL':
      return process.env.FIREBASE_CLIENT_EMAIL || '';
    case 'FIREBASE_PRIVATE_KEY':
      return process.env.FIREBASE_PRIVATE_KEY || '';
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

    const dojahAppId = await getAppSetting('DOJAH_APP_ID');
    if (dojahAppId && dojahAppId.trim() !== '') {
      config.dojah.appId = dojahAppId;
    }

    const dojahSecret = await getAppSetting('DOJAH_SECRET_KEY');
    if (dojahSecret && dojahSecret.trim() !== '') {
      config.dojah.secretKey = dojahSecret;
    }

    const dojahBaseUrl = await getAppSetting('DOJAH_BASE_URL');
    if (dojahBaseUrl && dojahBaseUrl.trim() !== '') {
      config.dojah.baseUrl = dojahBaseUrl;
    }

    const agoraAppId = await getAppSetting('AGORA_APP_ID');
    if (agoraAppId && agoraAppId.trim() !== '') {
      config.agora.appId = agoraAppId;
      process.env.AGORA_APP_ID = agoraAppId;
    }

    const agoraCert = await getAppSetting('AGORA_APP_CERTIFICATE');
    if (agoraCert && agoraCert.trim() !== '') {
      config.agora.appCertificate = agoraCert;
      process.env.AGORA_APP_CERTIFICATE = agoraCert;
    }

    const twilioSid = await getAppSetting('TWILIO_ACCOUNT_SID');
    if (twilioSid && twilioSid.trim() !== '') {
      config.twilio.accountSid = twilioSid;
      process.env.TWILIO_ACCOUNT_SID = twilioSid;
    }

    const twilioToken = await getAppSetting('TWILIO_AUTH_TOKEN');
    if (twilioToken && twilioToken.trim() !== '') {
      config.twilio.authToken = twilioToken;
      process.env.TWILIO_AUTH_TOKEN = twilioToken;
    }

    let flwChanged = false;
    const flwClientId = await getAppSetting('FLW_CLIENT_ID');
    if (flwClientId && flwClientId.trim() !== '') {
      config.flutterwave.clientId = flwClientId;
      process.env.FLW_CLIENT_ID = flwClientId;
      flwChanged = true;
    }
    const flwSecret = await getAppSetting('FLW_SECRET_KEY');
    if (flwSecret && flwSecret.trim() !== '') {
      config.flutterwave.clientSecret = flwSecret;
      process.env.FLW_SECRET_KEY = flwSecret;
      flwChanged = true;
    }
    const flwEncryptionKey = await getAppSetting('FLW_ENCRYPTION_KEY');
    if (flwEncryptionKey && flwEncryptionKey.trim() !== '') {
      config.flutterwave.encryptionKey = flwEncryptionKey;
      process.env.FLW_ENCRYPTION_KEY = flwEncryptionKey;
      flwChanged = true;
    }
    // Drop the cached OAuth token so the next withdrawal call re-authenticates
    // with the new credentials.
    if (flwChanged) resetFlutterwaveToken();

    let firebaseChanged = false;
    const fbProjectId = await getAppSetting('FIREBASE_PROJECT_ID');
    if (fbProjectId && fbProjectId.trim() !== '') {
      config.firebase.projectId = fbProjectId;
      process.env.FIREBASE_PROJECT_ID = fbProjectId;
      firebaseChanged = true;
    }
    const fbClientEmail = await getAppSetting('FIREBASE_CLIENT_EMAIL');
    if (fbClientEmail && fbClientEmail.trim() !== '') {
      config.firebase.clientEmail = fbClientEmail;
      process.env.FIREBASE_CLIENT_EMAIL = fbClientEmail;
      firebaseChanged = true;
    }
    const fbPrivateKey = await getAppSetting('FIREBASE_PRIVATE_KEY');
    if (fbPrivateKey && fbPrivateKey.includes('PRIVATE KEY')) {
      config.firebase.privateKey = fbPrivateKey.replace(/\\n/g, '\n');
      process.env.FIREBASE_PRIVATE_KEY = fbPrivateKey;
      firebaseChanged = true;
    }
    // Firebase Admin caches its initialized app; drop it so the next call
    // re-initializes with the updated credentials.
    if (firebaseChanged) resetFirebaseAdmin();
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
