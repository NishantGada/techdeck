import type { Audience, Card, QuizQuestion, TopicFile } from '../../content/types';
import type { Deck, FeedNode, Progress, Screen } from '../types';
import { initialCursor, emptyProgress } from '../types';
import { nextScreen } from '../sequence';
import { markReviewSeen, markSeen, answerQuiz } from '../progress';

export function makeCard(id: string, ordinal: number, audience: Audience = 'shared'): Card {
  return {
    id,
    ordinal,
    title: `Card ${id}`,
    audience,
    body: Array.from({ length: 70 }, (_, i) => `word${i}`).join(' '),
    seniorNote: `Note ${id}`,
    volatility: null,
    diagram: null,
  };
}

export function makeQuiz(
  id: string,
  prerequisites: string[],
  reviewCards: string[] = []
): QuizQuestion {
  return {
    id,
    prerequisites,
    prompt: `Prompt ${id}`,
    options: [
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
    ],
    correctOptionId: 'a',
    explanation: `Because ${id}.`,
    reviewCards,
  };
}

export function makeTopic(
  id: string,
  cards: Card[],
  opts: { prerequisites?: string[]; quiz?: QuizQuestion[] } = {}
): TopicFile {
  return {
    schemaVersion: 1,
    topic: {
      id,
      title: `Topic ${id}`,
      domain: 'Test',
      prerequisites: opts.prerequisites ?? [],
      summary: `Summary ${id}`,
    },
    cards,
    quiz: opts.quiz ?? [],
  };
}

/** n cards named `${prefix}1`..`${prefix}n`, all `shared`. */
export function makeCards(prefix: string, n: number): Card[] {
  return Array.from({ length: n }, (_, i) => makeCard(`${prefix}${i + 1}`, i + 1));
}

export interface SimulationStep {
  screen: Screen;
  /** contentCount at the moment this screen was shown. */
  contentCountBefore: number;
}

export interface SimulationResult {
  steps: SimulationStep[];
  nodes: FeedNode[];
  progress: Progress;
}

/**
 * Walks the feed the way the app does: each content card is marked seen before the next
 * screen is computed, each review card is marked re-seen, and each quiz is answered.
 *
 * `answers` maps quiz id to the option to choose; anything not listed is answered
 * correctly. A quiz can be answered differently on a repeat visit by supplying an array.
 */
export function simulate(
  deck: Deck,
  options: { answers?: Record<string, string | string[]>; maxScreens?: number } = {}
): SimulationResult {
  const maxScreens = options.maxScreens ?? 200;
  const answers = options.answers ?? {};
  const attempts: Record<string, number> = {};

  let progress = emptyProgress();
  let cursor = initialCursor();
  const steps: SimulationStep[] = [];
  const nodes: FeedNode[] = [];

  while (steps.length < maxScreens) {
    const node = nextScreen(deck, progress, cursor);
    steps.push({ screen: node.screen, contentCountBefore: cursor.contentCount });
    nodes.push(node);

    const s = node.screen;
    if (s.kind === 'card' && !s.review) {
      progress = markSeen(progress, s.cardId);
    } else if (s.kind === 'card' && s.review && s.reviewForQuizId) {
      progress = markReviewSeen(progress, s.reviewForQuizId, s.cardId);
    } else if (s.kind === 'quiz') {
      const question = deck.quizById[s.quizId];
      const spec = answers[s.quizId];
      const attempt = attempts[s.quizId] ?? 0;
      attempts[s.quizId] = attempt + 1;
      const choice = Array.isArray(spec)
        ? spec[Math.min(attempt, spec.length - 1)]
        : (spec ?? question.correctOptionId);
      progress = answerQuiz(progress, question, choice, cursor.contentCount).progress;
    }

    cursor = node.cursorAfter;
    if (s.kind === 'end') break;
  }

  return { steps, nodes, progress };
}

/** Compact rendering of a run, for readable assertions: "c1 c2 Q:Q1 c3 R:c1 END". */
export function describeRun(result: SimulationResult): string[] {
  return result.steps.map(({ screen }) => {
    if (screen.kind === 'end') return 'END';
    if (screen.kind === 'quiz') return `Q:${screen.quizId}`;
    return screen.review ? `R:${screen.cardId}` : screen.cardId;
  });
}
