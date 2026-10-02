import type { QuizQuestion } from '../content/types';
import type { Progress } from './types';

/** Records a first sighting. Re-surfaced review cards must not go through here. */
export function markSeen(progress: Progress, cardId: string): Progress {
  if (progress.seenOrder.includes(cardId)) return progress;
  return { ...progress, seenOrder: [...progress.seenOrder, cardId] };
}

/**
 * Records that a re-surfaced review card was looked at again. When the last one is
 * cleared the question becomes eligible again.
 */
export function markReviewSeen(progress: Progress, quizId: string, cardId: string): Progress {
  const state = progress.quiz[quizId];
  if (!state || state.status !== 'wrong') return progress;
  if (!state.awaitingReview.includes(cardId)) return progress;

  return {
    ...progress,
    quiz: {
      ...progress.quiz,
      [quizId]: {
        ...state,
        awaitingReview: state.awaitingReview.filter((id) => id !== cardId),
      },
    },
  };
}

export interface AnswerResult {
  progress: Progress;
  correct: boolean;
}

/**
 * A correct answer retires the question for good. A wrong one schedules its review cards
 * relative to `contentCount`, the number of content cards shown when the quiz appeared.
 */
export function answerQuiz(
  progress: Progress,
  question: QuizQuestion,
  optionId: string,
  contentCount: number
): AnswerResult {
  const correct = optionId === question.correctOptionId;

  return {
    correct,
    progress: {
      ...progress,
      quiz: {
        ...progress.quiz,
        [question.id]: correct
          ? { status: 'correct' }
          : {
              status: 'wrong',
              wrongAtContentCount: contentCount,
              awaitingReview: [...question.reviewCards],
            },
      },
    },
  };
}

export function hasSeen(progress: Progress, cardId: string): boolean {
  return progress.seenOrder.includes(cardId);
}

/**
 * Forgets one topic without touching the rest: its cards drop out of the seen set and
 * its questions lose their answered state, so the topic can be read again from the top.
 *
 * Cards being un-seen are also pulled out of any *other* topic's outstanding review debt
 * — they are going back into the normal rotation, so holding a question behind a review
 * that will now arrive as an ordinary card would strand it.
 */
export function resetTopic(
  progress: Progress,
  cardIds: string[],
  quizIds: string[]
): Progress {
  const cards = new Set(cardIds);
  const quizzes = new Set(quizIds);

  const quiz: Progress['quiz'] = {};
  for (const [id, state] of Object.entries(progress.quiz)) {
    if (quizzes.has(id)) continue;
    if (state.status === 'wrong') {
      quiz[id] = {
        ...state,
        awaitingReview: state.awaitingReview.filter((c) => !cards.has(c)),
      };
    } else {
      quiz[id] = state;
    }
  }

  return {
    seenOrder: progress.seenOrder.filter((id) => !cards.has(id)),
    quiz,
  };
}
