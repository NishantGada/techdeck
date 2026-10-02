import type { AudienceMode, Card, CardRef, TopicFile } from '../content/types';
import type { Deck, TopicSummary } from './types';

/**
 * Kahn's algorithm with a stable tie-break: when several topics are ready, the one
 * that appeared earliest in the input wins. That makes the base sequence deterministic
 * for a given set of files.
 */
export function topologicalSortTopics(topics: TopicFile[]): TopicFile[] {
  const byId = new Map<string, TopicFile>();
  topics.forEach((t) => byId.set(t.topic.id, t));

  const indexOf = new Map<string, number>();
  topics.forEach((t, i) => indexOf.set(t.topic.id, i));

  // Unknown prerequisites are reported by content validation; ignore them here so a
  // dangling reference degrades to "no constraint" rather than deadlocking the feed.
  const remaining = new Map<string, Set<string>>();
  for (const t of topics) {
    remaining.set(t.topic.id, new Set(t.topic.prerequisites.filter((p) => byId.has(p))));
  }

  const ordered: TopicFile[] = [];
  const done = new Set<string>();

  while (ordered.length < topics.length) {
    const ready = topics
      .filter((t) => !done.has(t.topic.id))
      .filter((t) => [...remaining.get(t.topic.id)!].every((p) => done.has(p)))
      .sort((a, b) => indexOf.get(a.topic.id)! - indexOf.get(b.topic.id)!);

    if (ready.length === 0) {
      const stuck = topics.filter((t) => !done.has(t.topic.id)).map((t) => t.topic.id);
      throw new Error(`Cycle in topic prerequisites among: ${stuck.join(', ')}`);
    }

    const next = ready[0];
    ordered.push(next);
    done.add(next.topic.id);
  }

  return ordered;
}

export function isVisible(card: Card, mode: AudienceMode): boolean {
  return card.audience === 'shared' || card.audience === mode;
}

/**
 * Builds the deterministic base sequence: topics in prerequisite order, and within a
 * topic every card in `ordinal` order before the next topic starts (deep-first).
 * Cards filtered out by audience are dropped entirely.
 */
export function buildDeck(topics: TopicFile[], mode: AudienceMode): Deck {
  const ordered = topologicalSortTopics(topics);

  const base: CardRef[] = [];
  const cardsById: Record<string, CardRef> = {};
  const quizById: Record<string, TopicFile['quiz'][number]> = {};
  const quiz: TopicFile['quiz'] = [];
  const topicSummaries: TopicSummary[] = [];

  for (const t of ordered) {
    const visible = t.cards
      .filter((c) => isVisible(c, mode))
      .slice()
      .sort((a, b) => a.ordinal - b.ordinal);

    const startIndex = base.length;

    visible.forEach((card, i) => {
      const ref: CardRef = {
        card,
        topicId: t.topic.id,
        topicTitle: t.topic.title,
        // Position among *visible* cards, so "3 / 8" never counts a card the reader
        // will not be shown in this audience mode.
        ordinalInTopic: i + 1,
        totalInTopic: visible.length,
      };
      base.push(ref);
      cardsById[card.id] = ref;
    });

    for (const q of t.quiz) {
      quiz.push(q);
      quizById[q.id] = q;
    }

    topicSummaries.push({
      id: t.topic.id,
      title: t.topic.title,
      domain: t.topic.domain,
      summary: t.topic.summary,
      cardIds: visible.map((c) => c.id),
      allCardIds: t.cards.map((c) => c.id),
      quizIds: t.quiz.map((q) => q.id),
      startIndex,
    });
  }

  return { base, quiz, cardsById, quizById, topics: topicSummaries };
}

export interface TopicProgress {
  topicId: string;
  seen: number;
  total: number;
}

/** Cards seen / visible cards, per topic, in feed order. */
export function topicProgress(deck: Deck, seen: Iterable<string>): TopicProgress[] {
  const seenSet = new Set(seen);
  return deck.topics.map((t) => ({
    topicId: t.id,
    seen: t.cardIds.filter((id) => seenSet.has(id)).length,
    total: t.cardIds.length,
  }));
}
