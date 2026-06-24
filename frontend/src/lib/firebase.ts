import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string | undefined) || 'AIzaSyAfuhXU02ih7Sx-BFOI0Cv9arfeHCQaw9g',
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined) || 'travelmate-c1816.firebaseapp.com',
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined) || 'travelmate-c1816',
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined) || '77037096341',
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string | undefined) || '1:77037096341:web:72ae9a79038cf1678d3a9c',
};

export function isFirebaseConfigured(): boolean {
  return Object.values(firebaseConfig).every(Boolean);
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

if (isFirebaseConfigured()) {
  app = getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig);
  auth = getAuth(app);
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    throw new Error(
      'Firebase is not configured. Add VITE_FIREBASE_* variables to your .env file.',
    );
  }
  return auth;
}

export { firebaseConfig };
