import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CardRef } from '../content/types';
import { useTheme } from '../theme/ThemeContext';
import { space, typography } from '../theme/theme';
import { BookmarkToggle } from './BookmarkToggle';
import { Diagram } from './Diagram';
import { FitText } from './FitText';
import { Pill } from './Pill';
import { SeniorNote } from './SeniorNote';
import { VolatilityBadge } from './VolatilityBadge';

interface Props {
  cardRef: CardRef;
  review: boolean;
  width: number;
  height: number;
}

export function ContentCardView({ cardRef, review, width, height }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { card } = cardRef;
  const contentWidth = width - space.screenX * 2;

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
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text
          numberOfLines={1}
          style={{
            flexShrink: 1,
            color: colors.textMuted,
            fontSize: typography.label.size,
            fontWeight: typography.label.weight,
            letterSpacing: typography.label.letterSpacing,
            textTransform: 'uppercase',
          }}
        >
          {cardRef.topicTitle}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {review ? <Pill label="Review" /> : null}
          <Text
            style={{
              color: colors.textMuted,
              fontSize: typography.label.size,
              fontWeight: typography.label.weight,
              letterSpacing: typography.label.letterSpacing,
            }}
          >
            {cardRef.ordinalInTopic} / {cardRef.totalInTopic}
          </Text>
          <BookmarkToggle cardId={card.id} title={card.title} />
        </View>
      </View>

      {card.volatility ? (
        <View style={{ marginTop: 10 }}>
          <VolatilityBadge volatility={card.volatility} />
        </View>
      ) : null}

      <Text
        style={{
          color: colors.text,
          fontSize: typography.title.size,
          fontWeight: typography.title.weight,
          lineHeight: typography.title.lineHeight,
          marginTop: space.gap,
        }}
      >
        {card.title}
      </Text>

      {card.diagram ? (
        <View style={{ marginTop: space.gap, alignItems: 'center' }}>
          <Diagram
            diagram={card.diagram}
            width={contentWidth}
            color={colors.text}
            maxHeight={height * 0.26}
          />
        </View>
      ) : null}

      <View style={{ flex: 1, marginTop: space.gap, marginBottom: space.gap }}>
        <FitText
          text={card.body}
          maxFontSize={typography.bodyMax}
          minFontSize={typography.bodyMin}
          lineHeightRatio={typography.bodyLineHeightRatio}
          color={colors.text}
        />
      </View>

      <SeniorNote note={card.seniorNote} />
    </View>
  );
}
