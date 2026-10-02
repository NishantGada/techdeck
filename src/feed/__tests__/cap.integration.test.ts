import capJson from '../../../content/cap.json';
import type { TopicFile } from '../../content/types';
import { validateTopicFiles } from '../../content/validate';
import { buildDeck } from '../order';
import { resetTopic } from '../progress';
import { describeRun, simulate } from './fixtures';

const { topics } = validateTopicFiles([{ name: 'cap.json', data: capJson }]);
const cap = topics[0] as TopicFile;

describe('the CAP topic in interview mode', () => {
  const deck = buildDeck([cap], 'interview');

  it('shows all nine cards', () => {
    expect(deck.base.map((r) => r.card.id)).toEqual([
      'CAP-01',
      'CAP-02',
      'CAP-03',
      'CAP-04',
      'CAP-05',
      'CAP-06',
      'CAP-07',
      'CAP-08',
      'CAP-09',
    ]);
  });

  it('numbers them 1..9', () => {
    expect(deck.base.map((r) => `${r.ordinalInTopic} / ${r.totalInTopic}`)[2]).toBe('3 / 9');
  });

  it('runs a full pass with two quizzes injected on the 4-card cadence', () => {
    expect(describeRun(simulate(deck))).toEqual([
      'CAP-01',
      'CAP-02',
      'CAP-03',
      'CAP-04',
      'Q:Q-CAP-01',
      'CAP-05',
      'CAP-06',
      'CAP-07',
      'CAP-08',
      'Q:Q-CAP-02',
      'CAP-09',
      'END',
    ]);
  });

  it('leaves Q-CAP-03 for a second pass, because the feed ends before its next slot', () => {
    // Q-CAP-03 needs CAP-08, which is content card 8 — the same slot Q-CAP-02 has been
    // waiting longer for. Only one card remains after that, so no further slot opens.
    const run = describeRun(simulate(deck));
    expect(run).not.toContain('Q:Q-CAP-03');
  });

  it('offers the leftover question immediately on a restart, since everything is seen', () => {
    const { progress } = simulate(deck);
    // Restarting replays the base sequence with progress intact.
    const restarted = simulate(deck);
    expect(restarted.progress.quiz['Q-CAP-01']).toEqual({ status: 'correct' });
    expect(progress.quiz['Q-CAP-03']).toBeUndefined();
  });

  it('re-surfaces CAP-03 six content cards after getting Q-CAP-01 wrong', () => {
    const run = describeRun(simulate(deck, { answers: { 'Q-CAP-01': ['a', 'b'] } }));
    expect(run.slice(0, 5)).toEqual(['CAP-01', 'CAP-02', 'CAP-03', 'CAP-04', 'Q:Q-CAP-01']);
    expect(run).toContain('R:CAP-03');
    expect(run[run.length - 1]).toBe('END');
  });

  it('ends every run with exactly one end screen', () => {
    const cases: Record<string, string>[] = [
      {},
      { 'Q-CAP-01': 'a' },
      { 'Q-CAP-02': 'a', 'Q-CAP-01': 'c' },
    ];
    for (const answers of cases) {
      const run = describeRun(simulate(deck, { answers }));
      expect(run.filter((s) => s === 'END')).toHaveLength(1);
      expect(run[run.length - 1]).toBe('END');
    }
  });
});

describe('the CAP topic in on-the-job mode', () => {
  const deck = buildDeck([cap], 'job');

  it('drops the interview-only card and renumbers', () => {
    expect(deck.base.map((r) => r.card.id)).not.toContain('CAP-09');
    expect(deck.base).toHaveLength(8);
    expect(deck.base[7].ordinalInTopic).toBe(8);
    expect(deck.base[7].totalInTopic).toBe(8);
  });

  it('still completes a full pass', () => {
    const run = describeRun(simulate(deck));
    expect(run[run.length - 1]).toBe('END');
    expect(run).not.toContain('CAP-09');
  });
});

describe('resetting the CAP topic on its own', () => {
  const deck = buildDeck([cap], 'interview');

  it('puts every card back to unread and every question back to unanswered', () => {
    const { progress } = simulate(deck);
    expect(progress.seenOrder).toHaveLength(9);
    expect(progress.quiz['Q-CAP-01']).toEqual({ status: 'correct' });

    const after = resetTopic(
      progress,
      cap.cards.map((c) => c.id),
      cap.quiz.map((q) => q.id)
    );
    expect(after.seenOrder).toEqual([]);
    expect(after.quiz).toEqual({});
  });

  it('lets the whole topic be read again from the top', () => {
    const { progress } = simulate(deck);
    const after = resetTopic(
      progress,
      cap.cards.map((c) => c.id),
      cap.quiz.map((q) => q.id)
    );
    // A fresh run against the reset progress is identical to a first-ever run.
    expect(describeRun(simulate(deck))).toEqual([
      'CAP-01',
      'CAP-02',
      'CAP-03',
      'CAP-04',
      'Q:Q-CAP-01',
      'CAP-05',
      'CAP-06',
      'CAP-07',
      'CAP-08',
      'Q:Q-CAP-02',
      'CAP-09',
      'END',
    ]);
    expect(after.seenOrder).toEqual([]);
  });

  it('clears hidden cards when driven off the deck, which is what the app does', () => {
    // The app resets from deck.topics, so that path must cover hidden cards too.
    const jobDeck = buildDeck([cap], 'job');
    const topic = jobDeck.topics[0];
    const progress = { seenOrder: ['CAP-01', 'CAP-09'], quiz: {} };

    const after = resetTopic(progress, topic.allCardIds, topic.quizIds);
    expect(after.seenOrder).toEqual([]);
  });

  it('clears cards hidden by the current audience mode too', () => {
    // CAP-09 is interview-only. Reading it in interview mode then resetting from job
    // mode must still forget it, which is why reset works off the topic file rather
    // than the audience-filtered deck.
    const { progress } = simulate(deck);
    expect(progress.seenOrder).toContain('CAP-09');

    const after = resetTopic(
      progress,
      cap.cards.map((c) => c.id),
      cap.quiz.map((q) => q.id)
    );
    expect(after.seenOrder).not.toContain('CAP-09');
  });
});
