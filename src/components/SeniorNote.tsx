import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/theme';

export function SeniorNote({ note }: { note: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        borderLeftWidth: 2,
        borderLeftColor: colors.rule,
        paddingLeft: 12,
        paddingVertical: 2,
      }}
    >
      <Text
        style={{
          color: colors.textMuted,
          fontSize: typography.pill.size,
          fontWeight: typography.pill.weight,
          letterSpacing: typography.pill.letterSpacing,
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        Why a senior cares
      </Text>
      <Text
        style={{
          color: colors.text,
          fontSize: typography.seniorNote.size,
          lineHeight: typography.seniorNote.lineHeight,
        }}
      >
        {note}
      </Text>
    </View>
  );
}
