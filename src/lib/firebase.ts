import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import appletConfig from '../../firebase-applet-config.json';
import { safeStringify } from './utils';

const STORAGE_KEY = 'custom_firebase_config';

export function getCustomFirebaseConfig(): any | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error loading custom firebase config:', e);
  }
  return null;
}

export function saveCustomFirebaseConfig(config: any): void {
  localStorage.setItem(STORAGE_KEY, safeStringify(config));
  window.location.reload();
}

export function removeCustomFirebaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
}

export function getActiveFirebaseConfig(): any {
  const custom = getCustomFirebaseConfig();
  return custom || appletConfig;
}

const activeConfig = getActiveFirebaseConfig();
const app = !getApps().length ? initializeApp(activeConfig) : getApps()[0];

const dbId = activeConfig.firestoreDatabaseId && activeConfig.firestoreDatabaseId !== '(default)'
  ? activeConfig.firestoreDatabaseId
  : undefined;

export const db = dbId ? getFirestore(app, dbId) : getFirestore(app);

// Realtime Database setup
const rtdbUrl = activeConfig.databaseURL || `https://${activeConfig.projectId}-default-rtdb.firebaseio.com`;
export const rtdb = getDatabase(app, rtdbUrl);


