import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, initializeAuth, onAuthStateChanged, signInAnonymously, type Auth } from 'firebase/auth';
import { app } from './firebase';

/**
 * Anonymous Firebase sign-in: the player's identity on the boards and in duels is their auth uid, which
 * firestore.rules binds every write to (nobody can touch another player's row). The account needs nothing
 * from the player; the owner only has to enable the Anonymous provider in the Firebase console.
 */
const SIGN_IN_TIMEOUT_MS = 10000;

function makeAuth(): Auth {
  try {
    // Only the react-native build of firebase/auth has this; it keeps the session (and so the uid) across restarts.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getReactNativePersistence } = require('firebase/auth') as { getReactNativePersistence?: (storage: unknown) => never };
    if (getReactNativePersistence) {
      return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
    }
  } catch {
    // Already initialised (hot reload) or not the react-native bundle: the default below handles both.
  }
  return getAuth(app);
}

const auth = makeAuth();

let signing: Promise<string> | null = null;

/** The signed-in player's uid, signing in anonymously first when needed. Rejects offline; calling again retries. */
export function ensureSignedIn(): Promise<string> {
  const current = auth.currentUser;
  if (current) return Promise.resolve(current.uid);
  if (!signing) {
    signing = new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        unsub();
        reject(new Error('[auth] sign-in timed out'));
      }, SIGN_IN_TIMEOUT_MS);
      // A persisted session loads asynchronously: wait for it before minting a new anonymous user.
      const unsub = onAuthStateChanged(auth, user => {
        unsub();
        if (user) {
          clearTimeout(timer);
          resolve(user.uid);
          return;
        }
        signInAnonymously(auth).then(
          made => {
            clearTimeout(timer);
            resolve(made.user.uid);
          },
          e => {
            clearTimeout(timer);
            reject(e);
          },
        );
      });
    }).finally(() => {
      signing = null; // a failure may be retried; a success answers from currentUser from now on
    });
  }
  return signing;
}
