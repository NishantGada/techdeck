import { useCallback, useRef, useState } from 'react';
import { Text, View, type LayoutChangeEvent, type StyleProp, type TextStyle } from 'react-native';

interface Props {
  text: string;
  maxFontSize: number;
  minFontSize: number;
  lineHeightRatio: number;
  color: string;
  style?: StyleProp<TextStyle>;
}

/**
 * Body text must never scroll or clip. This measures the space it was given and, if the
 * text overruns, steps the size down — scaled by the overflow ratio, so it settles in one
 * or two frames rather than creeping down a point at a time.
 */
export function FitText({ text, maxFontSize, minFontSize, lineHeightRatio, color, style }: Props) {
  const [fontSize, setFontSize] = useState(maxFontSize);
  const available = useRef<number | null>(null);
  // Once a given text has been fitted into a given height, stop measuring.
  const settledFor = useRef<string | null>(null);

  const onContainerLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const height = e.nativeEvent.layout.height;
      if (height <= 0 || available.current === height) return;
      available.current = height;
      settledFor.current = null;
      setFontSize(maxFontSize);
    },
    [maxFontSize]
  );

  const onTextLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const space = available.current;
      if (space === null) return;

      const key = `${text}@${space}`;
      if (settledFor.current === key) return;

      const height = e.nativeEvent.layout.height;
      if (height <= space) {
        settledFor.current = key;
        return;
      }
      if (fontSize <= minFontSize) {
        settledFor.current = key;
        return;
      }

      const scaled = Math.max(minFontSize, Math.floor(fontSize * (space / height) * 10) / 10);
      // Always move by at least a notch, otherwise rounding can stall the loop.
      const next = scaled >= fontSize ? fontSize - 0.5 : scaled;
      setFontSize(Math.max(minFontSize, next));
    },
    [text, fontSize, minFontSize]
  );

  return (
    <View style={{ flex: 1, justifyContent: 'flex-start', overflow: 'hidden' }} onLayout={onContainerLayout}>
      <Text
        onLayout={onTextLayout}
        style={[style, { color, fontSize, lineHeight: Math.round(fontSize * lineHeightRatio) }]}
      >
        {text}
      </Text>
    </View>
  );
}
