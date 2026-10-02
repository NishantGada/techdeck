import authJson from '../../../content/auth.json';
import capJson from '../../../content/cap.json';
import type { TopicFile } from '../../content/types';
import { validateTopicFiles } from '../../content/validate';
import { buildDeck } from '../order';
import { findEligibleQuiz } from '../quiz';
import { nextScreen } from '../sequence';
import { initialCursor, type Progress } from '../types';
import { describeRun, makeCards, makeQuiz, makeTopic, simulate } from './fixtures';

const { topics, issues } = validateTopicFiles([
  { name: 'auth.json', data: authJson },
  { name: 'cap.json', data: capJson },
]);
const byId = new Map(topics.map((t) => [t.topic.id, t]));
const auth = byId.get('auth') as TopicFile;
const cap = byId.get('cap') as TopicFile;

describe('the bundled library as a whole', () => {
  it('validates with both topic files present', () => {
    expect(issues.filter((i) => i.level === 'fatal')).toEqual([]);
    expect(issues.filter((i) => i.level === 'warning')).toEqual([]);
  });

  it('orders topics deterministically for the Topics list', () => {
    // Both declare no prerequisites, so the tie-break is input order.
    const deck = buildDeck([auth, cap], 'interview');
    expect(deck.topics.map((t) => t.id)).toEqual(['auth', 'cap']);
  });
});

describe('a deck scoped to one topic', () => {
  it('contains only that topic’s cards', () => {
    const deck = buildDeck([cap], 'interview');
    expect(deck.topics.map((t) => t.id)).toEqual(['cap']);
    expect(deck.base.every((r) => r.topicId === 'cap')).toBe(true);
    expect(deck.base).toHaveLength(9);
  });

  it('does not leak the other topic’s cards into the run', () => {
    const deck = buildDeck([auth], 'interview');
    const run = describeRun(simulate(deck, { maxScreens: 400 }));
    expect(run.some((s) => s.startsWith('CAP-'))).toBe(false);
    expect(run[0]).toBe('AUTH-01');
  });

  it('ends after its own cards rather than running on into the next topic', () => {
    const deck = buildDeck([cap], 'interview');
    const run = describeRun(simulate(deck));
    expect(run[run.length - 1]).toBe('END');
    expect(run.filter((s) => s.startsWith('CAP-'))).toHaveLength(9);
  });

  it('still injects that topic’s own quizzes on the 4-card cadence', () => {
    const deck = buildDeck([cap], 'interview');
    const run = describeRun(simulate(deck));
    expect(run[4]).toBe('Q:Q-CAP-01');
    expect(run).toContain('Q:Q-CAP-02');
  });

  it('never offers another topic’s quiz', () => {
    const deck = buildDeck([cap], 'interview');
    const run = describeRun(simulate(deck));
    expect(run.some((s) => s.startsWith('Q:Q-AUTH'))).toBe(false);
  });

  it('gives a long topic the same treatment as a short one', () => {
    const deck = buildDeck([auth], 'interview');
    const run = describeRun(simulate(deck, { maxScreens: 400 }));
    expect(run[run.length - 1]).toBe('END');
    // 34 visible cards in interview mode (36 less the two job-only ones).
    expect(run.filter((s) => s.startsWith('AUTH-') && !s.startsWith('R:'))).toHaveLength(34);
  });
});

describe('progress is global even though the deck is scoped', () => {
  it('a card seen while reading one topic satisfies another topic’s prerequisite', () => {
    // A quiz in topic B that depends on a card from topic A stays answerable, because
    // eligibility reads the global seen set rather than the current deck.
    const a = makeTopic('a', makeCards('a', 4));
    const b = makeTopic('b', makeCards('b', 4), { quiz: [makeQuiz('QB', ['a1', 'b1'])] });

    const scopedToB = buildDeck([b], 'interview');
    const progress: Progress = { seenOrder: ['a1', 'b1'], quiz: {} };
    expect(findEligibleQuiz(scopedToB, progress)?.id).toBe('QB');

    const withoutA: Progress = { seenOrder: ['b1'], quiz: {} };
    expect(findEligibleQuiz(scopedToB, withoutA)).toBeNull();
    expect(buildDeck([a], 'interview').base).toHaveLength(4);
  });

  it('a review card in another topic does not block its question forever', () => {
    // The scoped deck can never re-surface a1, so holding QB behind it would retire QB
    // by accident. It stays offerable instead.
    const b = makeTopic('b', makeCards('b', 8), { quiz: [makeQuiz('QB', ['b1'], ['a1'])] });
    const deck = buildDeck([b], 'interview');
    const progress: Progress = {
      seenOrder: ['b1', 'b2', 'b3', 'b4'],
      quiz: { QB: { status: 'wrong', wrongAtContentCount: 4, awaitingReview: ['a1'] } },
    };

    expect(findEligibleQuiz(deck, progress)?.id).toBe('QB');
    const cursor = { ...initialCursor(), baseIndex: 4, contentCount: 4, contentSinceQuiz: 4 };
    expect(nextScreen(deck, progress, cursor).screen).toMatchObject({ kind: 'quiz', quizId: 'QB' });
  });
});
