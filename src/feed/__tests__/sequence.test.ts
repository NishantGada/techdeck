import { buildDeck } from '../order';
import { answerQuiz, markSeen } from '../progress';
import { buildFeed, contentCountBefore, indexOfCard, nextScreen } from '../sequence';
import { emptyProgress, initialCursor, type FeedCursor, type Progress } from '../types';
import { describeRun, makeCards, makeQuiz, makeTopic, simulate } from './fixtures';

const plainDeck = buildDeck([makeTopic('t', makeCards('c', 10))], 'interview');

describe('base sequencing', () => {
  it('emits the base cards in order and then a single end screen', () => {
    const run = describeRun(simulate(plainDeck));
    expect(run).toEqual(['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'END']);
  });

  it('is deterministic: identical inputs give an identical run', () => {
    expect(describeRun(simulate(plainDeck))).toEqual(describeRun(simulate(plainDeck)));
  });

  it('never emits anything after the end screen', () => {
    const nodes = buildFeed(plainDeck, emptyProgress(), { length: 50 });
    expect(nodes[nodes.length - 1].screen.kind).toBe('end');
    expect(nodes.filter((n) => n.screen.kind === 'end')).toHaveLength(1);
  });

  it('marks non-review cards as plain content cards', () => {
    const nodes = buildFeed(plainDeck, emptyProgress(), { length: 3 });
    expect(nodes.every((n) => n.screen.kind === 'card' && !n.screen.review)).toBe(true);
  });

  it('gives every screen a unique key', () => {
    const nodes = buildFeed(plainDeck, emptyProgress(), { length: 20 });
    const keys = nodes.map((n) => n.screen.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('quiz cadence', () => {
  const deck = buildDeck(
    [makeTopic('t', makeCards('c', 12), { quiz: [makeQuiz('Q1', ['c1'], ['c1'])] })],
    'interview'
  );

  it('injects an eligible quiz after 4 content cards', () => {
    const run = describeRun(simulate(deck));
    expect(run.slice(0, 6)).toEqual(['c1', 'c2', 'c3', 'c4', 'Q:Q1', 'c5']);
  });

  it('does not inject before 4 content cards even when eligible', () => {
    const run = describeRun(simulate(deck));
    expect(run.slice(0, 4)).not.toContain('Q:Q1');
  });

  it('skips the slot when nothing is eligible and keeps going', () => {
    // Q needs c9, which has not been seen by the 4-card mark.
    const late = buildDeck(
      [makeTopic('t', makeCards('c', 12), { quiz: [makeQuiz('Q1', ['c9'])] })],
      'interview'
    );
    const run = describeRun(simulate(late));
    expect(run.slice(0, 9)).toEqual(['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9']);
    expect(run[9]).toBe('Q:Q1');
  });

  it('never shows two quiz screens in a row', () => {
    const many = buildDeck(
      [
        makeTopic('t', makeCards('c', 12), {
          quiz: [makeQuiz('Q1', ['c1']), makeQuiz('Q2', ['c1']), makeQuiz('Q3', ['c1'])],
        }),
      ],
      'interview'
    );
    const run = describeRun(simulate(many));
    for (let i = 1; i < run.length; i++) {
      expect(run[i].startsWith('Q:') && run[i - 1].startsWith('Q:')).toBe(false);
    }
  });

  it('leaves at least 4 content cards between consecutive quizzes', () => {
    const many = buildDeck(
      [
        makeTopic('t', makeCards('c', 20), {
          quiz: [makeQuiz('Q1', ['c1']), makeQuiz('Q2', ['c1']), makeQuiz('Q3', ['c1'])],
        }),
      ],
      'interview'
    );
    const { steps } = simulate(many);
    const quizAt = steps
      .map((s, i) => (s.screen.kind === 'quiz' ? s.contentCountBefore : null))
      .filter((v): v is number => v !== null);
    for (let i = 1; i < quizAt.length; i++) {
      expect(quizAt[i] - quizAt[i - 1]).toBeGreaterThanOrEqual(4);
    }
  });

  it('retires a question answered correctly', () => {
    const run = describeRun(simulate(deck));
    expect(run.filter((s) => s === 'Q:Q1')).toHaveLength(1);
  });
});

describe('wrong answers and review scheduling', () => {
  const deck = buildDeck(
    [makeTopic('t', makeCards('c', 20), { quiz: [makeQuiz('Q1', ['c1'], ['c1'])] })],
    'interview'
  );

  it('re-surfaces the review cards exactly 6 content cards later', () => {
    const run = describeRun(simulate(deck, { answers: { Q1: ['b', 'a'] } }));
    expect(run.slice(0, 12)).toEqual([
      'c1',
      'c2',
      'c3',
      'c4',
      'Q:Q1', // wrong, at contentCount 4
      'c5',
      'c6',
      'c7',
      'c8',
      'c9',
      'c10', // 6 content cards later
      'R:c1',
    ]);
  });

  it('marks the re-surfaced card as a review and attributes it to the question', () => {
    const { steps } = simulate(deck, { answers: { Q1: ['b', 'a'] } });
    const review = steps[11].screen;
    expect(review).toMatchObject({ kind: 'card', cardId: 'c1', review: true, reviewForQuizId: 'Q1' });
  });

  it('does not count the review card towards the quiz cadence', () => {
    const { steps } = simulate(deck, { answers: { Q1: ['b', 'a'] } });
    // The review at index 11 leaves contentCount where it was after c10.
    expect(steps[11].contentCountBefore).toBe(10);
    expect(steps[12].contentCountBefore).toBe(10);
  });

  it('does not add a re-surfaced card to the seen set a second time', () => {
    const { progress } = simulate(deck, { answers: { Q1: ['b', 'a'] } });
    expect(progress.seenOrder.filter((id) => id === 'c1')).toHaveLength(1);
  });

  it('makes the question eligible again once the review cards are re-seen', () => {
    const run = describeRun(simulate(deck, { answers: { Q1: ['b', 'a'] } }));
    expect(run[12]).toBe('Q:Q1');
  });

  it('retires the question when the second attempt is correct', () => {
    const run = describeRun(simulate(deck, { answers: { Q1: ['b', 'a'] } }));
    expect(run.filter((s) => s === 'Q:Q1')).toHaveLength(2);
    expect(run.filter((s) => s === 'R:c1')).toHaveLength(1);
  });

  it('offers a skipped review card again rather than stranding the question', () => {
    // Never mark the review as re-seen: awaitingReview stays populated.
    const progress: Progress = {
      seenOrder: ['c1', 'c2', 'c3', 'c4'],
      quiz: { Q1: { status: 'wrong', wrongAtContentCount: 4, awaitingReview: ['c1'] } },
    };
    const cursor: FeedCursor = {
      ...initialCursor(),
      baseIndex: 4,
      contentCount: 10,
      contentSinceQuiz: 6,
      emittedReviews: [{ key: 'Q1|c1', atContentCount: 10 }],
    };
    // Right after being offered, it is not offered again...
    expect(nextScreen(deck, progress, cursor).screen).toMatchObject({ cardId: 'c5' });
    // ...but it comes back around after another 6 content cards.
    const later = { ...cursor, baseIndex: 10, contentCount: 16, contentSinceQuiz: 12 };
    expect(nextScreen(deck, progress, later).screen).toMatchObject({
      cardId: 'c1',
      review: true,
    });
  });

  it('flushes an outstanding review at the end of the feed instead of dropping it', () => {
    const short = buildDeck(
      [makeTopic('t', makeCards('c', 5), { quiz: [makeQuiz('Q1', ['c1'], ['c1'])] })],
      'interview'
    );
    const run = describeRun(simulate(short, { answers: { Q1: ['b', 'a'] } }));
    // Base runs out before the 6-card delay elapses, so the review is flushed at the end.
    expect(run).toContain('R:c1');
    expect(run[run.length - 1]).toBe('END');
  });

  it('terminates at the end of the feed even with an unresolvable review', () => {
    const short = buildDeck(
      [makeTopic('t', makeCards('c', 5), { quiz: [makeQuiz('Q1', ['c1'], ['c1'])] })],
      'interview'
    );
    // Answer wrong every time, and never re-see the review.
    const { steps } = simulate(short, { answers: { Q1: 'b' }, maxScreens: 100 });
    expect(steps[steps.length - 1].screen.kind).toBe('end');
  });

  it('ignores a review card the current audience mode hides', () => {
    const topics = [
      makeTopic('t', makeCards('c', 12), { quiz: [makeQuiz('Q1', ['c1'], ['hidden'])] }),
    ];
    const jobDeck = buildDeck(topics, 'job');
    const run = describeRun(simulate(jobDeck, { answers: { Q1: 'b' } }));
    expect(run.some((s) => s.startsWith('R:'))).toBe(false);
    expect(run[run.length - 1]).toBe('END');
  });
});

describe('nextScreen as a direct query', () => {
  // "Given seen set S and answered set A, what is the next screen?"
  const deck = buildDeck(
    [
      makeTopic('t', makeCards('c', 10), {
        quiz: [makeQuiz('Q1', ['c1', 'c2'], ['c1']), makeQuiz('Q2', ['c4'], ['c4'])],
      }),
    ],
    'interview'
  );

  const atFourCards: FeedCursor = {
    ...initialCursor(),
    baseIndex: 4,
    contentCount: 4,
    contentSinceQuiz: 4,
    screenIndex: 4,
  };

  it('offers the oldest-ready quiz at the cadence boundary', () => {
    const progress: Progress = { seenOrder: ['c1', 'c2', 'c3', 'c4'], quiz: {} };
    expect(nextScreen(deck, progress, atFourCards).screen).toMatchObject({
      kind: 'quiz',
      quizId: 'Q1',
    });
  });

  it('falls through to the next content card when both are already answered', () => {
    const progress: Progress = {
      seenOrder: ['c1', 'c2', 'c3', 'c4'],
      quiz: { Q1: { status: 'correct' }, Q2: { status: 'correct' } },
    };
    expect(nextScreen(deck, progress, atFourCards).screen).toMatchObject({
      kind: 'card',
      cardId: 'c5',
      review: false,
    });
  });

  it('offers the remaining question when only one is answered', () => {
    const progress: Progress = {
      seenOrder: ['c1', 'c2', 'c3', 'c4'],
      quiz: { Q1: { status: 'correct' } },
    };
    expect(nextScreen(deck, progress, atFourCards).screen).toMatchObject({ quizId: 'Q2' });
  });

  it('does not offer a quiz immediately after a quiz', () => {
    const progress: Progress = { seenOrder: ['c1', 'c2', 'c3', 'c4'], quiz: {} };
    const after = { ...atFourCards, lastWasQuiz: true, contentSinceQuiz: 0 };
    expect(nextScreen(deck, progress, after).screen).toMatchObject({ kind: 'card', cardId: 'c5' });
  });

  it('returns the end screen when the base sequence is spent', () => {
    const progress: Progress = { seenOrder: [], quiz: {} };
    const spent = { ...initialCursor(), baseIndex: 10, contentCount: 10, contentSinceQuiz: 0 };
    expect(nextScreen(deck, progress, spent).screen.kind).toBe('end');
  });

  it('does not mutate the cursor or progress it is given', () => {
    const progress: Progress = { seenOrder: ['c1', 'c2', 'c3', 'c4'], quiz: {} };
    const frozenCursor = { ...atFourCards };
    nextScreen(deck, progress, atFourCards);
    expect(atFourCards).toEqual(frozenCursor);
    expect(progress.seenOrder).toEqual(['c1', 'c2', 'c3', 'c4']);
  });
});

describe('buildFeed', () => {
  it('produces exactly the requested number of screens', () => {
    expect(buildFeed(plainDeck, emptyProgress(), { length: 5 })).toHaveLength(5);
  });

  it('resumes from a prefix without regenerating it', () => {
    const first = buildFeed(plainDeck, emptyProgress(), { length: 3 });
    const extended = buildFeed(plainDeck, emptyProgress(), { length: 6, prefix: first });
    expect(extended.slice(0, 3)).toEqual(first);
    expect(extended).toHaveLength(6);
  });

  it('keeps the prefix fixed when progress changes underneath it', () => {
    const deck = buildDeck(
      [makeTopic('t', makeCards('c', 10), { quiz: [makeQuiz('Q1', ['c1'])] })],
      'interview'
    );
    const prefix = buildFeed(deck, emptyProgress(), { length: 4 });
    let progress = emptyProgress();
    for (const id of ['c1', 'c2', 'c3', 'c4']) progress = markSeen(progress, id);

    const extended = buildFeed(deck, progress, { length: 6, prefix });
    expect(extended.slice(0, 4)).toEqual(prefix);
    // The quiz only became eligible after the prefix was built, and still lands next.
    expect(extended[4].screen).toMatchObject({ kind: 'quiz', quizId: 'Q1' });
  });

  it('stops early at the end screen', () => {
    expect(buildFeed(plainDeck, emptyProgress(), { length: 100 })).toHaveLength(11);
  });

  it('returns the prefix untouched once it already ends the feed', () => {
    const done = buildFeed(plainDeck, emptyProgress(), { length: 100 });
    expect(buildFeed(plainDeck, emptyProgress(), { length: 200, prefix: done })).toEqual(done);
  });
});

describe('helpers', () => {
  it('finds the first screen showing a card', () => {
    const nodes = buildFeed(plainDeck, emptyProgress(), { length: 11 });
    expect(indexOfCard(nodes, 'c4')).toBe(3);
    expect(indexOfCard(nodes, 'nope')).toBe(-1);
  });

  it('reports the content count in force when a screen was shown', () => {
    const nodes = buildFeed(plainDeck, emptyProgress(), { length: 11 });
    expect(contentCountBefore(nodes, 0)).toBe(0);
    expect(contentCountBefore(nodes, 4)).toBe(4);
  });
});

describe('answerQuiz', () => {
  const question = makeQuiz('Q1', ['c1'], ['c1']);

  it('retires the question on a correct answer', () => {
    const { progress, correct } = answerQuiz(emptyProgress(), question, 'a', 4);
    expect(correct).toBe(true);
    expect(progress.quiz.Q1).toEqual({ status: 'correct' });
  });

  it('stamps a wrong answer with the content count so reviews can be scheduled', () => {
    const { progress, correct } = answerQuiz(emptyProgress(), question, 'b', 4);
    expect(correct).toBe(false);
    expect(progress.quiz.Q1).toEqual({
      status: 'wrong',
      wrongAtContentCount: 4,
      awaitingReview: ['c1'],
    });
  });
});
