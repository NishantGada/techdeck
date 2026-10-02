import type { ColorValue } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

export type TabIconName = 'feed' | 'topics' | 'settings';

interface Props {
  name: TabIconName;
  color: ColorValue;
  focused: boolean;
}

/**
 * Hand-drawn line icons rather than an icon pack: three glyphs do not justify a
 * dependency, and drawing them here keeps them consistent with the card diagrams.
 * The active tab thickens the stroke instead of switching to a filled variant.
 */
export function TabIcon({ name, color, focused }: Props) {
  const width = focused ? 2.1 : 1.6;
  const common = { stroke: color, strokeWidth: width, strokeLinecap: 'round' as const };

  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      {name === 'feed' ? (
        <>
          {/* a card, with one stacked behind it */}
          <Line x1={7} y1={4.5} x2={17} y2={4.5} {...common} />
          <Rect
            x={3.75}
            y={8}
            width={16.5}
            height={11.5}
            rx={2.5}
            stroke={color}
            strokeWidth={width}
          />
        </>
      ) : null}

      {name === 'topics' ? (
        <>
          <Circle cx={4.9} cy={6.6} r={1.15} fill={color} />
          <Line x1={9.2} y1={6.6} x2={20} y2={6.6} {...common} />
          <Circle cx={4.9} cy={12} r={1.15} fill={color} />
          <Line x1={9.2} y1={12} x2={20} y2={12} {...common} />
          <Circle cx={4.9} cy={17.4} r={1.15} fill={color} />
          <Line x1={9.2} y1={17.4} x2={20} y2={17.4} {...common} />
        </>
      ) : null}

      {name === 'settings' ? (
        <>
          <Path d="M4 8.5 H20" {...common} />
          <Circle cx={15} cy={8.5} r={2.5} fill="none" stroke={color} strokeWidth={width} />
          <Path d="M4 15.5 H20" {...common} />
          <Circle cx={9} cy={15.5} r={2.5} fill="none" stroke={color} strokeWidth={width} />
        </>
      ) : null}
    </Svg>
  );
}
