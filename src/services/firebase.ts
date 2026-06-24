import admin from 'firebase-admin';
import { config } from '../config';

let initialized = false;

export function ensureFirebaseAdmin(): admin.app.App | null {
  if (admin.apps.length > 0) {
    initialized = true;
    return admin.app();
  }

  const { projectId, clientEmail, privateKey } = config.firebase;
  if (!projectId || !clientEmail || !privateKey) {
    console.warn('Firebase Admin credentials missing (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).');
    return null;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
    initialized = true;
    console.log('Firebase Admin initialized.');
    return admin.app();
  } catch (err) {
    console.error('Failed to initialize Firebase Admin:', err);
    return null;
  }
}

export function isFirebaseAdminReady(): boolean {
  return initialized || admin.apps.length > 0;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
  ensureFirebaseAdmin();
  if (!admin.apps.length) {
    throw new Error('Firebase Admin is not configured');
  }
  return admin.auth().verifyIdToken(idToken);
}
