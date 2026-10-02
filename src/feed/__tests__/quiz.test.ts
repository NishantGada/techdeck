import { buildDeck } from '../order';
import { eligibleQuizzes, findEligibleQuiz, isQuizEligible, satisfiedAt, seenIndex } from '../quiz';
import { emptyProgress, type Progress } from '../types';
import { makeCards, makeQuiz, makeTopic } from './fixtures';

function progressWith(seen: string[], quiz: Progress['quiz'] = {}): Progress {
  return { seenOrder: seen, quiz };
}

const deck = buildDeck(
  [
    makeTopic('t', makeCards('c', 10), {
      quiz: [
        makeQuiz('Q1', ['c1', 'c2'], ['c1']),
        makeQuiz('Q2', ['c3'], ['c3']),
        makeQuiz('Q3', ['c9'], ['c9']),
      ],
    }),
  ],
  'interview'
);

describe('isQuizEligible', () => {
  it('is false until every prerequisite has been seen', () => {
    const p = progressWith(['c1']);
    expect(isQuizEligible(deck.quiz[0], p, seenIndex(p), deck)).toBe(false);
  });

  it('is true once all prerequisites are seen', () => {
    const p = progressWith(['c1', 'c2']);
    expect(isQuizEligible(deck.quiz[0], p, seenIndex(p), deck)).toBe(true);
  });

  it('is false forever once answered correctly', () => {
    const p = progressWith(['c1', 'c2'], { Q1: { status: 'correct' } });
    expect(isQuizEligible(deck.quiz[0], p, seenIndex(p), deck)).toBe(false);
  });

  it('is not blocked by a review card this deck cannot deliver', () => {
    // CAP-style case: the review card lives in another topic, so nothing in this deck
    // will ever re-surface it. Blocking on it would retire the question by accident.
    const p = progressWith(['c1', 'c2'], {
      Q1: { status: 'wrong', wrongAtContentCount: 4, awaitingReview: ['elsewhere-01'] },
    });
    expect(isQuizEligible(deck.quiz[0], p, seenIndex(p), deck)).toBe(true);
  });

  it('is false while review cards from a wrong answer are outstanding', () => {
    const p = progressWith(['c1', 'c2'], {
      Q1: { status: 'wrong', wrongAtContentCount: 4, awaitingReview: ['c1'] },
    });
    expect(isQuizEligible(deck.quiz[0], p, seenIndex(p), deck)).toBe(false);
  });

  it('is true again once those review cards have been re-seen', () => {
    const p = progressWith(['c1', 'c2'], {
      Q1: { status: 'wrong', wrongAtContentCount: 4, awaitingReview: [] },
    });
    expect(isQuizEligible(deck.quiz[0], p, seenIndex(p), deck)).toBe(true);
  });

  it('treats a question with no prerequisites as immediately eligible', () => {
    const free = makeQuiz('Q0', []);
    const p = emptyProgress();
    expect(isQuizEligible(free, p, seenIndex(p), deck)).toBe(true);
  });
});

describe('satisfiedAt', () => {
  it('is the position of the last prerequisite to be seen', () => {
    const p = progressWith(['c3', 'c1', 'c2']);
    expect(satisfiedAt(deck.quiz[0], seenIndex(p))).toBe(2); // c2, at index 2
    expect(satisfiedAt(deck.quiz[1], seenIndex(p))).toBe(0); // c3, at index 0
  });

  it('is infinite when a prerequisite is unseen', () => {
    const p = progressWith(['c1']);
    expect(satisfiedAt(deck.quiz[0], seenIndex(p))).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('findEligibleQuiz', () => {
  it('returns null when nothing is eligible', () => {
    expect(findEligibleQuiz(deck, progressWith([]))).toBeNull();
  });

  it('picks the question whose prerequisites were satisfied earliest', () => {
    // c3 seen first, so Q2 has been ready longer than Q1 even though Q1 comes first.
    const p = progressWith(['c3', 'c1', 'c2']);
    expect(eligibleQuizzes(deck, p).map((q) => q.id)).toEqual(['Q1', 'Q2']);
    expect(findEligibleQuiz(deck, p)?.id).toBe('Q2');
  });

  it('picks the other one when the seen order is reversed', () => {
    const p = progressWith(['c1', 'c2', 'c3']);
    expect(findEligibleQuiz(deck, p)?.id).toBe('Q1');
  });

  it('falls back to deck order on an exact tie', () => {
    // Both become ready at index 0 is impossible with distinct prereqs, so tie via
    // two questions on the same card.
    const tied = buildDeck(
      [
        makeTopic('t', makeCards('c', 3), {
          quiz: [makeQuiz('QA', ['c1']), makeQuiz('QB', ['c1'])],
        }),
      ],
      'interview'
    );
    expect(findEligibleQuiz(tied, progressWith(['c1']))?.id).toBe('QA');
  });

  it('skips a retired question and offers the next oldest', () => {
    const p = progressWith(['c3', 'c1', 'c2'], { Q2: { status: 'correct' } });
    expect(findEligibleQuiz(deck, p)?.id).toBe('Q1');
  });
});

describe('seenIndex', () => {
  it('keeps the first sighting when an id repeats', () => {
    expect(seenIndex(progressWith(['a', 'b', 'a'])).get('a')).toBe(0);
  });
});
