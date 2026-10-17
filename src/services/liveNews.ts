import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { LiveNews, parseLiveNews } from '../core/news/liveNews';
import { AppConfig, parseAppConfig } from '../core/news/appUpdate';

/** Reads the developer's notice (see core/news/liveNews.ts). Best effort: any problem means "no notice". */
const DISMISSED_STORAGE = 'wumpus.news.dismissed.v1';
const TIMEOUT_MS = 6000;
const MAX_REMEMBERED = 20;

let cached: { news: LiveNews | null } | null = null;

/** The current notice, read from the server once per launch. */
export async function loadLiveNews(): Promise<LiveNews | null> {
  if (cached) return cached.news;
  try {
    const snap = await Promise.race([
      getDoc(doc(db, 'config', 'live')),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)),
    ]);
    cached = { news: snap.exists() ? parseLiveNews(snap.data()) : null };
  } catch (e) {
    console.warn('[news] could not read the notice:', e);
    return null; // not cached: the next visit to the cover tries again
  }
  return cached.news;
}

let cachedConfig: { config: AppConfig | null } | null = null;

/** The update configuration (see core/news/appUpdate.ts), read from the server once per launch. */
export async function loadAppConfig(): Promise<AppConfig | null> {
  if (cachedConfig) return cachedConfig.config;
  try {
    const snap = await Promise.race([
      getDoc(doc(db, 'config', 'app')),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)),
    ]);
    cachedConfig = { config: snap.exists() ? parseAppConfig(snap.data()) : null };
  } catch (e) {
    console.warn('[news] could not read the update configuration:', e);
    return null;
  }
  return cachedConfig.config;
}

export async function getDismissedNews(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(DISMISSED_STORAGE);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export async function dismissNews(id: string): Promise<string[]> {
  const next = [...(await getDismissedNews()).filter(x => x !== id), id].slice(-MAX_REMEMBERED);
  try {
    await AsyncStorage.setItem(DISMISSED_STORAGE, JSON.stringify(next));
  } catch (e) {
    console.warn('[news] could not remember the dismissal:', e);
  }
  return next;
}
