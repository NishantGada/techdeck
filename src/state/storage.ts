import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Progress } from '../feed/types';
import { emptySession, type SessionPosition } from '../feed/session';
import type { ThemePreference } from '../theme/theme';
import type { AudienceMode } from '../content/types';

const KEY_PROGRESS = 'cards:progress:v1';
const KEY_SETTINGS = 'cards:settings:v1';
const KEY_POSITION = 'cards:position:v1';
const KEY_BOOKMARKS = 'cards:bookmarks:v1';

export interface StoredSettings {
  audienceMode: AudienceMode;
  themePreference: ThemePreference;
}

export const defaultSettings: StoredSettings = {
  audienceMode: 'interview',
  themePreference: 'system',
};

/** Navigation state; the shape and all its logic live in src/feed/session.ts. */
export type StoredPosition = SessionPosition;

export const defaultPosition: StoredPosition = emptySession;

async function readJson<T>(key: string, fallback: T, revive: (raw: unknown) => T | null): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return fallback;
    const revived = revive(JSON.parse(raw) as unknown);
    return revived ?? fallback;
  } catch {
    // A corrupt or unreadable value should start the reader over, not crash the app.
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Persistence is best-effort; the in-memory session stays correct either way.
  }
}

export function loadProgress(): Promise<Progress> {
  return readJson<Progress>(KEY_PROGRESS, { seenOrder: [], quiz: {} }, (raw) => {
    if (typeof raw !== 'object' || raw === null) return null;
    const r = raw as Partial<Progress>;
    const seenOrder = Array.isArray(r.seenOrder)
      ? r.seenOrder.filter((v): v is string => typeof v === 'string')
      : [];
    const quiz = typeof r.quiz === 'object' && r.quiz !== null ? r.quiz : {};
    return { seenOrder, quiz: quiz as Progress['quiz'] };
  });
}

export function saveProgress(progress: Progress): Promise<void> {
  return writeJson(KEY_PROGRESS, progress);
}

export function loadSettings(): Promise<StoredSettings> {
  return readJson<StoredSettings>(KEY_SETTINGS, defaultSettings, (raw) => {
    if (typeof raw !== 'object' || raw === null) return null;
    const r = raw as Partial<StoredSettings>;
    return {
      audienceMode: r.audienceMode === 'job' ? 'job' : 'interview',
      themePreference:
        r.themePreference === 'light' || r.themePreference === 'dark'
          ? r.themePreference
          : 'system',
    };
  });
}

export function saveSettings(settings: StoredSettings): Promise<void> {
  return writeJson(KEY_SETTINGS, settings);
}

export function loadPosition(): Promise<StoredPosition> {
  return readJson<StoredPosition>(KEY_POSITION, defaultPosition, (raw) => {
    if (typeof raw !== 'object' || raw === null) return null;
    const r = raw as Partial<StoredPosition>;
    const byTopic: Record<string, string> = {};
    if (r.lastCardByTopic && typeof r.lastCardByTopic === 'object') {
      for (const [topicId, cardId] of Object.entries(r.lastCardByTopic)) {
        if (typeof cardId === 'string') byTopic[topicId] = cardId;
      }
    }
    return {
      activeTopicId: typeof r.activeTopicId === 'string' ? r.activeTopicId : null,
      lastCardByTopic: byTopic,
    };
  });
}

export function savePosition(position: StoredPosition): Promise<void> {
  return writeJson(KEY_POSITION, position);
}

export function loadBookmarks(): Promise<string[]> {
  return readJson<string[]>(KEY_BOOKMARKS, [], (raw) =>
    Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string') : null
  );
}

export function saveBookmarks(bookmarks: string[]): Promise<void> {
  return writeJson(KEY_BOOKMARKS, bookmarks);
}

/**
 * Clears what the reader has *done*. Bookmarks are what the reader *chose to keep*, so
 * they deliberately survive both a full reset and a per-topic reset.
 */
export async function clearProgress(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([KEY_PROGRESS, KEY_POSITION]);
  } catch {
    // ignore
  }
}
