import { Pressable } from 'react-native';
import { useBookmarks } from '../state/BookmarksContext';
import { useTheme } from '../theme/ThemeContext';
import { BookmarkIcon } from './BookmarkIcon';

/**
 * Reads the bookmark state itself rather than taking it as a prop, so saving a card
 * re-renders this button and nothing else in the feed.
 */
export function BookmarkToggle({ cardId, title }: { cardId: string; title: string }) {
  const { colors } = useTheme();
  const { isBookmarked, toggle } = useBookmarks();
  const saved = isBookmarked(cardId);

  return (
    <Pressable
      onPress={() => toggle(cardId)}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityState={{ selected: saved }}
      accessibilityLabel={saved ? `Remove bookmark from ${title}` : `Bookmark ${title}`}
      style={({ pressed }) => ({ opacity: pressed ? 0.45 : 1 })}
    >
      <BookmarkIcon filled={saved} color={saved ? colors.text : colors.textMuted} />
    </Pressable>
  );
}
