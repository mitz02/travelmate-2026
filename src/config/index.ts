import 'dotenv/config';

/**
 * Application configuration. Load .env before importing this.
 */
function env(key: string, fallback = ''): string {
  return process.env[key] ?? fallback;
}

export const config = {
  port: parseInt(env('PORT', '3004'), 10),
  nodeEnv: env('NODE_ENV', 'development'),
  isDev: process.env.NODE_ENV !== 'production',

  jwt: {
    secret: env('JWT_SECRET', 'your-secret-key-change-in-production'),
    expiresInDays: 7,
  },

  // Used to sign short-lived multi-step registration session tokens
  registrationSecret: env('REGISTRATION_SECRET', 'registration-secret-change-in-production'),

  // Google OAuth
  google: {
    clientId: env('GOOGLE_CLIENT_ID'),
  },

  supabase: {
    url: env('SUPABASE_URL'),
    serviceRoleKey: env('SUPABASE_SERVICE_ROLE_KEY'),
  },

  paystack: {
    secretKey: env('PAYSTACK_SECRET_KEY'),
    baseUrl: 'https://api.paystack.co',
  },

  // Twilio SMS API credentials
  twilio: {
    accountSid: env('TWILIO_ACCOUNT_SID'),
    authToken: env('TWILIO_AUTH_TOKEN'),
    fromNumber: env('TWILIO_FROM_NUMBER'),
  },

  // Public base URL of this API (used inside email verification links)
  appUrl: env('APP_URL', 'http://localhost:3000'),

  // VTpass VTU API (airtime, data, bills)
  // Sandbox: https://sandbox.vtpass.com/api
  // Live:    https://vtpass.com/api
  vtpass: {
    apiKey:         env('VTPASS_API_KEY'),
    secretKey:      env('VTPASS_SECRET_KEY'),
    publicKey:      env('VTPASS_PUBLIC_KEY'),
    sandboxBaseUrl: env('VTPASS_SANDBOX_BASE_URL', 'https://sandbox.vtpass.com/api'),
    liveBaseUrl:    env('VTPASS_LIVE_BASE_URL', 'https://vtpass.com/api'),
    mode:           env('VTPASS_MODE', 'sandbox'), // "sandbox" | "live"
  },
  bardetech: {
    baseUrl: env('BARDTECH_BASE_URL', ''),
    apiKey: env('BARDTECH_API_KEY', ''),
    secretKey: env('BARDTECH_SECRET_KEY', ''),
  },
  // Mapbox
  mapbox: {
    accessToken: env('MAPBOX_ACCESS_TOKEN'),
  },

  // Agora – real-time audio/video
  // Create a project at https://console.agora.io/ to get these values.
  agora: {
    appId: env('AGORA_APP_ID'),
    appCertificate: env('AGORA_APP_CERTIFICATE'),
  },

  // Firebase Admin for push notifications
  firebase: {
    projectId: env('FIREBASE_PROJECT_ID'),
    clientEmail: env('FIREBASE_CLIENT_EMAIL'),
    // Replace literal \n with actual newline characters if parsing from .env
    privateKey: env('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
  },
} as const;

export type Config = typeof config;

/**
 * Returns VTPass configuration based on the selected mode (sandbox or live).
 * Can optionally override the mode (e.g. for electricity-specific mode).
 */
export function getVtpassConfig(modeOverride?: string) {
  const mode = modeOverride || config.vtpass.mode;
  const baseUrl = mode === 'live' ? config.vtpass.liveBaseUrl : config.vtpass.sandboxBaseUrl;
  return {
    baseUrl,
    apiKey:    config.vtpass.apiKey,
    secretKey: config.vtpass.secretKey,
    publicKey: config.vtpass.publicKey,
  };
}

