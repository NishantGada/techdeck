import type { Audience, Card, QuizQuestion, TopicFile } from './types';

export type IssueLevel = 'fatal' | 'warning';

export interface Issue {
  level: IssueLevel;
  code: string;
  /** Which file / id the problem is in, for the log line. */
  where: string;
  message: string;
}

export interface ValidationResult {
  /** Files that passed the structural check, in the order given. */
  topics: TopicFile[];
  issues: Issue[];
}

export const MIN_BODY_WORDS = 60;
export const MAX_BODY_WORDS = 80;

const AUDIENCES: Audience[] = ['shared', 'interview', 'job'];

/** Whitespace-delimited token count. Hyphenated terms count as one word. */
export function countWords(body: string): number {
  const trimmed = body.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

/**
 * Lightweight runtime shape check. Returns null (and pushes issues) when the file
 * is too malformed to reason about; callers then drop it.
 */
function checkShape(raw: unknown, where: string, issues: Issue[]): TopicFile | null {
  const fatal = (code: string, message: string) => {
    issues.push({ level: 'fatal', code, where, message });
  };

  if (!isRecord(raw)) {
    fatal('shape', 'Topic file is not an object.');
    return null;
  }
  if (raw.schemaVersion !== 1) {
    fatal('schema-version', `Expected schemaVersion 1, got ${JSON.stringify(raw.schemaVersion)}.`);
    return null;
  }

  const topic = raw.topic;
  if (
    !isRecord(topic) ||
    typeof topic.id !== 'string' ||
    typeof topic.title !== 'string' ||
    typeof topic.domain !== 'string' ||
    typeof topic.summary !== 'string' ||
    !isStringArray(topic.prerequisites)
  ) {
    fatal('shape', 'topic must have string id, title, domain, summary and a string[] prerequisites.');
    return null;
  }

  if (!Array.isArray(raw.cards) || raw.cards.length === 0) {
    fatal('shape', `topic "${topic.id}" has no cards array.`);
    return null;
  }
  if (!Array.isArray(raw.quiz)) {
    fatal('shape', `topic "${topic.id}" has no quiz array.`);
    return null;
  }

  const cards: Card[] = [];
  for (const [i, c] of raw.cards.entries()) {
    if (
      !isRecord(c) ||
      typeof c.id !== 'string' ||
      typeof c.ordinal !== 'number' ||
      typeof c.title !== 'string' ||
      typeof c.body !== 'string' ||
      typeof c.seniorNote !== 'string' ||
      typeof c.audience !== 'string' ||
      !AUDIENCES.includes(c.audience as Audience)
    ) {
      fatal('shape', `cards[${i}] in topic "${topic.id}" is malformed.`);
      continue;
    }
    if (c.volatility !== null) {
      if (
        !isRecord(c.volatility) ||
        typeof c.volatility.label !== 'string' ||
        typeof c.volatility.lastVerified !== 'string'
      ) {
        fatal('shape', `card "${c.id}" has a malformed volatility block.`);
        continue;
      }
      if (!/^\d{4}-\d{2}$/.test(c.volatility.lastVerified)) {
        issues.push({
          level: 'warning',
          code: 'volatility-date',
          where,
          message: `card "${c.id}" lastVerified "${c.volatility.lastVerified}" is not YYYY-MM.`,
        });
      }
    }
    if (c.diagram !== null) {
      if (
        !isRecord(c.diagram) ||
        c.diagram.type !== 'svg' ||
        typeof c.diagram.alt !== 'string' ||
        typeof c.diagram.svg !== 'string'
      ) {
        fatal('shape', `card "${c.id}" has a malformed diagram block.`);
        continue;
      }
      if (!/viewBox\s*=/.test(c.diagram.svg)) {
        issues.push({
          level: 'warning',
          code: 'diagram-viewbox',
          where,
          message: `card "${c.id}" diagram has no viewBox; aspect ratio will fall back to 16:9.`,
        });
      }
    }
    cards.push(c as unknown as Card);
  }

  const quiz: QuizQuestion[] = [];
  for (const [i, q] of raw.quiz.entries()) {
    if (
      !isRecord(q) ||
      typeof q.id !== 'string' ||
      typeof q.prompt !== 'string' ||
      typeof q.explanation !== 'string' ||
      typeof q.correctOptionId !== 'string' ||
      !isStringArray(q.prerequisites) ||
      !isStringArray(q.reviewCards) ||
      !Array.isArray(q.options) ||
      !q.options.every((o) => isRecord(o) && typeof o.id === 'string' && typeof o.text === 'string')
    ) {
      fatal('shape', `quiz[${i}] in topic "${topic.id}" is malformed.`);
      continue;
    }
    quiz.push(q as unknown as QuizQuestion);
  }

  return { schemaVersion: 1, topic: topic as unknown as TopicFile['topic'], cards, quiz };
}

/**
 * Validates a set of topic files as a whole. Cross-file checks (globally unique card
 * ids, prerequisite resolution) need every file, so this is not per-file.
 */
export function validateTopicFiles(entries: { name: string; data: unknown }[]): ValidationResult {
  const issues: Issue[] = [];
  const topics: TopicFile[] = [];

  for (const entry of entries) {
    const file = checkShape(entry.data, entry.name, issues);
    if (file) topics.push(file);
  }

  const topicIds = new Map<string, string>();
  const cardIds = new Map<string, string>();
  const quizIds = new Map<string, string>();

  for (const t of topics) {
    const where = t.topic.id;
    const prevTopic = topicIds.get(t.topic.id);
    if (prevTopic) {
      issues.push({
        level: 'fatal',
        code: 'duplicate-id',
        where,
        message: `Duplicate topic id "${t.topic.id}" (also in ${prevTopic}).`,
      });
    } else {
      topicIds.set(t.topic.id, where);
    }

    for (const c of t.cards) {
      const prev = cardIds.get(c.id);
      if (prev) {
        issues.push({
          level: 'fatal',
          code: 'duplicate-id',
          where,
          message: `Duplicate card id "${c.id}" (also in topic "${prev}").`,
        });
      } else {
        cardIds.set(c.id, t.topic.id);
      }
    }

    for (const q of t.quiz) {
      const prev = quizIds.get(q.id);
      if (prev) {
        issues.push({
          level: 'fatal',
          code: 'duplicate-id',
          where,
          message: `Duplicate quiz id "${q.id}" (also in topic "${prev}").`,
        });
      } else {
        quizIds.set(q.id, t.topic.id);
      }
    }

    // Ordinals should be a 1..n permutation so "3 / 9" means something.
    const ordinals = t.cards.map((c) => c.ordinal).sort((a, b) => a - b);
    const expected = ordinals.every((o, i) => o === i + 1);
    if (!expected) {
      issues.push({
        level: 'warning',
        code: 'ordinals',
        where,
        message: `Card ordinals in "${t.topic.id}" are not 1..${t.cards.length}: [${ordinals.join(', ')}].`,
      });
    }
  }

  // Second pass: everything that needs the full id universe.
  for (const t of topics) {
    const where = t.topic.id;

    for (const p of t.topic.prerequisites) {
      if (!topicIds.has(p)) {
        issues.push({
          level: 'fatal',
          code: 'unknown-prerequisite',
          where,
          message: `Topic "${t.topic.id}" lists unknown prerequisite topic "${p}".`,
        });
      }
    }

    for (const c of t.cards) {
      const words = countWords(c.body);
      if (words < MIN_BODY_WORDS || words > MAX_BODY_WORDS) {
        issues.push({
          level: 'warning',
          code: 'body-word-count',
          where,
          message: `card "${c.id}" body is ${words} words (expected ${MIN_BODY_WORDS}-${MAX_BODY_WORDS}).`,
        });
      }
    }

    for (const q of t.quiz) {
      for (const p of q.prerequisites) {
        if (!cardIds.has(p)) {
          issues.push({
            level: 'fatal',
            code: 'unknown-prerequisite',
            where,
            message: `Quiz "${q.id}" lists unknown prerequisite card "${p}".`,
          });
        }
      }
      for (const r of q.reviewCards) {
        if (!cardIds.has(r)) {
          issues.push({
            level: 'fatal',
            code: 'unknown-prerequisite',
            where,
            message: `Quiz "${q.id}" lists unknown reviewCard "${r}".`,
          });
        }
      }
      if (!q.options.some((o) => o.id === q.correctOptionId)) {
        issues.push({
          level: 'fatal',
          code: 'bad-correct-option',
          where,
          message: `Quiz "${q.id}" correctOptionId "${q.correctOptionId}" is not one of its options.`,
        });
      }
      const optionIds = new Set(q.options.map((o) => o.id));
      if (optionIds.size !== q.options.length) {
        issues.push({
          level: 'fatal',
          code: 'duplicate-id',
          where,
          message: `Quiz "${q.id}" has duplicate option ids.`,
        });
      }
    }
  }

  return { topics, issues };
}

export function formatIssue(i: Issue): string {
  return `[content:${i.code}] ${i.where}: ${i.message}`;
}

/**
 * Reports issues. Word-count problems are logged only. Structural problems throw
 * in dev so they cannot be shipped past unnoticed; in production we log and carry on
 * rather than hard-crash a reader's app.
 */
export function reportIssues(issues: Issue[], isDev: boolean): void {
  const fatal = issues.filter((i) => i.level === 'fatal');
  const warnings = issues.filter((i) => i.level === 'warning');

  for (const w of warnings) console.warn(formatIssue(w));
  for (const f of fatal) console.error(formatIssue(f));

  if (fatal.length > 0 && isDev) {
    throw new Error(
      `Content validation failed with ${fatal.length} fatal issue(s):\n` +
        fatal.map((f) => `  - ${formatIssue(f)}`).join('\n')
    );
  }
}
