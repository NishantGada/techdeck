import { hasSeen, markReviewSeen, markSeen, resetTopic } from '../progress';
import { emptyProgress, type Progress } from '../types';

describe('markSeen', () => {
  it('appends in first-seen order', () => {
    let p = emptyProgress();
    p = markSeen(p, 'b');
    p = markSeen(p, 'a');
    expect(p.seenOrder).toEqual(['b', 'a']);
  });

  it('is idempotent and preserves the original position', () => {
    let p = emptyProgress();
    p = markSeen(p, 'a');
    p = markSeen(p, 'b');
    const before = p;
    p = markSeen(p, 'a');
    expect(p).toBe(before);
    expect(p.seenOrder).toEqual(['a', 'b']);
  });

  it('does not mutate the input', () => {
    const p = emptyProgress();
    markSeen(p, 'a');
    expect(p.seenOrder).toEqual([]);
  });
});

describe('markReviewSeen', () => {
  const base: Progress = {
    seenOrder: ['c1'],
    quiz: { Q1: { status: 'wrong', wrongAtContentCount: 4, awaitingReview: ['c1', 'c2'] } },
  };

  it('clears one outstanding review card', () => {
    const p = markReviewSeen(base, 'Q1', 'c1');
    expect(p.quiz.Q1).toMatchObject({ awaitingReview: ['c2'] });
  });

  it('leaves the question pending until the last review card is cleared', () => {
    let p = markReviewSeen(base, 'Q1', 'c1');
    expect(p.quiz.Q1).toMatchObject({ awaitingReview: ['c2'] });
    p = markReviewSeen(p, 'Q1', 'c2');
    expect(p.quiz.Q1).toMatchObject({ awaitingReview: [] });
  });

  it('does not add the review card to the seen set', () => {
    const p = markReviewSeen(base, 'Q1', 'c1');
    expect(p.seenOrder).toEqual(['c1']);
  });

  it('ignores a question that was answered correctly', () => {
    const correct: Progress = { seenOrder: [], quiz: { Q1: { status: 'correct' } } };
    expect(markReviewSeen(correct, 'Q1', 'c1')).toBe(correct);
  });

  it('ignores an unknown question', () => {
    expect(markReviewSeen(base, 'nope', 'c1')).toBe(base);
  });
});

describe('hasSeen', () => {
  it('reflects the seen order', () => {
    expect(hasSeen({ seenOrder: ['a'], quiz: {} }, 'a')).toBe(true);
    expect(hasSeen({ seenOrder: ['a'], quiz: {} }, 'b')).toBe(false);
  });
});

describe('resetTopic', () => {
  const progress: Progress = {
    seenOrder: ['a1', 'b1', 'a2', 'b2'],
    quiz: {
      QA: { status: 'correct' },
      QB: { status: 'wrong', wrongAtContentCount: 4, awaitingReview: ['b1'] },
    },
  };

  it('un-sees only the cards of the topic being reset', () => {
    const next = resetTopic(progress, ['a1', 'a2'], ['QA']);
    expect(next.seenOrder).toEqual(['b1', 'b2']);
  });

  it('leaves other topics’ cards in their original order', () => {
    const next = resetTopic(progress, ['a1'], ['QA']);
    expect(next.seenOrder).toEqual(['b1', 'a2', 'b2']);
  });

  it('forgets the answers to that topic’s questions', () => {
    const next = resetTopic(progress, ['a1', 'a2'], ['QA']);
    expect(next.quiz.QA).toBeUndefined();
  });

  it('keeps every other topic’s answers untouched', () => {
    const next = resetTopic(progress, ['a1', 'a2'], ['QA']);
    expect(next.quiz.QB).toEqual({
      status: 'wrong',
      wrongAtContentCount: 4,
      awaitingReview: ['b1'],
    });
  });

  it('drops a reset card from another topic’s outstanding review debt', () => {
    // b1 belongs to the topic being reset, but QB (elsewhere) is waiting on it.
    // It is about to reappear as an ordinary card, so holding QB behind it would strand QB.
    const next = resetTopic(progress, ['b1'], []);
    expect(next.quiz.QB).toMatchObject({ awaitingReview: [] });
  });

  it('is a no-op for a topic with nothing recorded', () => {
    const next = resetTopic(progress, ['z1'], ['QZ']);
    expect(next.seenOrder).toEqual(progress.seenOrder);
    expect(next.quiz).toEqual(progress.quiz);
  });

  it('does not mutate the input', () => {
    resetTopic(progress, ['a1', 'a2'], ['QA']);
    expect(progress.seenOrder).toEqual(['a1', 'b1', 'a2', 'b2']);
    expect(progress.quiz.QA).toEqual({ status: 'correct' });
  });
});
