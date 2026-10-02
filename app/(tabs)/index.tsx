import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  FlatList,
  Pressable,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../src/components/AppHeader';
import { ContentCardView } from '../../src/components/ContentCardView';
import { useDevRefreshControl } from '../../src/components/DevRefresh';
import { EndCardView } from '../../src/components/EndCardView';
import { QuizCardView } from '../../src/components/QuizCardView';
import { TopicProgressBar } from '../../src/components/TopicProgressBar';
import { TopicSwitcher } from '../../src/components/TopicSwitcher';
import type { FeedNode } from '../../src/feed';
import { useFeed } from '../../src/state/FeedContext';
import { useTheme } from '../../src/theme/ThemeContext';
import { space, typography } from '../../src/theme/theme';

/** A card counts as seen once it has been 80% visible for 600ms. */
const VIEWABILITY = { itemVisiblePercentThreshold: 80, minimumViewTime: 600 };

export default function FeedScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const feed = useFeed();
  const router = useRouter();
  const listRef = useRef<FlatList<FeedNode>>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  /** Answers chosen this session, keyed by screen key so a repeat visit starts clean. */
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [switcherOpen, setSwitcherOpen] = useState(false);
  // On a pager, an overscroll only exists at the very first card — below that, pulling
  // down pages to the previous card instead. So this can never fight the paging gesture.
  const refreshControl = useDevRefreshControl(colors.textMuted);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);

  // The viewability pair must keep the same identity for the life of the list, so the
  // live handler goes through a ref.
  const onViewable = useRef<(info: { viewableItems: ViewToken[] }) => void>(() => {});
  onViewable.current = ({ viewableItems }) => {
    const first = viewableItems[0];
    if (!first?.item) return;
    const screen = (first.item as FeedNode).screen;
    if (screen.kind !== 'card') return;
    if (screen.review) {
      // A re-surfaced card does not become "seen" again; it clears its review debt.
      if (screen.reviewForQuizId) feed.markCardReviewSeen(screen.reviewForQuizId, screen.cardId);
    } else {
      feed.markCardSeen(screen.cardId);
    }
  };

  const viewabilityPairs = useRef([
    {
      viewabilityConfig: VIEWABILITY,
      onViewableItemsChanged: (info: { viewableItems: ViewToken[] }) => onViewable.current(info),
    },
  ]).current;

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (size.height <= 0) return;
      const next = Math.round(e.nativeEvent.contentOffset.y / size.height);
      feed.setIndex(Math.max(0, Math.min(next, feed.nodes.length - 1)));
    },
    [feed, size.height]
  );

  /**
   * Resuming, switching topic, jumping to a bookmark and restarting all move the reader
   * without a swipe. Rather than scrolling imperatively into a list whose data changed in
   * the same commit — which races the native scroll view and can land on the wrong card —
   * the list is remounted at the target via initialScrollIndex, which getItemLayout makes
   * exact. scrollToken only changes on those deliberate moves, never on ordinary scrolling.
   */
  const listKey = `${feed.activeTopicId ?? 'none'}:${feed.scrollToken}`;

  const currentScreen = feed.nodes[feed.index]?.screen;
  const locked = currentScreen?.kind === 'quiz' && selections[currentScreen.key] === undefined;

  // The bar tracks the current topic; on a quiz or the end screen it holds the last
  // card's position rather than resetting to zero.
  const bar = useMemo(() => {
    for (let i = Math.min(feed.index, feed.nodes.length - 1); i >= 0; i--) {
      const screen = feed.nodes[i]?.screen;
      if (screen?.kind === 'card') {
        const ref = feed.deck.cardsById[screen.cardId];
        if (ref) return { position: ref.ordinalInTopic, total: ref.totalInTopic };
      }
    }
    return { position: 0, total: 1 };
  }, [feed.index, feed.nodes, feed.deck]);

  const activeTopic = feed.libraryDeck.topics.find((t) => t.id === feed.activeTopicId) ?? null;

  /** The next topic after this one that still has unread cards. */
  const nextTopic = useMemo(() => {
    const order = feed.libraryDeck.topics;
    const at = order.findIndex((t) => t.id === feed.activeTopicId);
    if (at < 0) return null;
    const seen = new Set(feed.progress.seenOrder);
    return (
      order.slice(at + 1).find((t) => t.cardIds.some((id) => !seen.has(id))) ??
      order.slice(at + 1)[0] ??
      null
    );
  }, [feed.libraryDeck.topics, feed.activeTopicId, feed.progress.seenOrder]);

  const renderItem = useCallback(
    ({ item, index }: { item: FeedNode; index: number }) => {
      const screen = item.screen;
      const { width, height } = size;

      if (screen.kind === 'end') {
        return (
          <EndCardView
            topicTitle={activeTopic?.title ?? 'this topic'}
            onRestart={feed.restart}
            onBackToTopics={() => router.navigate('/topics')}
            next={
              nextTopic
                ? { title: nextTopic.title, onPress: () => feed.openTopic(nextTopic.id) }
                : null
            }
            width={width}
            height={height}
          />
        );
      }

      if (screen.kind === 'quiz') {
        const question = feed.deck.quizById[screen.quizId];
        if (!question) return <View style={{ width, height }} />;
        return (
          <QuizCardView
            question={question}
            selectedOptionId={selections[screen.key] ?? null}
            onSelect={(optionId) => {
              setSelections((prev) => ({ ...prev, [screen.key]: optionId }));
              feed.answer(question, optionId, index);
            }}
            width={width}
            height={height}
          />
        );
      }

      const cardRef = feed.deck.cardsById[screen.cardId];
      if (!cardRef) return <View style={{ width, height }} />;
      return (
        <ContentCardView
          cardRef={cardRef}
          review={screen.review}
          width={width}
          height={height}
        />
      );
    },
    [feed, selections, size, activeTopic, nextTopic, router]
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: size.height,
      offset: size.height * index,
      index,
    }),
    [size.height]
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <AppHeader
        trailing={activeTopic?.title ?? (feed.libraryDeck.topics.length > 0 ? 'Choose topic' : undefined)}
        onPressTrailing={feed.libraryDeck.topics.length > 0 ? () => setSwitcherOpen(true) : undefined}
      />
      <TopicSwitcher visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />
      <TopicProgressBar position={bar.position} total={bar.total} />
      {feed.ready && !feed.activeTopicId ? (
        <View style={{ flex: 1, paddingHorizontal: space.screenX, justifyContent: 'center' }}>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: typography.label.size,
              fontWeight: typography.label.weight,
              letterSpacing: typography.label.letterSpacing,
              textTransform: 'uppercase',
            }}
          >
            Nothing open
          </Text>
          <Text
            style={{
              color: colors.text,
              fontSize: typography.title.size,
              fontWeight: typography.title.weight,
              lineHeight: typography.title.lineHeight,
              marginTop: space.gap,
            }}
          >
            Pick a topic to read.
          </Text>
          <Text
            style={{ color: colors.textMuted, fontSize: 15.5, lineHeight: 23, marginTop: 10 }}
          >
            The feed shows one topic at a time, so you only ever scroll through the cards you
            chose.
          </Text>
          <Pressable
            onPress={() => router.navigate('/topics')}
            accessibilityRole="button"
            style={({ pressed }) => ({
              marginTop: space.gap * 1.6,
              alignSelf: 'flex-start',
              backgroundColor: colors.surface,
              borderRadius: 8,
              paddingVertical: 13,
              paddingHorizontal: 20,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
              Browse topics
            </Text>
          </Pressable>
        </View>
      ) : null}
      <View style={{ flex: feed.activeTopicId ? 1 : 0 }} onLayout={onLayout}>
        {size.height > 0 && feed.ready && feed.activeTopicId ? (
          <FlatList
            ref={listRef}
            key={listKey}
            data={feed.nodes}
            initialScrollIndex={Math.min(feed.index, Math.max(feed.nodes.length - 1, 0))}
            onScrollToIndexFailed={({ index }) => {
              // getItemLayout should make this unreachable; fall back rather than freeze.
              requestAnimationFrame(() =>
                listRef.current?.scrollToOffset({ offset: index * size.height, animated: false })
              );
            }}
            keyExtractor={(item) => item.screen.key}
            renderItem={renderItem}
            getItemLayout={getItemLayout}
            refreshControl={refreshControl}
            pagingEnabled
            scrollEnabled={!locked}
            showsVerticalScrollIndicator={false}
            decelerationRate="fast"
            onMomentumScrollEnd={onMomentumScrollEnd}
            viewabilityConfigCallbackPairs={viewabilityPairs}
            initialNumToRender={2}
            maxToRenderPerBatch={2}
            windowSize={3}
            removeClippedSubviews={false}
          />
        ) : null}
      </View>
    </View>
  );
}
