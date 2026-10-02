import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/theme';

interface Props {
  label: string;
  tone?: 'muted' | 'plain';
  style?: StyleProp<ViewStyle>;
}

export function Pill({ label, tone = 'muted', style }: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: tone === 'muted' ? colors.surface : 'transparent',
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 4,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <Text
        style={{
          color: colors.textMuted,
          fontSize: typography.pill.size,
          fontWeight: typography.pill.weight,
          letterSpacing: typography.pill.letterSpacing,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
    </View>
  );
}
