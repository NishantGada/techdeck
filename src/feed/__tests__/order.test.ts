import { buildDeck, isVisible, topicProgress, topologicalSortTopics } from '../order';
import { makeCard, makeCards, makeQuiz, makeTopic } from './fixtures';

describe('topologicalSortTopics', () => {
  it('puts prerequisites first', () => {
    const topics = [
      makeTopic('c', makeCards('c', 1), { prerequisites: ['b'] }),
      makeTopic('a', makeCards('a', 1)),
      makeTopic('b', makeCards('b', 1), { prerequisites: ['a'] }),
    ];
    expect(topologicalSortTopics(topics).map((t) => t.topic.id)).toEqual(['a', 'b', 'c']);
  });

  it('breaks ties by input order, so the result is deterministic', () => {
    const topics = [
      makeTopic('z', makeCards('z', 1)),
      makeTopic('y', makeCards('y', 1)),
      makeTopic('x', makeCards('x', 1)),
    ];
    expect(topologicalSortTopics(topics).map((t) => t.topic.id)).toEqual(['z', 'y', 'x']);
  });

  it('handles a diamond', () => {
    const topics = [
      makeTopic('base', makeCards('b', 1)),
      makeTopic('left', makeCards('l', 1), { prerequisites: ['base'] }),
      makeTopic('right', makeCards('r', 1), { prerequisites: ['base'] }),
      makeTopic('top', makeCards('t', 1), { prerequisites: ['left', 'right'] }),
    ];
    expect(topologicalSortTopics(topics).map((t) => t.topic.id)).toEqual([
      'base',
      'left',
      'right',
      'top',
    ]);
  });

  it('throws on a cycle, naming the topics involved', () => {
    const topics = [
      makeTopic('a', makeCards('a', 1), { prerequisites: ['b'] }),
      makeTopic('b', makeCards('b', 1), { prerequisites: ['a'] }),
    ];
    expect(() => topologicalSortTopics(topics)).toThrow(/Cycle in topic prerequisites.*a.*b/);
  });

  it('ignores prerequisites that do not resolve rather than deadlocking', () => {
    const topics = [makeTopic('a', makeCards('a', 1), { prerequisites: ['missing'] })];
    expect(topologicalSortTopics(topics).map((t) => t.topic.id)).toEqual(['a']);
  });
});

describe('buildDeck', () => {
  it('emits every card of a topic before the next topic (deep-first)', () => {
    const topics = [
      makeTopic('second', makeCards('s', 3), { prerequisites: ['first'] }),
      makeTopic('first', makeCards('f', 2)),
    ];
    const deck = buildDeck(topics, 'interview');
    expect(deck.base.map((r) => r.card.id)).toEqual(['f1', 'f2', 's1', 's2', 's3']);
  });

  it('orders cards within a topic by ordinal, not by array position', () => {
    const topics = [
      makeTopic('t', [makeCard('x3', 3), makeCard('x1', 1), makeCard('x2', 2)]),
    ];
    const deck = buildDeck(topics, 'interview');
    expect(deck.base.map((r) => r.card.id)).toEqual(['x1', 'x2', 'x3']);
  });

  it('shows shared + interview cards in interview mode', () => {
    const topics = [
      makeTopic('t', [
        makeCard('a', 1, 'shared'),
        makeCard('b', 2, 'interview'),
        makeCard('c', 3, 'job'),
      ]),
    ];
    const deck = buildDeck(topics, 'interview');
    expect(deck.base.map((r) => r.card.id)).toEqual(['a', 'b']);
  });

  it('shows shared + job cards in job mode', () => {
    const topics = [
      makeTopic('t', [
        makeCard('a', 1, 'shared'),
        makeCard('b', 2, 'interview'),
        makeCard('c', 3, 'job'),
      ]),
    ];
    const deck = buildDeck(topics, 'job');
    expect(deck.base.map((r) => r.card.id)).toEqual(['a', 'c']);
  });

  it('numbers cards against the visible count, not the raw ordinal', () => {
    const topics = [
      makeTopic('t', [
        makeCard('a', 1, 'shared'),
        makeCard('b', 2, 'interview'),
        makeCard('c', 3, 'shared'),
      ]),
    ];
    const deck = buildDeck(topics, 'job');
    expect(deck.base.map((r) => [r.card.id, r.ordinalInTopic, r.totalInTopic])).toEqual([
      ['a', 1, 2],
      ['c', 2, 2],
    ]);
  });

  it('records every card id, including ones the audience mode hides', () => {
    const topics = [
      makeTopic('t', [makeCard('a', 1, 'shared'), makeCard('b', 2, 'interview')]),
    ];
    const deck = buildDeck(topics, 'job');
    expect(deck.topics[0].cardIds).toEqual(['a']);
    expect(deck.topics[0].allCardIds).toEqual(['a', 'b']);
  });

  it('records each topic’s quiz ids, so a topic can be reset on its own', () => {
    const topics = [
      makeTopic('a', makeCards('a', 2), { quiz: [makeQuiz('QA1', ['a1']), makeQuiz('QA2', ['a2'])] }),
      makeTopic('b', makeCards('b', 1), { quiz: [makeQuiz('QB1', ['b1'])] }),
    ];
    const deck = buildDeck(topics, 'interview');
    expect(deck.topics.map((t) => t.quizIds)).toEqual([['QA1', 'QA2'], ['QB1']]);
  });

  it('records where each topic starts in the base sequence', () => {
    const topics = [makeTopic('a', makeCards('a', 2)), makeTopic('b', makeCards('b', 3))];
    const deck = buildDeck(topics, 'interview');
    expect(deck.topics.map((t) => [t.id, t.startIndex])).toEqual([
      ['a', 0],
      ['b', 2],
    ]);
  });

  it('excludes filtered-out cards from cardsById, so they can never be resolved', () => {
    const topics = [makeTopic('t', [makeCard('a', 1, 'shared'), makeCard('b', 2, 'job')])];
    const deck = buildDeck(topics, 'interview');
    expect(deck.cardsById['b']).toBeUndefined();
  });
});

describe('isVisible', () => {
  it('always admits shared cards', () => {
    expect(isVisible(makeCard('a', 1, 'shared'), 'interview')).toBe(true);
    expect(isVisible(makeCard('a', 1, 'shared'), 'job')).toBe(true);
  });

  it('admits an audience card only in its own mode', () => {
    expect(isVisible(makeCard('a', 1, 'job'), 'interview')).toBe(false);
    expect(isVisible(makeCard('a', 1, 'job'), 'job')).toBe(true);
  });
});

describe('topicProgress', () => {
  it('counts seen cards against the visible total per topic', () => {
    const topics = [makeTopic('a', makeCards('a', 3)), makeTopic('b', makeCards('b', 2))];
    const deck = buildDeck(topics, 'interview');
    expect(topicProgress(deck, ['a1', 'a2', 'b1'])).toEqual([
      { topicId: 'a', seen: 2, total: 3 },
      { topicId: 'b', seen: 1, total: 2 },
    ]);
  });

  it('ignores seen ids that are filtered out of this deck', () => {
    const topics = [makeTopic('a', [makeCard('a1', 1, 'shared'), makeCard('a2', 2, 'job')])];
    const deck = buildDeck(topics, 'interview');
    expect(topicProgress(deck, ['a1', 'a2'])).toEqual([{ topicId: 'a', seen: 1, total: 1 }]);
  });
});
