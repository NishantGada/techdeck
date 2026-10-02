import type { Deck, TopicSummary } from './types';

/**
 * Where the reader is across topics. Separate from Progress: this is navigation state
 * (which topic is open, and where each one was left), not a record of what was learned.
 */
export interface SessionPosition {
  activeTopicId: string | null;
  /** Topic id -> the card that topic was last left on. */
  lastCardByTopic: Record<string, string>;
}

export const emptySession: SessionPosition = { activeTopicId: null, lastCardByTopic: {} };

/** Records where a topic was left. Every other topic's bookmarked place is untouched. */
export function rememberCard(
  position: SessionPosition,
  topicId: string,
  cardId: string
): SessionPosition {
  if (position.lastCardByTopic[topicId] === cardId && position.activeTopicId === topicId) {
    return position;
  }
  return {
    activeTopicId: topicId,
    lastCardByTopic: { ...position.lastCardByTopic, [topicId]: cardId },
  };
}

export function resumeCardFor(position: SessionPosition, topicId: string): string | null {
  return position.lastCardByTopic[topicId] ?? null;
}

/**
 * Which card to land on when opening a topic: an explicit choice (a bookmark, or "read
 * from the start") wins; otherwise pick up where that topic was left.
 */
export function anchorForTopic(
  position: SessionPosition,
  topicId: string,
  explicitCardId?: string
): string | null {
  return explicitCardId ?? resumeCardFor(position, topicId);
}

export interface ResumeOption {
  cardId: string;
  ordinal: number;
  total: number;
}

/**
 * The "continue" offer for a topic, or null when there is nothing to continue from —
 * the topic is unread, was left on its first card, or was left on a card the current
 * audience mode no longer shows.
 */
export function resumeOptionFor(
  position: SessionPosition,
  topic: TopicSummary,
  deck: Deck
): ResumeOption | null {
  const cardId = resumeCardFor(position, topic.id);
  if (!cardId) return null;
  if (cardId === topic.cardIds[0]) return null;

  const ref = deck.cardsById[cardId];
  if (!ref || ref.topicId !== topic.id) return null;

  return { cardId, ordinal: ref.ordinalInTopic, total: ref.totalInTopic };
}

/** Opens a topic, remembering the switch. The previous topic keeps its own place. */
export function openTopic(
  position: SessionPosition,
  topicId: string,
  explicitCardId?: string
): { position: SessionPosition; anchorCardId: string | null } {
  const anchorCardId = anchorForTopic(position, topicId, explicitCardId);
  return {
    position: { ...position, activeTopicId: topicId },
    anchorCardId,
  };
}

/** Drops a topic's remembered place, e.g. after that topic's progress is reset. */
export function forgetTopic(position: SessionPosition, topicId: string): SessionPosition {
  if (!(topicId in position.lastCardByTopic)) return position;
  const lastCardByTopic = { ...position.lastCardByTopic };
  delete lastCardByTopic[topicId];
  return { ...position, lastCardByTopic };
}
