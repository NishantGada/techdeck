import authJson from '../../../content/auth.json';
import capJson from '../../../content/cap.json';
import type { TopicFile } from '../../content/types';
import { validateTopicFiles } from '../../content/validate';
import { buildDeck, emptyProgress, markSeen, type Progress } from '../../feed';
import { anchorCardAt, initialState, reducer, type FeedState } from '../feedReducer';

const { topics } = validateTopicFiles([
  { name: 'auth.json', data: authJson },
  { name: 'cap.json', data: capJson },
]);
const byId = new Map((topics as TopicFile[]).map((t) => [t.topic.id, t]));
const authDeck = buildDeck([byId.get('auth')!], 'interview');
const capDeck = buildDeck([byId.get('cap')!], 'interview');

/** A reader who has seen the first n cards of a deck. */
function seenThrough(deck: ReturnType<typeof buildDeck>, n: number): Progress {
  let p = emptyProgress();
  for (const ref of deck.base.slice(0, n)) p = markSeen(p, ref.card.id);
  return p;
}

function cardIdAt(state: FeedState, index: number): string | null {
  const screen = state.nodes[index]?.screen;
  return screen?.kind === 'card' ? screen.cardId : null;
}

describe('rebuild anchoring', () => {
  const hydrated = reducer(initialState, {
    type: 'hydrate',
    deck: authDeck,
    progress: seenThrough(authDeck, 6),
    resumeCardId: 'AUTH-06',
  });

  it('lands on the anchor card, not the top of the topic', () => {
    expect(cardIdAt(hydrated, hydrated.index)).toBe('AUTH-06');
    expect(hydrated.index).toBeGreaterThan(0);
  });

  it('materialises enough screens to reach the anchor', () => {
    expect(hydrated.nodes.length).toBeGreaterThan(hydrated.index);
  });

  it('falls back to the top when the anchor is not in this deck', () => {
    // The failure mode behind "it says 6 / 34 but starts me at 1 / 34": a rebuild that
    // receives an anchor belonging to a different topic silently restarts.
    const wrong = reducer(hydrated, {
      type: 'rebuild',
      deck: authDeck,
      anchorCardId: 'CAP-03',
    });
    expect(wrong.index).toBe(0);
  });
});

describe('switching topics', () => {
  it('opens the new topic at its remembered card', () => {
    const onAuth = reducer(initialState, {
      type: 'hydrate',
      deck: authDeck,
      progress: seenThrough(authDeck, 6),
      resumeCardId: 'AUTH-06',
    });

    const onCap = reducer(onAuth, { type: 'rebuild', deck: capDeck, anchorCardId: 'CAP-03' });
    expect(cardIdAt(onCap, onCap.index)).toBe('CAP-03');

    const backToAuth = reducer(onCap, {
      type: 'rebuild',
      deck: authDeck,
      anchorCardId: 'AUTH-06',
    });
    expect(cardIdAt(backToAuth, backToAuth.index)).toBe('AUTH-06');
  });

  it('never leaves the previous topic’s cards in the new topic’s feed', () => {
    const onAuth = reducer(initialState, {
      type: 'hydrate',
      deck: authDeck,
      progress: emptyProgress(),
      resumeCardId: null,
    });
    const onCap = reducer(onAuth, { type: 'rebuild', deck: capDeck, anchorCardId: null });
    const ids = onCap.nodes
      .map((n) => (n.screen.kind === 'card' ? n.screen.cardId : null))
      .filter((id): id is string => id !== null);
    expect(ids.every((id) => id.startsWith('CAP-'))).toBe(true);
  });

  it('bumps the scroll token so the feed knows to move itself', () => {
    const onAuth = reducer(initialState, {
      type: 'hydrate',
      deck: authDeck,
      progress: emptyProgress(),
      resumeCardId: null,
    });
    const onCap = reducer(onAuth, { type: 'rebuild', deck: capDeck, anchorCardId: 'CAP-03' });
    expect(onCap.scrollToken).toBeGreaterThan(onAuth.scrollToken);
  });

  it('resets the frozen prefix to the landing point', () => {
    const onAuth = reducer(initialState, {
      type: 'hydrate',
      deck: authDeck,
      progress: seenThrough(authDeck, 10),
      resumeCardId: 'AUTH-10',
    });
    const onCap = reducer(onAuth, { type: 'rebuild', deck: capDeck, anchorCardId: 'CAP-02' });
    expect(onCap.frozenLength).toBe(onCap.index + 1);
  });
});

describe('restart', () => {
  it('returns to the first card without touching progress', () => {
    const progress = seenThrough(authDeck, 6);
    const onAuth = reducer(initialState, {
      type: 'hydrate',
      deck: authDeck,
      progress,
      resumeCardId: 'AUTH-06',
    });
    const restarted = reducer(onAuth, { type: 'restart', deck: authDeck });
    expect(restarted.index).toBe(0);
    expect(restarted.progress.seenOrder).toEqual(progress.seenOrder);
  });
});

describe('resetting a topic', () => {
  const authTopic = buildDeck([byId.get('auth')!], 'interview').topics[0];
  const capTopic = buildDeck([byId.get('cap')!], 'interview').topics[0];

  /** Reading auth, part-way through, with cap already part-read too. */
  function readingAuthWithCapProgress(): FeedState {
    let progress = seenThrough(authDeck, 8);
    for (const ref of capDeck.base.slice(0, 4)) progress = markSeen(progress, ref.card.id);
    return reducer(initialState, {
      type: 'hydrate',
      deck: authDeck,
      progress,
      resumeCardId: 'AUTH-08',
    });
  }

  it('clears a topic that is not the one being read', () => {
    const state = readingAuthWithCapProgress();
    expect(state.progress.seenOrder.filter((id) => id.startsWith('CAP-'))).toHaveLength(4);

    const after = reducer(state, {
      type: 'resetTopic',
      deck: authDeck,
      cardIds: capTopic.allCardIds,
      quizIds: capTopic.quizIds,
      resetActive: false,
    });

    expect(after.progress.seenOrder.filter((id) => id.startsWith('CAP-'))).toEqual([]);
  });

  it('leaves the topic being read untouched when another is reset', () => {
    const state = readingAuthWithCapProgress();
    const after = reducer(state, {
      type: 'resetTopic',
      deck: authDeck,
      cardIds: capTopic.allCardIds,
      quizIds: capTopic.quizIds,
      resetActive: false,
    });
    expect(after.progress.seenOrder.filter((id) => id.startsWith('AUTH-'))).toHaveLength(8);
  });

  it('does not move the reader when another topic is reset', () => {
    const state = readingAuthWithCapProgress();
    const after = reducer(state, {
      type: 'resetTopic',
      deck: authDeck,
      cardIds: capTopic.allCardIds,
      quizIds: capTopic.quizIds,
      resetActive: false,
    });
    expect(cardIdAt(after, after.index)).toBe(cardIdAt(state, state.index));
  });

  it('sends the reader to the top when the topic being read is reset', () => {
    const state = readingAuthWithCapProgress();
    const after = reducer(state, {
      type: 'resetTopic',
      deck: authDeck,
      cardIds: authTopic.allCardIds,
      quizIds: authTopic.quizIds,
      resetActive: true,
    });
    expect(after.index).toBe(0);
    expect(cardIdAt(after, 0)).toBe('AUTH-01');
    expect(after.progress.seenOrder.filter((id) => id.startsWith('AUTH-'))).toEqual([]);
  });

  it('keeps the reader in place even when they are sitting on a quiz', () => {
    // Anchoring naively on "the current screen" yields null on a quiz screen, which the
    // rebuild treats as "start from the top" — the reader would be thrown to card 1.
    const state = readingAuthWithCapProgress();
    const quizAt = state.nodes.findIndex((n) => n.screen.kind === 'quiz');
    expect(quizAt).toBeGreaterThan(-1);

    const onQuiz = { ...state, index: quizAt };
    const after = reducer(onQuiz, {
      type: 'resetTopic',
      deck: authDeck,
      cardIds: capTopic.allCardIds,
      quizIds: capTopic.quizIds,
      resetActive: false,
    });
    expect(after.index).toBeGreaterThan(0);
  });
});

describe('anchorCardAt', () => {
  const state = reducer(initialState, {
    type: 'hydrate',
    deck: authDeck,
    progress: seenThrough(authDeck, 8),
    resumeCardId: 'AUTH-08',
  });

  it('returns the card at the index when it is a card', () => {
    expect(anchorCardAt(state.nodes, 0)).toBe('AUTH-01');
  });

  it('walks back to the nearest preceding card from a quiz', () => {
    const quizAt = state.nodes.findIndex((n) => n.screen.kind === 'quiz');
    expect(anchorCardAt(state.nodes, quizAt)).toBe('AUTH-04');
  });

  it('is null for an empty feed', () => {
    expect(anchorCardAt([], 0)).toBeNull();
  });
});
