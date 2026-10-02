import { loadRawTopicEntries } from './registry';
import { reportIssues, validateTopicFiles, type Issue } from './validate';
import type { TopicFile } from './types';

export * from './types';
export {
  validateTopicFiles,
  countWords,
  formatIssue,
  reportIssues,
  MIN_BODY_WORDS,
  MAX_BODY_WORDS,
} from './validate';
export type { Issue, IssueLevel, ValidationResult } from './validate';

export interface Library {
  topics: TopicFile[];
  issues: Issue[];
}

let cached: Library | null = null;

/**
 * Loads, validates and memoizes every bundled topic file. Throws in dev on structural
 * problems (duplicate ids, dangling prerequisites); word-count violations are logged.
 */
export function loadLibrary(): Library {
  if (cached) return cached;

  const { topics, issues } = validateTopicFiles(loadRawTopicEntries());
  const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
  reportIssues(issues, isDev);

  cached = { topics, issues };
  return cached;
}
