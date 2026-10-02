import capJson from '../../../content/cap.json';
import {
  MAX_BODY_WORDS,
  MIN_BODY_WORDS,
  countWords,
  reportIssues,
  validateTopicFiles,
} from '../validate';
import type { TopicFile } from '../types';

const cap = capJson as unknown as TopicFile;

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

describe('countWords', () => {
  it('counts whitespace-delimited tokens', () => {
    expect(countWords('one two three')).toBe(3);
  });

  it('ignores surrounding and repeated whitespace', () => {
    expect(countWords('  one   two \n three  ')).toBe(3);
  });

  it('counts an empty body as zero', () => {
    expect(countWords('   ')).toBe(0);
  });
});

describe('the bundled content', () => {
  const result = validateTopicFiles([{ name: 'cap.json', data: capJson }]);

  it('loads without fatal issues', () => {
    expect(result.issues.filter((i) => i.level === 'fatal')).toEqual([]);
  });

  it('loads without warnings', () => {
    expect(result.issues.filter((i) => i.level === 'warning')).toEqual([]);
  });

  it('keeps every card body inside the word budget', () => {
    for (const card of cap.cards) {
      const words = countWords(card.body);
      expect(words).toBeGreaterThanOrEqual(MIN_BODY_WORDS);
      expect(words).toBeLessThanOrEqual(MAX_BODY_WORDS);
    }
  });

  it('gives every diagram a viewBox so the aspect ratio can be derived', () => {
    for (const card of cap.cards) {
      if (card.diagram) expect(card.diagram.svg).toMatch(/viewBox="[^"]+"/);
    }
  });
});

describe('validateTopicFiles', () => {
  it('reports a duplicate card id as fatal', () => {
    const bad = clone(cap);
    bad.cards[1].id = bad.cards[0].id;
    const { issues } = validateTopicFiles([{ name: 'cap.json', data: bad }]);
    expect(issues).toContainEqual(
      expect.objectContaining({ level: 'fatal', code: 'duplicate-id' })
    );
  });

  it('reports a card id duplicated across two files', () => {
    const other = clone(cap);
    other.topic.id = 'other';
    const { issues } = validateTopicFiles([
      { name: 'cap.json', data: cap },
      { name: 'other.json', data: other },
    ]);
    expect(issues.filter((i) => i.code === 'duplicate-id').length).toBeGreaterThan(0);
  });

  it('reports an unknown quiz prerequisite as fatal', () => {
    const bad = clone(cap);
    bad.quiz[0].prerequisites = ['CAP-99'];
    const { issues } = validateTopicFiles([{ name: 'cap.json', data: bad }]);
    expect(issues).toContainEqual(
      expect.objectContaining({ level: 'fatal', code: 'unknown-prerequisite' })
    );
  });

  it('reports an unknown reviewCard as fatal', () => {
    const bad = clone(cap);
    bad.quiz[0].reviewCards = ['CAP-99'];
    const { issues } = validateTopicFiles([{ name: 'cap.json', data: bad }]);
    expect(issues).toContainEqual(
      expect.objectContaining({ level: 'fatal', code: 'unknown-prerequisite' })
    );
  });

  it('reports an unknown topic prerequisite as fatal', () => {
    const bad = clone(cap);
    bad.topic.prerequisites = ['nope'];
    const { issues } = validateTopicFiles([{ name: 'cap.json', data: bad }]);
    expect(issues).toContainEqual(
      expect.objectContaining({ level: 'fatal', code: 'unknown-prerequisite' })
    );
  });

  it('reports a correctOptionId that matches no option', () => {
    const bad = clone(cap);
    bad.quiz[0].correctOptionId = 'z';
    const { issues } = validateTopicFiles([{ name: 'cap.json', data: bad }]);
    expect(issues).toContainEqual(
      expect.objectContaining({ level: 'fatal', code: 'bad-correct-option' })
    );
  });

  it('reports a short body as a warning, not a fatal', () => {
    const bad = clone(cap);
    bad.cards[0].body = 'too short';
    const { issues } = validateTopicFiles([{ name: 'cap.json', data: bad }]);
    expect(issues).toContainEqual(
      expect.objectContaining({ level: 'warning', code: 'body-word-count' })
    );
    expect(issues.filter((i) => i.level === 'fatal')).toEqual([]);
  });

  it('reports a long body as a warning', () => {
    const bad = clone(cap);
    bad.cards[0].body = Array.from({ length: 120 }, (_, i) => `w${i}`).join(' ');
    const { issues } = validateTopicFiles([{ name: 'cap.json', data: bad }]);
    expect(issues).toContainEqual(
      expect.objectContaining({ level: 'warning', code: 'body-word-count' })
    );
  });

  it('rejects a wrong schemaVersion and drops the file', () => {
    const bad = clone(cap) as unknown as { schemaVersion: number };
    bad.schemaVersion = 2;
    const { topics, issues } = validateTopicFiles([{ name: 'cap.json', data: bad }]);
    expect(topics).toEqual([]);
    expect(issues).toContainEqual(
      expect.objectContaining({ level: 'fatal', code: 'schema-version' })
    );
  });

  it('rejects a card with an unknown audience', () => {
    const bad = clone(cap) as unknown as { cards: { audience: string }[] };
    bad.cards[0].audience = 'everyone';
    const { issues } = validateTopicFiles([{ name: 'cap.json', data: bad }]);
    expect(issues).toContainEqual(expect.objectContaining({ level: 'fatal', code: 'shape' }));
  });

  it('warns when ordinals are not 1..n', () => {
    const bad = clone(cap);
    bad.cards[0].ordinal = 42;
    const { issues } = validateTopicFiles([{ name: 'cap.json', data: bad }]);
    expect(issues).toContainEqual(expect.objectContaining({ level: 'warning', code: 'ordinals' }));
  });

  it('warns about a malformed lastVerified date', () => {
    const bad = clone(cap);
    const card = bad.cards.find((c) => c.volatility)!;
    card.volatility!.lastVerified = 'September 2026';
    const { issues } = validateTopicFiles([{ name: 'cap.json', data: bad }]);
    expect(issues).toContainEqual(
      expect.objectContaining({ level: 'warning', code: 'volatility-date' })
    );
  });
});

describe('reportIssues', () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});

  afterEach(() => {
    warn.mockClear();
    error.mockClear();
  });

  afterAll(() => {
    warn.mockRestore();
    error.mockRestore();
  });

  it('throws in dev on a fatal issue', () => {
    expect(() =>
      reportIssues([{ level: 'fatal', code: 'duplicate-id', where: 'x', message: 'boom' }], true)
    ).toThrow(/Content validation failed/);
  });

  it('logs but does not throw in production', () => {
    expect(() =>
      reportIssues([{ level: 'fatal', code: 'duplicate-id', where: 'x', message: 'boom' }], false)
    ).not.toThrow();
    expect(error).toHaveBeenCalled();
  });

  it('never throws on a word-count warning, even in dev', () => {
    expect(() =>
      reportIssues(
        [{ level: 'warning', code: 'body-word-count', where: 'x', message: '12 words' }],
        true
      )
    ).not.toThrow();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('body-word-count'));
  });
});
