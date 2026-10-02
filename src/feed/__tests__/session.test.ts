import authJson from '../../../content/auth.json';
import capJson from '../../../content/cap.json';
import type { TopicFile } from '../../content/types';
import { validateTopicFiles } from '../../content/validate';
import { buildDeck } from '../order';
import {
  anchorForTopic,
  emptySession,
  forgetTopic,
  openTopic,
  rememberCard,
  resumeCardFor,
  resumeOptionFor,
  type SessionPosition,
} from '../session';

const { topics } = validateTopicFiles([
  { name: 'auth.json', data: authJson },
  { name: 'cap.json', data: capJson },
]);
const library = buildDeck(topics as TopicFile[], 'interview');
const authTopic = library.topics.find((t) => t.id === 'auth')!;
const capTopic = library.topics.find((t) => t.id === 'cap')!;

describe('rememberCard', () => {
  it('records a topic’s place and makes it the active topic', () => {
    const p = rememberCard(emptySession, 'auth', 'AUTH-12');
    expect(p).toEqual({ activeTopicId: 'auth', lastCardByTopic: { auth: 'AUTH-12' } });
  });

  it('keeps every other topic’s place when recording a new one', () => {
    let p = rememberCard(emptySession, 'auth', 'AUTH-12');
    p = rememberCard(p, 'cap', 'CAP-05');
    expect(p.lastCardByTopic).toEqual({ auth: 'AUTH-12', cap: 'CAP-05' });
  });

  it('does not mutate the input', () => {
    const before = rememberCard(emptySession, 'auth', 'AUTH-12');
    rememberCard(before, 'cap', 'CAP-05');
    expect(before.lastCardByTopic).toEqual({ auth: 'AUTH-12' });
  });
});

describe('switching topics mid-way and back', () => {
  // This is the round trip that matters: leave auth part-read, read some cap, come back.
  it('returns each topic to exactly where it was left', () => {
    let p: SessionPosition = emptySession;

    // Reading auth, ending on card 12.
    p = rememberCard(p, 'auth', 'AUTH-11');
    p = rememberCard(p, 'auth', 'AUTH-12');
    expect(p.activeTopicId).toBe('auth');

    // Switch to cap. Auth's place survives; cap has none yet, so it starts at the top.
    const toCap = openTopic(p, 'cap');
    expect(toCap.anchorCardId).toBeNull();
    expect(resumeCardFor(toCap.position, 'auth')).toBe('AUTH-12');

    // Read some cap.
    p = rememberCard(toCap.position, 'cap', 'CAP-04');

    // Switch back to auth: lands on AUTH-12, not the beginning.
    const backToAuth = openTopic(p, 'auth');
    expect(backToAuth.anchorCardId).toBe('AUTH-12');

    // And cap still remembers its own place.
    expect(resumeCardFor(backToAuth.position, 'cap')).toBe('CAP-04');
  });

  it('lets an explicit card override the remembered place', () => {
    const p = rememberCard(emptySession, 'auth', 'AUTH-12');
    expect(openTopic(p, 'auth', 'AUTH-01').anchorCardId).toBe('AUTH-01');
  });

  it('switches active topic without disturbing any remembered place', () => {
    let p = rememberCard(emptySession, 'auth', 'AUTH-12');
    p = rememberCard(p, 'cap', 'CAP-04');
    const switched = openTopic(p, 'auth');
    expect(switched.position.activeTopicId).toBe('auth');
    expect(switched.position.lastCardByTopic).toEqual({ auth: 'AUTH-12', cap: 'CAP-04' });
  });
});

describe('anchorForTopic', () => {
  it('prefers an explicit card', () => {
    const p = rememberCard(emptySession, 'cap', 'CAP-05');
    expect(anchorForTopic(p, 'cap', 'CAP-01')).toBe('CAP-01');
  });

  it('falls back to the remembered card', () => {
    const p = rememberCard(emptySession, 'cap', 'CAP-05');
    expect(anchorForTopic(p, 'cap')).toBe('CAP-05');
  });

  it('is null for a topic never opened', () => {
    expect(anchorForTopic(emptySession, 'cap')).toBeNull();
  });
});

describe('resumeOptionFor', () => {
  it('reports the position to continue from', () => {
    const p = rememberCard(emptySession, 'cap', 'CAP-05');
    expect(resumeOptionFor(p, capTopic, library)).toEqual({
      cardId: 'CAP-05',
      ordinal: 5,
      total: 9,
    });
  });

  it('offers nothing for a topic that was never opened', () => {
    expect(resumeOptionFor(emptySession, capTopic, library)).toBeNull();
  });

  it('offers nothing when the topic was left on its first card', () => {
    const p = rememberCard(emptySession, 'cap', 'CAP-01');
    expect(resumeOptionFor(p, capTopic, library)).toBeNull();
  });

  it('offers nothing when the remembered card is hidden by the audience mode', () => {
    // AUTH-34 is interview-only; in job mode there is nothing to continue to.
    const jobLibrary = buildDeck(topics as TopicFile[], 'job');
    const jobAuth = jobLibrary.topics.find((t) => t.id === 'auth')!;
    const p = rememberCard(emptySession, 'auth', 'AUTH-34');
    expect(resumeOptionFor(p, jobAuth, jobLibrary)).toBeNull();
    expect(resumeOptionFor(p, authTopic, library)).not.toBeNull();
  });

  it('does not confuse one topic’s place for another’s', () => {
    const p = rememberCard(emptySession, 'auth', 'AUTH-12');
    expect(resumeOptionFor(p, capTopic, library)).toBeNull();
  });
});

describe('forgetTopic', () => {
  it('drops only that topic’s place', () => {
    let p = rememberCard(emptySession, 'auth', 'AUTH-12');
    p = rememberCard(p, 'cap', 'CAP-04');
    expect(forgetTopic(p, 'cap').lastCardByTopic).toEqual({ auth: 'AUTH-12' });
  });

  it('is a no-op for a topic with no place recorded', () => {
    const p = rememberCard(emptySession, 'auth', 'AUTH-12');
    expect(forgetTopic(p, 'cap')).toBe(p);
  });
});
