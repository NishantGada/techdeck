import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { Volatility } from '../content/types';
import { useTheme } from '../theme/ThemeContext';
import { Pill } from './Pill';

/**
 * A quiet marker that a card describes a product default rather than a principle.
 * Tapping reveals the caveat inline; nothing about it should pull the eye.
 */
export function VolatilityBadge({ volatility }: { volatility: Volatility }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${volatility.label}. Tap for details.`}
        hitSlop={8}
      >
        <Pill label={volatility.label} />
      </Pressable>
      {open ? (
        <Text
          style={{
            color: colors.textMuted,
            fontSize: 12.5,
            lineHeight: 18,
            marginTop: 6,
          }}
        >
          This describes a specific product or default and may have changed. Last verified{' '}
          {volatility.lastVerified}.
        </Text>
      ) : null}
    </View>
  );
}
