export type Audience = 'shared' | 'interview' | 'job';

/** The two user-selectable feed modes. Each admits `shared` plus its own audience. */
export type AudienceMode = 'interview' | 'job';

export interface Volatility {
  label: string;
  /** "YYYY-MM" */
  lastVerified: string;
}

export interface Diagram {
  type: 'svg';
  alt: string;
  svg: string;
}

export interface Card {
  id: string;
  ordinal: number;
  title: string;
  audience: Audience;
  body: string;
  seniorNote: string;
  volatility: null | Volatility;
  diagram: null | Diagram;
}

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  /** Card ids. The question is eligible only once ALL of these have been seen. */
  prerequisites: string[];
  prompt: string;
  options: QuizOption[];
  correctOptionId: string;
  explanation: string;
  /** Card ids to re-surface if answered wrong. */
  reviewCards: string[];
}

export interface TopicMeta {
  id: string;
  title: string;
  domain: string;
  /** Topic ids that must come earlier in the feed. */
  prerequisites: string[];
  summary: string;
}

export interface TopicFile {
  schemaVersion: 1;
  topic: TopicMeta;
  cards: Card[];
  quiz: QuizQuestion[];
}

/** A card paired with the topic it came from, which the feed and card UI both need. */
export interface CardRef {
  card: Card;
  topicId: string;
  topicTitle: string;
  /** 1-based position among the *visible* cards of this topic, for the "3 / 9" label. */
  ordinalInTopic: number;
  /** Count of visible cards in this topic. */
  totalInTopic: number;
}
