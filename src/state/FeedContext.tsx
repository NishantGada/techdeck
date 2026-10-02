import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { QuizQuestion } from '../content/types';
import { loadLibrary } from '../content';
import {
  answerQuiz,
  buildDeck,
  buildFeed,
  emptyProgress,
  indexOfCard,
  markReviewSeen,
  markSeen,
  rememberCard,
  resetTopic,
  resumeCardFor,
  forgetTopic,
  emptySession,
  openTopic as openTopicPosition,
  type SessionPosition,
  topicProgress,
  type Deck,
  type FeedNode,
  type Progress,
  type TopicProgress,
} from '../feed';
import {
  anchorCardAt,
  initialState,
  reducer,
  type Action,
  type FeedState,
} from './feedReducer';
import { useSettings } from './SettingsContext';
import { clearProgress, loadPosition, loadProgress, saveProgress, savePosition } from './storage';

interface FeedValue {
  ready: boolean;
  /** Every topic, in prerequisite order. Drives the Topics list, not the feed. */
  libraryDeck: Deck;
  /** Just the topic being read. The feed never contains anything else. */
  deck: Deck;
  activeTopicId: string | null;
  /** Which topic is open and where each topic was left. */
  position: SessionPosition;
  nodes: FeedNode[];
  index: number;
  scrollToken: number;
  progress: Progress;
  topicProgress: TopicProgress[];
  markCardSeen: (cardId: string) => void;
  markCardReviewSeen: (quizId: string, cardId: string) => void;
  answer: (question: QuizQuestion, optionId: string, at: number) => void;
  setIndex: (index: number) => void;
  /** Switches the feed to a topic, optionally landing on a specific card. */
  openTopic: (topicId: string, cardId?: string) => void;
  /** The card this topic was last left on, if any. */
  resumeCardFor: (topicId: string) => string | null;
  jumpToCard: (cardId: string) => void;
  restart: () => void;
  resetTopicProgress: (topicId: string) => void;
  resetProgress: () => void;
}

const FeedContext = createContext<FeedValue | null>(null);

export function FeedProvider({ children }: { children: ReactNode }) {
  const { settings, ready: settingsReady } = useSettings();

  // Content is bundled, so this is synchronous and validated exactly once.
  const library = useMemo(() => loadLibrary(), []);

  /** Every topic, ordered by the prerequisite graph. Used for listing, never for reading. */
  const libraryDeck = useMemo(
    () => buildDeck(library.topics, settings.audienceMode),
    [library, settings.audienceMode]
  );

  /** Which topic is open and where each one was left. All the logic is in src/feed/session. */
  const [position, setPosition] = useState<SessionPosition>(emptySession);
  const activeTopicId = position.activeTopicId;

  /**
   * A deck holding exactly one topic. Everything downstream — cadence, quiz eligibility,
   * review scheduling, the end screen — is unchanged; it simply has less to work with.
   */
  const deckForTopic = useCallback(
    (topicId: string | null): Deck => {
      const file = topicId ? library.topics.find((t) => t.topic.id === topicId) : undefined;
      return buildDeck(file ? [file] : [], settings.audienceMode);
    },
    [library, settings.audienceMode]
  );

  const deck = useMemo(() => deckForTopic(activeTopicId), [deckForTopic, activeTopicId]);

  const [state, dispatch] = useReducer(reducer, initialState);
  const deckRef = useRef(deck);
  deckRef.current = deck;
  // Read inside effects that must not re-run when these change.
  const stateRef = useRef(state);
  stateRef.current = state;
  const activeTopicIdRef = useRef(activeTopicId);
  activeTopicIdRef.current = activeTopicId;

  // Hydrate once settings are known, so the first feed is built for the right audience.
  const hydrated = useRef(false);
  useEffect(() => {
    if (!settingsReady || hydrated.current) return;
    hydrated.current = true;
    let cancelled = false;
    void Promise.all([loadProgress(), loadPosition()]).then(([progress, stored]) => {
      if (cancelled) return;
      setPosition(stored);
      dispatch({
        type: 'hydrate',
        deck: deckForTopic(stored.activeTopicId),
        progress,
        resumeCardId: stored.activeTopicId ? resumeCardFor(stored, stored.activeTopicId) : null,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [settingsReady, deckForTopic]);

  /**
   * Changing audience changes which cards exist, so the feed has to be rebuilt; keep the
   * reader on their card if it survives the change.
   *
   * This deliberately keys on the audience mode and NOT on deck identity. The deck object
   * also changes on every topic switch, and openTopic has already dispatched the correct
   * rebuild by then — a second one here would re-derive the anchor from the screen the
   * reader happens to be on, which is null on a quiz screen, and silently restart the
   * topic from the top.
   */
  const lastAudience = useRef(settings.audienceMode);
  useEffect(() => {
    if (lastAudience.current === settings.audienceMode) return;
    lastAudience.current = settings.audienceMode;
    if (!stateRef.current.ready) return;
    const anchor = anchorCardAt(stateRef.current.nodes, stateRef.current.index);
    dispatch({ type: 'rebuild', deck: deckForTopic(activeTopicIdRef.current), anchorCardId: anchor });
  }, [settings.audienceMode, deckForTopic]);

  useEffect(() => {
    if (!state.ready) return;
    void saveProgress(state.progress);
  }, [state.progress, state.ready]);

  const currentScreen = state.nodes[state.index]?.screen;
  const currentCardId = currentScreen?.kind === 'card' ? currentScreen.cardId : null;
  useEffect(() => {
    if (!state.ready || !activeTopicId || !currentCardId) return;
    setPosition((prev) => {
      const next = rememberCard(prev, activeTopicId, currentCardId);
      if (next !== prev) void savePosition(next);
      return next;
    });
  }, [currentCardId, activeTopicId, state.ready]);

  const value = useMemo<FeedValue>(
    () => ({
      ready: state.ready,
      libraryDeck,
      deck,
      activeTopicId,
      position,
      nodes: state.nodes,
      index: state.index,
      scrollToken: state.scrollToken,
      progress: state.progress,
      topicProgress: topicProgress(libraryDeck, state.progress.seenOrder),
      markCardSeen: (cardId) => dispatch({ type: 'seen', deck: deckRef.current, cardId }),
      markCardReviewSeen: (quizId, cardId) =>
        dispatch({ type: 'reviewSeen', deck: deckRef.current, quizId, cardId }),
      answer: (question, optionId, at) =>
        dispatch({ type: 'answer', deck: deckRef.current, question, optionId, at }),
      setIndex: (index) => dispatch({ type: 'index', deck: deckRef.current, index }),
      openTopic: (topicId, cardId) => {
        // An explicit card wins; otherwise pick up where this topic was left.
        const { position: next, anchorCardId } = openTopicPosition(position, topicId, cardId);
        setPosition(next);
        void savePosition(next);
        dispatch({ type: 'rebuild', deck: deckForTopic(topicId), anchorCardId });
      },
      resumeCardFor: (topicId) => resumeCardFor(position, topicId),
      jumpToCard: (cardId) => dispatch({ type: 'jump', deck: deckRef.current, cardId }),
      restart: () => dispatch({ type: 'restart', deck: deckRef.current }),
      resetTopicProgress: (topicId) => {
        // libraryDeck, not deckRef: the reading deck holds only the active topic, so
        // looking up here would silently no-op for every other topic.
        const topic = libraryDeck.topics.find((t) => t.id === topicId);
        if (!topic) return;
        // allCardIds, not cardIds: a card hidden by the current audience mode still
        // needs its seen state cleared, or it silently stays read.
        // A reset topic should start at the top again, not resume mid-way.
        setPosition((prev) => {
          const next = forgetTopic(prev, topicId);
          if (next !== prev) void savePosition(next);
          return next;
        });
        dispatch({
          type: 'resetTopic',
          deck: deckRef.current,
          cardIds: topic.allCardIds,
          quizIds: topic.quizIds,
          resetActive: topicId === activeTopicId,
        });
      },
      resetProgress: () => {
        void clearProgress();
        dispatch({ type: 'reset', deck: deckRef.current });
      },
    }),
    [state, deck, libraryDeck, activeTopicId, deckForTopic, position]
  );

  return <FeedContext.Provider value={value}>{children}</FeedContext.Provider>;
}

export function useFeed(): FeedValue {
  const value = useContext(FeedContext);
  if (!value) throw new Error('useFeed must be used inside FeedProvider');
  return value;
}
