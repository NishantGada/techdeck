import type { CardRef, QuizQuestion } from '../content/types';

/** Content cards between quiz injections. */
export const QUIZ_EVERY = 4;
/** Content cards between a wrong answer and its review cards resurfacing. */
export const REVIEW_DELAY = 6;

export interface TopicSummary {
  id: string;
  title: string;
  domain: string;
  summary: string;
  /** Visible card ids, in feed order. */
  cardIds: string[];
  /** Every card id in the topic, including ones the current audience mode hides. */
  allCardIds: string[];
  /** Quiz ids belonging to this topic, so a topic can be reset on its own. */
  quizIds: string[];
  /** Index into Deck.base of this topic's first visible card. */
  startIndex: number;
}

/** The audience-filtered, prerequisite-ordered material the feed draws from. */
export interface Deck {
  base: CardRef[];
  quiz: QuizQuestion[];
  cardsById: Record<string, CardRef>;
  quizById: Record<string, QuizQuestion>;
  topics: TopicSummary[];
}

export type QuizState =
  | { status: 'correct' }
  | {
      status: 'wrong';
      /** Cursor contentCount when the wrong answer was given; the review clock starts here. */
      wrongAtContentCount: number;
      /** Review card ids not yet re-seen. Empty means the question is eligible again. */
      awaitingReview: string[];
    };

/** Everything persisted about what the reader has done. */
export interface Progress {
  /** Card ids in the order they were first seen. Order drives quiz tie-breaking. */
  seenOrder: string[];
  quiz: Record<string, QuizState>;
}

/** A record of a review card already offered, so it is not offered again immediately. */
export interface EmittedReview {
  /** `${quizId}|${cardId}` */
  key: string;
  atContentCount: number;
}

/** Position in the sequence. Everything needed to compute the next screen. */
export interface FeedCursor {
  /** Next index into Deck.base. */
  baseIndex: number;
  /** Content cards emitted so far. Review cards do not count. */
  contentCount: number;
  /** Content cards since the last quiz screen. */
  contentSinceQuiz: number;
  lastWasQuiz: boolean;
  emittedReviews: EmittedReview[];
  /** Number of screens emitted so far; used only to make keys unique. */
  screenIndex: number;
}

export interface CardScreen {
  kind: 'card';
  key: string;
  cardId: string;
  review: boolean;
  /** Set only on review screens: which question sent this card back. */
  reviewForQuizId: string | null;
}

export interface QuizScreen {
  kind: 'quiz';
  key: string;
  quizId: string;
}

export interface EndScreen {
  kind: 'end';
  key: string;
}

export type Screen = CardScreen | QuizScreen | EndScreen;

/** A screen plus the cursor state that follows it, so generation can resume anywhere. */
export interface FeedNode {
  screen: Screen;
  cursorAfter: FeedCursor;
}

export function initialCursor(): FeedCursor {
  return {
    baseIndex: 0,
    contentCount: 0,
    contentSinceQuiz: 0,
    lastWasQuiz: false,
    emittedReviews: [],
    screenIndex: 0,
  };
}

export function emptyProgress(): Progress {
  return { seenOrder: [], quiz: {} };
}

export function reviewKey(quizId: string, cardId: string): string {
  return `${quizId}|${cardId}`;
}
