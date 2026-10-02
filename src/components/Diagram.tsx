import { useMemo } from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import type { Diagram as DiagramData } from '../content/types';

/** width / height from the viewBox, so the diagram keeps its intended proportions. */
export function aspectRatioOf(svg: string, fallback = 16 / 9): number {
  const match = /viewBox\s*=\s*"([^"]+)"/.exec(svg);
  if (!match) return fallback;
  const parts = match[1].trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return fallback;
  const [, , w, h] = parts;
  if (w <= 0 || h <= 0) return fallback;
  return w / h;
}

interface Props {
  diagram: DiagramData;
  /** Full card width. */
  width: number;
  /** Theme text colour: the SVGs are authored with currentColor throughout. */
  color: string;
  maxHeight: number;
}

export function Diagram({ diagram, width, color, maxHeight }: Props) {
  const ratio = useMemo(() => aspectRatioOf(diagram.svg), [diagram.svg]);
  const height = Math.min(width / ratio, maxHeight);
  const drawWidth = height * ratio;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={diagram.alt}
      style={{ width, height, alignItems: 'center', justifyContent: 'center' }}
    >
      <SvgXml xml={diagram.svg} width={drawWidth} height={height} color={color} />
    </View>
  );
}
