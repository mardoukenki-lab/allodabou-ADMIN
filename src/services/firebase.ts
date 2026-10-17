import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  type Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialise Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialise Auth
export const auth = getAuth(app);

// ID de la base de données Firestore spécifiée
export const FIRESTORE_DATABASE_ID =
  firebaseConfig.firestoreDatabaseId ||
  'ai-studio-alldabouchauffeu-4067e958-2691-4e2f-a95e-8d4eb5c7aa3b';

// Initialise Firestore avec persistance multi-onglets et repli gracieux
let firestoreInstance: Firestore;

try {
  firestoreInstance = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    },
    FIRESTORE_DATABASE_ID
  );
} catch (err) {
  console.warn(
    '[Firestore Init] Erreur lors de initializeFirestore avec persistentMultipleTabManager. Repli sur getFirestore:',
    err
  );
  try {
    firestoreInstance = getFirestore(app, FIRESTORE_DATABASE_ID);
  } catch (fallbackErr) {
    console.error('[Firestore Init] Échec du repli getFirestore avec databaseId:', fallbackErr);
    firestoreInstance = getFirestore(app);
  }
}

export const db = firestoreInstance;

/**
 * Journalisation structurée des erreurs Firestore
 */
export interface FirestoreErrorLog {
  timestamp: string;
  operation: string;
  path: string;
  code: string;
  message: string;
}

export function handleFirestoreError(
  error: unknown,
  operationType: string,
  path: string
): FirestoreErrorLog {
  const err = error as { code?: string; message?: string } | null;
  const structuredError: FirestoreErrorLog = {
    timestamp: new Date().toISOString(),
    operation: operationType,
    path,
    code: err?.code || 'unknown',
    message: err?.message || String(error),
  };

  console.error('[Firestore Error Log]', JSON.stringify(structuredError, null, 2));
  return structuredError;
}
