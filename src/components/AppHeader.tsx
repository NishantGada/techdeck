import Constants from 'expo-constants';
import { Pressable, Text, View } from 'react-native';
import { ChevronDown } from './ChevronDown';
import { useTheme } from '../theme/ThemeContext';
import { space, typography } from '../theme/theme';

/** Single source of truth: whatever app.json says the app is called. */
export const APP_NAME = Constants.expoConfig?.name ?? 'Techdeck';

/**
 * A slim bar across the top of every tab. Deliberately shallow — on the feed it costs
 * the card real estate, so it carries the name and nothing else.
 */
export function AppHeader({
  trailing,
  onPressTrailing,
}: {
  trailing?: string;
  /** When set, the trailing label becomes a button (used to switch topics). */
  onPressTrailing?: () => void;
}) {
  const { colors } = useTheme();

  const labelStyle = {
    color: onPressTrailing ? colors.text : colors.textMuted,
    fontSize: typography.label.size,
    fontWeight: typography.label.weight,
    letterSpacing: typography.label.letterSpacing,
    textTransform: 'uppercase' as const,
  };

  // The chevron sits in its own Text outside the truncating one. Inside it, a long topic
  // title would ellipsis the chevron away — hiding the only hint that this is tappable.
  const label = trailing ? (
    <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
      <Text numberOfLines={1} ellipsizeMode="tail" style={[labelStyle, { flexShrink: 1 }]}>
        {trailing}
      </Text>
      {onPressTrailing ? (
        <View
          style={{
            flexShrink: 0,
            // letterSpacing already leaves a gap after the final character.
            marginLeft: 3,
            // Uppercase text has no descenders, so its optical centre sits slightly above
            // the line box centre; nudge the chevron up to match.
            marginTop: -1,
          }}
        >
          <ChevronDown color={labelStyle.color} />
        </View>
      ) : null}
    </View>
  ) : null;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: space.screenX,
        paddingTop: 4,
        paddingBottom: 10,
      }}
    >
      <Text
        accessibilityRole="header"
        style={{
          color: colors.text,
          flexShrink: 0,
          fontSize: 13,
          fontWeight: '700',
          letterSpacing: 1.8,
          textTransform: 'uppercase',
        }}
      >
        {APP_NAME}
      </Text>
      {onPressTrailing && trailing ? (
        <Pressable
          onPress={onPressTrailing}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Reading ${trailing}. Tap to switch topic.`}
          style={({ pressed }) => ({ flexShrink: 1, opacity: pressed ? 0.5 : 1 })}
        >
          {label}
        </Pressable>
      ) : (
        <View style={{ flexShrink: 1 }}>{label}</View>
      )}
    </View>
  );
}
