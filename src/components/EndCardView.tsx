import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { space, typography } from '../theme/theme';

interface Props {
  topicTitle: string;
  onRestart: () => void;
  onBackToTopics: () => void;
  /** The next topic in prerequisite order that still has unread cards, if any. */
  next: { title: string; onPress: () => void } | null;
  width: number;
  height: number;
}

function Button({
  label,
  onPress,
  tone,
}: {
  label: string;
  onPress: () => void;
  tone: 'primary' | 'quiet';
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        alignSelf: 'flex-start',
        backgroundColor: tone === 'primary' ? colors.surface : 'transparent',
        borderRadius: 8,
        paddingVertical: 13,
        paddingHorizontal: tone === 'primary' ? 20 : 0,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text
        style={{
          color: tone === 'primary' ? colors.text : colors.textMuted,
          fontSize: 16,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function EndCardView({
  topicTitle,
  onRestart,
  onBackToTopics,
  next,
  width,
  height,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        width,
        height,
        paddingHorizontal: space.screenX,
        paddingTop: space.screenY,
        paddingBottom: Math.max(insets.bottom, space.screenY),
        justifyContent: 'center',
      }}
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
        End of topic
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
        That is all of {topicTitle}.
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: 15.5, lineHeight: 23, marginTop: 10 }}>
        Reading it again keeps everything you have read, answered and bookmarked.
      </Text>

      <View style={{ marginTop: space.gap * 1.6, gap: 4 }}>
        {next ? <Button label={`Next: ${next.title}`} onPress={next.onPress} tone="primary" /> : null}
        <Button
          label={next ? 'Read this topic again' : 'Read it again'}
          onPress={onRestart}
          tone={next ? 'quiet' : 'primary'}
        />
        <Button label="Back to topics" onPress={onBackToTopics} tone="quiet" />
      </View>
    </View>
  );
}
