import type { QuizQuestion } from '../content/types';
import {
  answerQuiz,
  buildFeed,
  emptyProgress,
  indexOfCard,
  markReviewSeen,
  markSeen,
  resetTopic,
  type Deck,
  type FeedNode,
  type Progress,
} from '../feed';

/** Screens generated beyond the reader's current position. Paging only needs one. */
const LOOKAHEAD = 3;
/** Hard ceiling when materialising the whole feed to resume into it. */
const MAX_SCREENS = 2000;

export interface FeedState {
  ready: boolean;
  progress: Progress;
  nodes: FeedNode[];
  index: number;
  /**
   * Screens the reader has already reached are never regenerated, so newly-seen cards
   * and fresh answers change only what is still ahead of them.
   */
  frozenLength: number;
  /** Bumped when the feed should scroll itself somewhere the reader did not swipe to. */
  scrollToken: number;
}

export type Action =
  | { type: 'hydrate'; deck: Deck; progress: Progress; resumeCardId: string | null }
  | { type: 'rebuild'; deck: Deck; anchorCardId: string | null }
  | { type: 'seen'; deck: Deck; cardId: string }
  | { type: 'reviewSeen'; deck: Deck; quizId: string; cardId: string }
  | { type: 'answer'; deck: Deck; question: QuizQuestion; optionId: string; at: number }
  | { type: 'index'; deck: Deck; index: number }
  | { type: 'jump'; deck: Deck; cardId: string }
  | { type: 'restart'; deck: Deck }
  | {
      type: 'resetTopic';
      deck: Deck;
      cardIds: string[];
      quizIds: string[];
      /** True when the topic being reset is the one on screen. */
      resetActive: boolean;
    }
  | { type: 'reset'; deck: Deck };

export const initialState: FeedState = {
  ready: false,
  progress: emptyProgress(),
  nodes: [],
  index: 0,
  frozenLength: 0,
  scrollToken: 0,
};

/**
 * The card to re-anchor on when the feed has to be rebuilt underneath the reader.
 * Walks back from `index` so that sitting on a quiz or the end screen does not collapse
 * to "no anchor", which the rebuild would otherwise treat as "start from the top".
 */
export function anchorCardAt(nodes: FeedNode[], index: number): string | null {
  for (let i = Math.min(index, nodes.length - 1); i >= 0; i--) {
    const screen = nodes[i]?.screen;
    if (screen?.kind === 'card') return screen.cardId;
  }
  return null;
}

/** Regenerates everything past the frozen prefix against the current progress. */
export function retile(deck: Deck, state: FeedState, progress: Progress, index: number): FeedNode[] {
  const keep = Math.min(Math.max(state.frozenLength, index + 1), state.nodes.length);
  return buildFeed(deck, progress, {
    length: keep + LOOKAHEAD,
    prefix: state.nodes.slice(0, keep),
  });
}

/** Builds the feed from nothing and lands on `anchorCardId` if it is still in there. */
export function rebuild(deck: Deck, progress: Progress, anchorCardId: string | null): FeedState {
  const full = buildFeed(deck, progress, { length: MAX_SCREENS });
  const at = anchorCardId ? indexOfCard(full, anchorCardId) : -1;
  const index = at >= 0 ? at : 0;
  return {
    ready: true,
    progress,
    nodes: full.slice(0, Math.max(index + 1 + LOOKAHEAD, 1)),
    index,
    frozenLength: index + 1,
    scrollToken: 0,
  };
}

export function reducer(state: FeedState, action: Action): FeedState {
  switch (action.type) {
    case 'hydrate': {
      const next = rebuild(action.deck, action.progress, action.resumeCardId);
      return { ...next, scrollToken: state.scrollToken + 1 };
    }

    case 'rebuild': {
      if (!state.ready) return state;
      const next = rebuild(action.deck, state.progress, action.anchorCardId);
      return { ...next, scrollToken: state.scrollToken + 1 };
    }

    case 'seen': {
      const progress = markSeen(state.progress, action.cardId);
      if (progress === state.progress) return state;
      return { ...state, progress, nodes: retile(action.deck, state, progress, state.index) };
    }

    case 'reviewSeen': {
      const progress = markReviewSeen(state.progress, action.quizId, action.cardId);
      if (progress === state.progress) return state;
      return { ...state, progress, nodes: retile(action.deck, state, progress, state.index) };
    }

    case 'answer': {
      const contentCount = state.nodes[action.at]?.cursorAfter.contentCount ?? 0;
      const { progress } = answerQuiz(state.progress, action.question, action.optionId, contentCount);
      return { ...state, progress, nodes: retile(action.deck, state, progress, state.index) };
    }

    case 'index': {
      if (action.index === state.index) return state;
      const frozenLength = Math.max(state.frozenLength, action.index + 1);
      const withFrozen = { ...state, frozenLength };
      return {
        ...withFrozen,
        index: action.index,
        nodes: retile(action.deck, withFrozen, state.progress, action.index),
      };
    }

    case 'jump': {
      const at = indexOfCard(state.nodes, action.cardId);
      if (at >= 0) {
        const frozenLength = Math.max(state.frozenLength, at + 1);
        const withFrozen = { ...state, frozenLength };
        return {
          ...withFrozen,
          index: at,
          nodes: retile(action.deck, withFrozen, state.progress, at),
          scrollToken: state.scrollToken + 1,
        };
      }
      // Not materialised yet: rebuild the whole feed and land on it.
      const next = rebuild(action.deck, state.progress, action.cardId);
      return { ...next, scrollToken: state.scrollToken + 1 };
    }

    case 'restart': {
      // Back to the first screen without touching what has been learned.
      const next = rebuild(action.deck, state.progress, null);
      return { ...next, scrollToken: state.scrollToken + 1 };
    }

    case 'resetTopic': {
      const progress = resetTopic(state.progress, action.cardIds, action.quizIds);
      // Resetting the topic on screen sends the reader back to its first card, since it
      // is now unread. Resetting any other topic must not move them at all.
      const anchor = action.resetActive ? null : anchorCardAt(state.nodes, state.index);
      const next = rebuild(action.deck, progress, anchor);
      return { ...next, scrollToken: state.scrollToken + 1 };
    }

    case 'reset': {
      const next = rebuild(action.deck, emptyProgress(), null);
      return { ...next, scrollToken: state.scrollToken + 1 };
    }

    default:
      return state;
  }
}
