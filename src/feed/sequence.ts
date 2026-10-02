import { findEligibleQuiz } from './quiz';
import {
  QUIZ_EVERY,
  REVIEW_DELAY,
  initialCursor,
  reviewKey,
  type Deck,
  type FeedCursor,
  type FeedNode,
  type Progress,
  type Screen,
} from './types';

interface DueReview {
  key: string;
  cardId: string;
  quizId: string;
  dueAt: number;
}

/**
 * Review cards owed to the reader and ready to show.
 *
 * A review comes due REVIEW_DELAY content cards after the wrong answer. If the reader
 * swipes past one without dwelling long enough to count as re-seen, it stays owed and
 * comes round again after another REVIEW_DELAY, so a question can never be permanently
 * stranded behind a review the reader skimmed.
 *
 * Once the base sequence runs out, contentCount stops advancing, so anything still owed
 * is flushed — but only once each, otherwise the end of the feed would loop forever.
 */
function dueReviews(
  deck: Deck,
  progress: Progress,
  cursor: FeedCursor,
  baseExhausted: boolean
): DueReview[] {
  const out: DueReview[] = [];

  for (const q of deck.quiz) {
    const state = progress.quiz[q.id];
    if (!state || state.status !== 'wrong') continue;

    for (const cardId of state.awaitingReview) {
      // A review card hidden by the current audience mode can never be shown.
      if (!deck.cardsById[cardId]) continue;

      const key = reviewKey(q.id, cardId);
      const prior = cursor.emittedReviews.find((e) => e.key === key);
      const dueAt = prior
        ? prior.atContentCount + REVIEW_DELAY
        : state.wrongAtContentCount + REVIEW_DELAY;

      if (baseExhausted) {
        if (prior) continue;
      } else if (cursor.contentCount < dueAt) {
        continue;
      }

      out.push({ key, cardId, quizId: q.id, dueAt });
    }
  }

  out.sort((a, b) => a.dueAt - b.dueAt || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return out;
}

function screenKey(kind: Screen['kind'], id: string, screenIndex: number): string {
  return `${kind}:${id}:${screenIndex}`;
}

/**
 * The one decision function: given the deck, what the reader has seen and answered, and
 * where they are in the sequence, what is the next screen?
 *
 * Order of precedence:
 *   1. a review card that has come due
 *   2. a quiz, if at least QUIZ_EVERY content cards have passed since the last one and
 *      something is eligible (never two quiz screens in a row)
 *   3. the next content card
 *   4. the end screen
 */
export function nextScreen(deck: Deck, progress: Progress, cursor: FeedCursor): FeedNode {
  const baseExhausted = cursor.baseIndex >= deck.base.length;
  const advance = { ...cursor, screenIndex: cursor.screenIndex + 1 };

  const due = dueReviews(deck, progress, cursor, baseExhausted);
  if (due.length > 0) {
    const pick = due[0];
    return {
      screen: {
        kind: 'card',
        key: screenKey('card', pick.cardId, cursor.screenIndex),
        cardId: pick.cardId,
        review: true,
        reviewForQuizId: pick.quizId,
      },
      cursorAfter: {
        ...advance,
        // A review card is not a content card: it moves neither the quiz cadence nor
        // the content count.
        lastWasQuiz: false,
        emittedReviews: [
          ...cursor.emittedReviews.filter((e) => e.key !== pick.key),
          { key: pick.key, atContentCount: cursor.contentCount },
        ],
      },
    };
  }

  if (!cursor.lastWasQuiz && cursor.contentSinceQuiz >= QUIZ_EVERY) {
    const question = findEligibleQuiz(deck, progress);
    if (question) {
      return {
        screen: {
          kind: 'quiz',
          key: screenKey('quiz', question.id, cursor.screenIndex),
          quizId: question.id,
        },
        cursorAfter: { ...advance, lastWasQuiz: true, contentSinceQuiz: 0 },
      };
    }
  }

  if (!baseExhausted) {
    const ref = deck.base[cursor.baseIndex];
    return {
      screen: {
        kind: 'card',
        key: screenKey('card', ref.card.id, cursor.screenIndex),
        cardId: ref.card.id,
        review: false,
        reviewForQuizId: null,
      },
      cursorAfter: {
        ...advance,
        baseIndex: cursor.baseIndex + 1,
        contentCount: cursor.contentCount + 1,
        contentSinceQuiz: cursor.contentSinceQuiz + 1,
        lastWasQuiz: false,
      },
    };
  }

  return {
    screen: { kind: 'end', key: screenKey('end', 'feed', cursor.screenIndex) },
    cursorAfter: advance,
  };
}

export interface BuildFeedOptions {
  /** How many screens to produce in total, counting the prefix. */
  length: number;
  /** Already-emitted screens to resume from. They are returned unchanged. */
  prefix?: FeedNode[];
}

/**
 * Materialises the feed up to `length` screens. Generation stops at the end screen.
 *
 * Callers keep the screens the reader has already passed as `prefix` and regenerate only
 * the tail, so newly-seen cards and fresh answers can affect what comes next without ever
 * reshuffling what is already behind the reader.
 */
export function buildFeed(deck: Deck, progress: Progress, options: BuildFeedOptions): FeedNode[] {
  const nodes = options.prefix ? [...options.prefix] : [];

  if (nodes.length > 0 && nodes[nodes.length - 1].screen.kind === 'end') return nodes;

  let cursor = nodes.length > 0 ? nodes[nodes.length - 1].cursorAfter : initialCursor();

  while (nodes.length < options.length) {
    const node = nextScreen(deck, progress, cursor);
    nodes.push(node);
    cursor = node.cursorAfter;
    if (node.screen.kind === 'end') break;
  }

  return nodes;
}

/** First screen showing this card, or -1. Used to resume and to jump from Topics. */
export function indexOfCard(nodes: FeedNode[], cardId: string): number {
  return nodes.findIndex((n) => n.screen.kind === 'card' && n.screen.cardId === cardId);
}

/** contentCount at the moment a screen was shown — the clock a wrong answer is stamped with. */
export function contentCountBefore(nodes: FeedNode[], index: number): number {
  if (index <= 0) return 0;
  return nodes[index - 1].cursorAfter.contentCount;
}
