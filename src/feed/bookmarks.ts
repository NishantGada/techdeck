import type { CardRef } from '../content/types';
import type { Deck, TopicSummary } from './types';

/**
 * Bookmarks are card ids the reader chose to keep. They are deliberately *not* part of
 * Progress: they do not affect sequencing, quiz eligibility or review scheduling, and
 * resetting progress does not throw them away.
 */

export function isBookmarked(bookmarks: readonly string[], cardId: string): boolean {
  return bookmarks.includes(cardId);
}

/** Adds if absent, removes if present. Newly added ids go on the end. */
export function toggleBookmark(bookmarks: readonly string[], cardId: string): string[] {
  return bookmarks.includes(cardId)
    ? bookmarks.filter((id) => id !== cardId)
    : [...bookmarks, cardId];
}

export function removeBookmark(bookmarks: readonly string[], cardId: string): string[] {
  return bookmarks.filter((id) => id !== cardId);
}

export interface TopicBookmarks {
  /** Bookmarked cards in this topic that the current audience mode can show, in feed order. */
  cards: CardRef[];
  /**
   * Bookmarked cards in this topic that the current audience mode hides. Counted rather
   * than listed, so the reader is told something is missing instead of silently losing it.
   */
  hiddenCount: number;
}

/**
 * Bookmarks belonging to one topic, ordered by position in the topic rather than by when
 * they were saved — a reader scanning their bookmarks is re-reading the topic, not a log.
 */
export function bookmarksForTopic(
  bookmarks: readonly string[],
  topic: TopicSummary,
  deck: Deck
): TopicBookmarks {
  const saved = new Set(bookmarks);
  const inTopic = topic.allCardIds.filter((id) => saved.has(id));

  const cards: CardRef[] = [];
  let hiddenCount = 0;

  for (const id of inTopic) {
    const ref = deck.cardsById[id];
    if (ref) cards.push(ref);
    else hiddenCount += 1;
  }

  cards.sort((a, b) => a.ordinalInTopic - b.ordinalInTopic);
  return { cards, hiddenCount };
}

/** How many bookmarks a topic holds, hidden ones included. For the Topics list. */
export function bookmarkCountForTopic(
  bookmarks: readonly string[],
  topic: TopicSummary
): number {
  const saved = new Set(bookmarks);
  return topic.allCardIds.reduce((n, id) => (saved.has(id) ? n + 1 : n), 0);
}
