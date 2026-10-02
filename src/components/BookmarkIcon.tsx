import type { ColorValue } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const RIBBON = 'M6.75 3.9 H17.25 V20.1 L12 16.6 L6.75 20.1 Z';

interface Props {
  filled: boolean;
  color: ColorValue;
  size?: number;
}

/** Outline when unsaved, solid when saved — the whole state change in one glyph. */
export function BookmarkIcon({ filled, color, size = 20 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d={RIBBON}
        stroke={color}
        strokeWidth={filled ? 1.6 : 1.5}
        strokeLinejoin="round"
        fill={filled ? color : 'none'}
      />
    </Svg>
  );
}
