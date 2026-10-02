import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { resumeOptionFor, topicProgress } from '../feed';
import { useFeed } from '../state/FeedContext';
import { useTheme } from '../theme/ThemeContext';
import { space, typography } from '../theme/theme';

/**
 * Switching topics from inside the feed. Each row says where that topic will pick up, and
 * choosing one leaves the topic you were on exactly where it was — positions are per topic.
 */
export function TopicSwitcher({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const feed = useFeed();

  const progressByTopic = new Map(
    topicProgress(feed.libraryDeck, feed.progress.seenOrder).map((p) => [p.topicId, p])
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
    >
      <Pressable
        onPress={onClose}
        accessibilityLabel="Close topic switcher"
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }}
      />
      <View
        style={{
          backgroundColor: colors.background,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          paddingTop: space.gap,
          paddingBottom: insets.bottom + space.gap,
          maxHeight: '72%',
        }}
      >
        <View
          style={{
            alignSelf: 'center',
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.rule,
            marginBottom: space.gap,
          }}
        />
        <Text
          style={{
            color: colors.textMuted,
            fontSize: typography.label.size,
            fontWeight: typography.label.weight,
            letterSpacing: typography.label.letterSpacing,
            textTransform: 'uppercase',
            paddingHorizontal: space.screenX,
            marginBottom: 6,
          }}
        >
          Switch topic
        </Text>

        <ScrollView>
          {feed.libraryDeck.topics.map((topic) => {
            const p = progressByTopic.get(topic.id) ?? { seen: 0, total: topic.cardIds.length };
            const resume = resumeOptionFor(feed.position, topic, feed.libraryDeck);
            const active = topic.id === feed.activeTopicId;
            const finished = p.total > 0 && p.seen === p.total;

            const hint = resume
              ? `Continue from ${resume.ordinal} / ${resume.total}`
              : finished
                ? 'Read — start again'
                : p.seen > 0
                  ? 'Start from the top'
                  : 'Not started';

            return (
              <Pressable
                key={topic.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${topic.title}. ${hint}.`}
                onPress={() => {
                  if (!active) feed.openTopic(topic.id);
                  onClose();
                }}
                style={({ pressed }) => ({
                  paddingHorizontal: space.screenX,
                  paddingVertical: 14,
                  backgroundColor: pressed ? colors.surface : 'transparent',
                })}
              >
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}
                >
                  <Text
                    style={{
                      flex: 1,
                      color: colors.text,
                      fontSize: 17,
                      fontWeight: active ? '700' : '500',
                    }}
                  >
                    {topic.title}
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
                <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 3 }}>
                  {active ? 'Reading now' : hint}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}
