import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { QuizQuestion } from '../content/types';
import { useTheme } from '../theme/ThemeContext';
import { space, typography } from '../theme/theme';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

interface Props {
  question: QuizQuestion;
  /** Null until the reader answers; the feed locks paging while it is null. */
  selectedOptionId: string | null;
  onSelect: (optionId: string) => void;
  width: number;
  height: number;
}

export function QuizCardView({ question, selectedOptionId, onSelect, width, height }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const answered = selectedOptionId !== null;

  const reveal = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!answered) {
      reveal.setValue(0);
      return;
    }
    Animated.timing(reveal, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [answered, reveal]);

  return (
    <View
      style={{
        width,
        height,
        paddingHorizontal: space.screenX,
        paddingTop: space.screenY,
        paddingBottom: Math.max(insets.bottom, space.screenY),
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
        Quiz
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
        {question.prompt}
      </Text>

      <View style={{ marginTop: space.gap * 1.5, gap: 10 }}>
        {question.options.map((option, i) => {
          const isCorrect = option.id === question.correctOptionId;
          const isChosen = option.id === selectedOptionId;
          const showCorrect = answered && isCorrect;
          const showWrong = answered && isChosen && !isCorrect;

          const background = showCorrect
            ? colors.successSurface
            : showWrong
              ? colors.errorSurface
              : colors.surface;
          const foreground = showCorrect ? colors.success : showWrong ? colors.error : colors.text;

          return (
            <Pressable
              key={option.id}
              disabled={answered}
              onPress={() => onSelect(option.id)}
              accessibilityRole="button"
              accessibilityState={{ disabled: answered, selected: isChosen }}
              accessibilityLabel={`${LETTERS[i] ?? option.id}. ${option.text}`}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                backgroundColor: background,
                borderRadius: 8,
                paddingVertical: 13,
                paddingHorizontal: 14,
                gap: 12,
              }}
            >
              <Text
                style={{
                  color: showCorrect || showWrong ? foreground : colors.textMuted,
                  fontSize: typography.option.size,
                  lineHeight: typography.option.lineHeight,
                  fontWeight: '600',
                  width: 16,
                }}
              >
                {LETTERS[i] ?? option.id.toUpperCase()}
              </Text>
              <Text
                style={{
                  flex: 1,
                  color: foreground,
                  fontSize: typography.option.size,
                  lineHeight: typography.option.lineHeight,
                }}
              >
                {option.text}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {answered ? (
        <Animated.View
          style={{
            marginTop: space.gap * 1.2,
            opacity: reveal,
            transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
          }}
        >
          <Text
            style={{
              color: selectedOptionId === question.correctOptionId ? colors.success : colors.error,
              fontSize: typography.label.size,
              fontWeight: typography.label.weight,
              letterSpacing: typography.label.letterSpacing,
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            {selectedOptionId === question.correctOptionId ? 'Correct' : 'Not quite'}
          </Text>
          <Text style={{ color: colors.text, fontSize: 15.5, lineHeight: 23 }}>
            {question.explanation}
          </Text>
        </Animated.View>
      ) : null}

      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Text style={{ color: colors.textMuted, fontSize: 12.5 }}>
          {answered ? 'Swipe up to continue' : 'Choose an answer to continue'}
        </Text>
      </View>
    </View>
  );
}
