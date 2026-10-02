import type { ColorValue } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/**
 * Drawn rather than typed. The "⌄" character (U+2304) sits high and small in its em box
 * and lands visibly off-centre next to uppercase text; an SVG lets the box be centred
 * exactly against the label.
 */
export function ChevronDown({ color, size = 13 }: { color: ColorValue; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path
        d="M3.5 6.25 L8 10.5 L12.5 6.25"
        stroke={color}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
