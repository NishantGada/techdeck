import { useRef } from 'react';
import { Animated, Easing, Pressable, type GestureResponderEvent } from 'react-native';

type Handler = ((e: GestureResponderEvent) => void) | null | undefined;

/** Loosely typed on purpose: react-navigation hands the tab button nullable handlers. */
interface Props {
  children?: React.ReactNode;
  onPress?: Handler;
  onLongPress?: Handler;
  accessibilityState?: { selected?: boolean };
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * Replaces the default tab button so a press has some physical feedback: the icon and
 * label dip slightly under the finger and spring back. Short and non-looping — it reads
 * as responsiveness, not decoration.
 */
export function TabBarButton({
  children,
  onPress,
  onLongPress,
  accessibilityState,
  accessibilityLabel,
  testID,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (to: number) => {
    Animated.timing(scale, {
      toValue: to,
      duration: to === 1 ? 160 : 90,
      easing: to === 1 ? Easing.out(Easing.quad) : Easing.linear,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress ?? undefined}
      onLongPress={onLongPress ?? undefined}
      onPressIn={() => animate(0.9)}
      onPressOut={() => animate(1)}
      accessibilityRole="tab"
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View
        style={{ alignItems: 'center', justifyContent: 'center', transform: [{ scale }] }}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}
