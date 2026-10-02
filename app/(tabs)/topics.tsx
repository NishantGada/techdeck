import { useRouter } from 'expo-router';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../src/components/AppHeader';
import { BookmarkIcon } from '../../src/components/BookmarkIcon';
import { useDevRefreshControl } from '../../src/components/DevRefresh';
import { bookmarkCountForTopic } from '../../src/feed';
import { useBookmarks } from '../../src/state/BookmarksContext';
import { useFeed } from '../../src/state/FeedContext';
import { useTheme } from '../../src/theme/ThemeContext';
import { space, typography } from '../../src/theme/theme';

export default function TopicsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const feed = useFeed();
  const { bookmarks } = useBookmarks();
  const refreshControl = useDevRefreshControl(colors.textMuted);

  const progressByTopic = new Map(feed.topicProgress.map((p) => [p.topicId, p]));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <AppHeader trailing="Topics" />

      <FlatList
        refreshControl={refreshControl}
        data={feed.libraryDeck.topics}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ paddingBottom: space.screenY }}
        renderItem={({ item }) => {
          const p = progressByTopic.get(item.id) ?? { seen: 0, total: item.cardIds.length };
          const fraction = p.total > 0 ? p.seen / p.total : 0;
          const savedCount = bookmarkCountForTopic(bookmarks, item);

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.title}, ${p.seen} of ${p.total} cards seen, ${savedCount} bookmarked`}
              onPress={() => router.push(`/topic/${item.id}`)}
              style={({ pressed }) => ({
                paddingHorizontal: space.screenX,
                paddingVertical: 16,
                opacity: pressed ? 0.55 : 1,
              })}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16 }}>
                <Text style={{ flex: 1, color: colors.text, fontSize: 18, fontWeight: '600' }}>
                  {item.title}
                </Text>
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: typography.label.size,
                    fontWeight: typography.label.weight,
                    letterSpacing: typography.label.letterSpacing,
                  }}
                >
                  {p.seen} / {p.total}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: 11,
                    fontWeight: '600',
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                  }}
                >
                  {item.domain}
                </Text>
                {savedCount > 0 ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <BookmarkIcon filled color={colors.textMuted} size={12} />
                    <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600' }}>
                      {savedCount}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text
                style={{ color: colors.textMuted, fontSize: 14.5, lineHeight: 21, marginTop: 8 }}
              >
                {item.summary}
              </Text>

              <View style={{ height: 2, backgroundColor: colors.progressTrack, marginTop: 12 }}>
                <View
                  style={{
                    height: 2,
                    width: `${fraction * 100}%`,
                    backgroundColor: colors.progressFill,
                  }}
                />
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
