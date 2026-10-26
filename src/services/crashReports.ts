import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ensureSignedIn } from '../lib/auth';
import appJson from '../../app.json';

/**
 * Crash reporting that works inside Expo Go (a native SDK such as Sentry or Crashlytics needs a development
 * build, which the owner does not use). A fatal JS error is written to disk the moment it happens; the next
 * app start sends it to the `crashes` collection, where the console shows it. No personal data travels:
 * only the error, the app version and the platform.
 */
const STORAGE_KEY = 'grimbur.crash.v1';
const MAX_TEXT = 4000;

type StoredCrash = {
  message: string;
  stack: string;
  context: string;
  version: string;
  platform: string;
  at: number;
};

const cut = (text: string) => text.slice(0, MAX_TEXT);

/** Called from the global error handler: tiny, so it can run while the app is dying. Never rejects. */
export function stashCrash(error: Error, context: string): Promise<void> {
  const report: StoredCrash = {
    message: cut(String(error.message ?? error)),
    stack: cut(String(error.stack ?? '')),
    context,
    version: (appJson as { expo?: { version?: string } }).expo?.version ?? '',
    platform: `${Platform.OS} ${Platform.Version ?? ''}`.trim(),
    at: Date.now(),
  };
  return AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(report)).catch(() => {});
}

/** Sends the stashed crash (if any) and clears it. Call once per start, after the app is up. */
export async function sendStashedCrash(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const report = JSON.parse(raw) as StoredCrash;
    if (!report || typeof report.message !== 'string') {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return;
    }
    await ensureSignedIn();
    await addDoc(collection(db, 'crashes'), {
      message: cut(report.message),
      stack: cut(report.stack ?? ''),
      context: String(report.context ?? '').slice(0, 40),
      version: String(report.version ?? '').slice(0, 20),
      platform: String(report.platform ?? '').slice(0, 40),
      at: Number.isFinite(report.at) ? report.at : 0,
      receivedAt: serverTimestamp(),
    });
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // No network (or rules not deployed yet): the report stays stashed for the next start.
  }
}
