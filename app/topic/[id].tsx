import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookmarkIcon } from '../../src/components/BookmarkIcon';
import { useDevRefreshControl } from '../../src/components/DevRefresh';
import { bookmarksForTopic, resumeOptionFor } from '../../src/feed';
import { useBookmarks } from '../../src/state/BookmarksContext';
import { useFeed } from '../../src/state/FeedContext';
import { useTheme } from '../../src/theme/ThemeContext';
import { space, typography } from '../../src/theme/theme';

function SectionLabel({ children }: { children: string }) {
  const { colors } = useTheme();
  return (
    <Text
      style={{
        color: colors.textMuted,
        fontSize: typography.label.size,
        fontWeight: typography.label.weight,
        letterSpacing: typography.label.letterSpacing,
        textTransform: 'uppercase',
        marginBottom: 12,
      }}
    >
      {children}
    </Text>
  );
}

export default function TopicDetailScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const feed = useFeed();
  const { bookmarks, remove } = useBookmarks();
  const refreshControl = useDevRefreshControl(colors.textMuted);
  const { id } = useLocalSearchParams<{ id: string }>();

  const topic = feed.libraryDeck.topics.find((t) => t.id === id);

  if (!topic) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          paddingTop: insets.top + space.screenY,
          paddingHorizontal: space.screenX,
        }}
      >
        <Text style={{ color: colors.textMuted, fontSize: 15.5 }}>That topic is not here.</Text>
      </View>
    );
  }

  const progress = feed.topicProgress.find((p) => p.topicId === topic.id) ?? {
    seen: 0,
    total: topic.cardIds.length,
  };
  const fraction = progress.total > 0 ? progress.seen / progress.total : 0;
  const saved = bookmarksForTopic(bookmarks, topic, feed.libraryDeck);

  /** Switching topic is what scopes the feed; the card is where to land inside it. */
  const openCard = (cardId?: string) => {
    feed.openTopic(topic.id, cardId);
    router.dismissTo('/');
  };

  const firstCardId = topic.cardIds[0];
  const resume = resumeOptionFor(feed.position, topic, feed.libraryDeck);

  const confirmReset = () => {
    Alert.alert(
      `Reset ${topic.title}?`,
      `This clears your progress on ${topic.title} only — its cards become unread and its questions unanswered. Every other topic, and all your bookmarks, are left alone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset topic',
          style: 'destructive',
          onPress: () => feed.resetTopicProgress(topic.id),
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Back to topics"
        hitSlop={10}
        style={({ pressed }) => ({
          paddingHorizontal: space.screenX,
          paddingTop: 4,
          paddingBottom: 10,
          alignSelf: 'flex-start',
          opacity: pressed ? 0.5 : 1,
        })}
      >
        <Text
          style={{
            color: colors.textMuted,
            fontSize: typography.label.size,
            fontWeight: typography.label.weight,
            letterSpacing: typography.label.letterSpacing,
            textTransform: 'uppercase',
          }}
        >
          ‹ Topics
        </Text>
      </Pressable>

      <ScrollView
        refreshControl={refreshControl}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: space.screenX,
          paddingBottom: insets.bottom + space.screenY * 2,
        }}
      >
        <Text
          style={{
            color: colors.textMuted,
            fontSize: 11,
            fontWeight: '600',
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          {topic.domain}
        </Text>
        <Text
          style={{
            color: colors.text,
            fontSize: typography.title.size,
            fontWeight: typography.title.weight,
            lineHeight: typography.title.lineHeight,
            marginTop: 6,
          }}
        >
          {topic.title}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22, marginTop: 10 }}>
          {topic.summary}
        </Text>

        <View style={{ marginTop: space.gap * 1.4 }}>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: typography.label.size,
              fontWeight: typography.label.weight,
              letterSpacing: typography.label.letterSpacing,
            }}
          >
            {progress.seen} / {progress.total} SEEN
          </Text>
          <View style={{ height: 2, backgroundColor: colors.progressTrack, marginTop: 8 }}>
            <View
              style={{
                height: 2,
                width: `${fraction * 100}%`,
                backgroundColor: colors.progressFill,
              }}
            />
          </View>
        </View>

        <View style={{ marginTop: space.gap * 1.4, gap: 4, alignItems: 'flex-start' }}>
          {resume ? (
            <Pressable
              onPress={() => openCard(resume.cardId)}
              accessibilityRole="button"
              accessibilityLabel={`Continue from card ${resume.ordinal}`}
              style={({ pressed }) => ({
                backgroundColor: colors.surface,
                borderRadius: 8,
                paddingVertical: 13,
                paddingHorizontal: 20,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
                Continue from {resume.ordinal} / {resume.total}
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={() => firstCardId && openCard(firstCardId)}
            disabled={!firstCardId}
            accessibilityRole="button"
            style={({ pressed }) => ({
              backgroundColor: resume ? 'transparent' : colors.surface,
              borderRadius: 8,
              paddingVertical: 13,
              paddingHorizontal: resume ? 0 : 20,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text
              style={{
                color: resume ? colors.textMuted : colors.text,
                fontSize: 16,
                fontWeight: '600',
              }}
            >
              Read from the start
            </Text>
          </Pressable>
        </View>

        <View style={{ marginTop: space.gap * 2.4 }}>
          <SectionLabel>Bookmarks</SectionLabel>

          {saved.cards.length === 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: 14.5, lineHeight: 21 }}>
              Nothing saved from this topic yet. Tap the bookmark in the corner of any card to
              keep it here.
            </Text>
          ) : (
            <View style={{ gap: 2 }}>
              {saved.cards.map((ref) => (
                <View
                  key={ref.card.id}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
                >
                  <Pressable
                    onPress={() => openCard(ref.card.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${ref.card.title}`}
                    style={({ pressed }) => ({
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      paddingVertical: 12,
                      opacity: pressed ? 0.55 : 1,
                    })}
                  >
                    <Text
                      style={{
                        color: colors.textMuted,
                        fontSize: typography.label.size,
                        fontWeight: typography.label.weight,
                        letterSpacing: typography.label.letterSpacing,
                        width: 22,
                      }}
                    >
                      {ref.ordinalInTopic}
                    </Text>
                    <Text
                      style={{ flex: 1, color: colors.text, fontSize: 16, lineHeight: 22 }}
                    >
                      {ref.card.title}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => remove(ref.card.id)}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove bookmark from ${ref.card.title}`}
                    style={({ pressed }) => ({ opacity: pressed ? 0.45 : 1 })}
                  >
                    <BookmarkIcon filled color={colors.text} size={18} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {saved.hiddenCount > 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 12 }}>
              {saved.hiddenCount} more {saved.hiddenCount === 1 ? 'bookmark is' : 'bookmarks are'}{' '}
              hidden by the current audience mode. Switch modes in Settings to see{' '}
              {saved.hiddenCount === 1 ? 'it' : 'them'}.
            </Text>
          ) : null}
        </View>

        <View style={{ marginTop: space.gap * 2.4 }}>
          <SectionLabel>Progress</SectionLabel>
          <Pressable
            onPress={confirmReset}
            disabled={progress.seen === 0}
            accessibilityRole="button"
            accessibilityLabel={`Reset progress for ${topic.title}`}
            style={({ pressed }) => ({
              alignSelf: 'flex-start',
              backgroundColor: colors.errorSurface,
              borderRadius: 8,
              paddingVertical: 13,
              paddingHorizontal: 16,
              opacity: progress.seen === 0 ? 0.4 : pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ color: colors.error, fontSize: 15.5, fontWeight: '600' }}>
              Reset this topic
            </Text>
          </Pressable>
          <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 8 }}>
            Bookmarks are kept.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
