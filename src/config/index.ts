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

  // Public base URL of this API (used inside email verification links)
  appUrl: env('APP_URL', 'http://localhost:3000'),

  // Bardetech VTU API (airtime, data, cable TV, electricity)
  // Base URL: https://bardetech.com/api
  bardetech: {
    baseUrl: env('BARDTECH_BASE_URL', env('BARDETECH_BASE_URL', 'https://bardetech.com/api')),
    apiKey: env('BARDTECH_API_KEY', env('BARDETECH_API_KEY', '')),
    secretKey: env('BARDTECH_SECRET_KEY', env('BARDETECH_SECRET_KEY', '')),
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

  // Firebase Admin SDK (phone OTP verification + push notifications)
  firebase: {
    projectId: env('FIREBASE_PROJECT_ID'),
    clientEmail: env('FIREBASE_CLIENT_EMAIL'),
    privateKey: env('FIREBASE_PRIVATE_KEY').replace(/^"/, '').replace(/"$/, '').replace(/\\n/g, '\n'),
  },

  // Dojah – identity verification (NIN, BVN, etc.)
  dojah: {
    appId: env('DOJAH_APP_ID'),
    secretKey: env('DOJAH_SECRET_KEY'),
    baseUrl: env('DOJAH_BASE_URL', 'https://sandbox.dojah.io'),
  },

  // Flutterwave v4 – bank transfers / withdrawals
  flutterwave: {
    clientId: env('FLW_CLIENT_ID'),
    clientSecret: env('FLW_SECRET_KEY'),
    encryptionKey: env('FLW_ENCRYPTION_KEY'),
    baseUrl: env('FLW_BASE_URL', 'https://f4bexperience.flutterwave.com'),
    idpUrl: env('FLW_IDP_URL', 'https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token'),
  },

  twilio: {
    accountSid: env('TWILIO_ACCOUNT_SID'),
    authToken: env('TWILIO_AUTH_TOKEN'),
    fromNumber: env('TWILIO_FROM_NUMBER'),
  },
};

// Mutable at runtime: admin-saved API keys (app_settings) are applied over
// these values by applyRuntimeSettings() without requiring a restart.
export type Config = typeof config;

