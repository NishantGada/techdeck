import {
  bookmarkCountForTopic,
  bookmarksForTopic,
  isBookmarked,
  removeBookmark,
  toggleBookmark,
} from '../bookmarks';
import { buildDeck } from '../order';
import { makeCard, makeCards, makeTopic } from './fixtures';

describe('toggleBookmark', () => {
  it('adds an id that is not saved', () => {
    expect(toggleBookmark([], 'c1')).toEqual(['c1']);
  });

  it('removes an id that is saved', () => {
    expect(toggleBookmark(['c1', 'c2'], 'c1')).toEqual(['c2']);
  });

  it('appends new ids in the order they were saved', () => {
    expect(toggleBookmark(toggleBookmark([], 'c3'), 'c1')).toEqual(['c3', 'c1']);
  });

  it('does not mutate the input', () => {
    const before = ['c1'];
    toggleBookmark(before, 'c2');
    expect(before).toEqual(['c1']);
  });
});

describe('removeBookmark', () => {
  it('drops the id', () => {
    expect(removeBookmark(['c1', 'c2'], 'c1')).toEqual(['c2']);
  });

  it('is a no-op for an id that was never saved', () => {
    expect(removeBookmark(['c1'], 'c9')).toEqual(['c1']);
  });
});

describe('isBookmarked', () => {
  it('reflects membership', () => {
    expect(isBookmarked(['c1'], 'c1')).toBe(true);
    expect(isBookmarked(['c1'], 'c2')).toBe(false);
  });
});

describe('bookmarksForTopic', () => {
  const topics = [
    makeTopic('a', [
      makeCard('a1', 1, 'shared'),
      makeCard('a2', 2, 'interview'),
      makeCard('a3', 3, 'shared'),
    ]),
    makeTopic('b', makeCards('b', 2)),
  ];

  it('returns only the bookmarks belonging to that topic', () => {
    const deck = buildDeck(topics, 'interview');
    const result = bookmarksForTopic(['a1', 'b1'], deck.topics[0], deck);
    expect(result.cards.map((c) => c.card.id)).toEqual(['a1']);
  });

  it('orders them by position in the topic, not by when they were saved', () => {
    const deck = buildDeck(topics, 'interview');
    const result = bookmarksForTopic(['a3', 'a1'], deck.topics[0], deck);
    expect(result.cards.map((c) => c.card.id)).toEqual(['a1', 'a3']);
  });

  it('counts, rather than lists, bookmarks the audience mode hides', () => {
    const deck = buildDeck(topics, 'job'); // a2 is interview-only
    const result = bookmarksForTopic(['a1', 'a2'], deck.topics[0], deck);
    expect(result.cards.map((c) => c.card.id)).toEqual(['a1']);
    expect(result.hiddenCount).toBe(1);
  });

  it('reports no hidden bookmarks when everything is visible', () => {
    const deck = buildDeck(topics, 'interview');
    expect(bookmarksForTopic(['a1', 'a2'], deck.topics[0], deck).hiddenCount).toBe(0);
  });

  it('returns an empty result for a topic with no bookmarks', () => {
    const deck = buildDeck(topics, 'interview');
    expect(bookmarksForTopic(['b1'], deck.topics[0], deck)).toEqual({ cards: [], hiddenCount: 0 });
  });

  it('carries the card ref, so titles and ordinals are available to render', () => {
    const deck = buildDeck(topics, 'interview');
    const [first] = bookmarksForTopic(['a3'], deck.topics[0], deck).cards;
    expect(first.card.title).toBe('Card a3');
    expect(first.ordinalInTopic).toBe(3);
    expect(first.totalInTopic).toBe(3);
  });
});

describe('bookmarkCountForTopic', () => {
  const topics = [
    makeTopic('a', [makeCard('a1', 1, 'shared'), makeCard('a2', 2, 'interview')]),
    makeTopic('b', makeCards('b', 2)),
  ];

  it('counts hidden bookmarks too, so the number does not change with audience mode', () => {
    const interview = buildDeck(topics, 'interview');
    const job = buildDeck(topics, 'job');
    expect(bookmarkCountForTopic(['a1', 'a2'], interview.topics[0])).toBe(2);
    expect(bookmarkCountForTopic(['a1', 'a2'], job.topics[0])).toBe(2);
  });

  it('ignores bookmarks from other topics', () => {
    const deck = buildDeck(topics, 'interview');
    expect(bookmarkCountForTopic(['a1', 'b1', 'b2'], deck.topics[0])).toBe(1);
  });
});
