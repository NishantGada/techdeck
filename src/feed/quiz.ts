import type { QuizQuestion } from '../content/types';
import type { Deck, Progress } from './types';

/** Card id -> position in the first-seen order. */
export function seenIndex(progress: Progress): Map<string, number> {
  const m = new Map<string, number>();
  progress.seenOrder.forEach((id, i) => {
    if (!m.has(id)) m.set(id, i);
  });
  return m;
}

/**
 * A question may be shown when every prerequisite card has been seen, it has not been
 * answered correctly, and — if it was answered wrong — its review cards have been re-seen.
 *
 * Only reviews *this deck can actually deliver* hold a question back. A review card the
 * deck cannot show (it belongs to another topic, or the audience mode hides it) would
 * otherwise block its question forever, because nothing would ever re-surface it.
 */
export function isQuizEligible(
  question: QuizQuestion,
  progress: Progress,
  seen: Map<string, number>,
  deck: Deck
): boolean {
  const state = progress.quiz[question.id];
  if (state?.status === 'correct') return false;
  if (state?.status === 'wrong') {
    const deliverable = state.awaitingReview.filter((id) => deck.cardsById[id]);
    if (deliverable.length > 0) return false;
  }
  return question.prerequisites.every((p) => seen.has(p));
}

/**
 * The point at which the last outstanding prerequisite was seen. Lower means the
 * question has been "ready" for longer. Questions with no prerequisites sort first.
 */
export function satisfiedAt(question: QuizQuestion, seen: Map<string, number>): number {
  let max = -1;
  for (const p of question.prerequisites) {
    const at = seen.get(p);
    if (at === undefined) return Number.POSITIVE_INFINITY;
    if (at > max) max = at;
  }
  return max;
}

export function eligibleQuizzes(deck: Deck, progress: Progress): QuizQuestion[] {
  const seen = seenIndex(progress);
  return deck.quiz.filter((q) => isQuizEligible(q, progress, seen, deck));
}

/**
 * Of the eligible questions, the one whose prerequisites were completed earliest.
 * Ties fall back to deck order, which is topic order — both deterministic.
 */
export function findEligibleQuiz(deck: Deck, progress: Progress): QuizQuestion | null {
  const seen = seenIndex(progress);
  let best: QuizQuestion | null = null;
  let bestAt = Number.POSITIVE_INFINITY;

  for (const q of deck.quiz) {
    if (!isQuizEligible(q, progress, seen, deck)) continue;
    const at = satisfiedAt(q, seen);
    if (best === null || at < bestAt) {
      best = q;
      bestAt = at;
    }
  }

  return best;
}
