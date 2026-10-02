import { View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

/** A hairline showing position within the current topic. Nothing else. */
export function TopicProgressBar({ position, total }: { position: number; total: number }) {
  const { colors } = useTheme();
  const fraction = total > 0 ? Math.min(1, Math.max(0, position / total)) : 0;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: position }}
      style={{ height: 2, backgroundColor: colors.progressTrack }}
    >
      <View
        style={{
          height: 2,
          width: `${fraction * 100}%`,
          backgroundColor: colors.progressFill,
        }}
      />
    </View>
  );
}
