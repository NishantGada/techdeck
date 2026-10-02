import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { isBookmarked, removeBookmark, toggleBookmark } from '../feed/bookmarks';
import { loadBookmarks, saveBookmarks } from './storage';

interface BookmarksValue {
  bookmarks: string[];
  ready: boolean;
  isBookmarked: (cardId: string) => boolean;
  toggle: (cardId: string) => void;
  remove: (cardId: string) => void;
}

const BookmarksContext = createContext<BookmarksValue | null>(null);

/**
 * Kept apart from FeedContext on purpose: bookmarks have no bearing on sequencing, so
 * saving one must not cause the feed to retile.
 */
export function BookmarksProvider({ children }: { children: ReactNode }) {
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadBookmarks().then((loaded) => {
      if (cancelled) return;
      setBookmarks(loaded);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Don't write back the empty initial value before the stored list has loaded.
  const readyRef = useRef(false);
  readyRef.current = ready;

  const update = useCallback((next: (prev: string[]) => string[]) => {
    setBookmarks((prev) => {
      const value = next(prev);
      if (readyRef.current) void saveBookmarks(value);
      return value;
    });
  }, []);

  const value = useMemo<BookmarksValue>(
    () => ({
      bookmarks,
      ready,
      isBookmarked: (cardId) => isBookmarked(bookmarks, cardId),
      toggle: (cardId) => update((prev) => toggleBookmark(prev, cardId)),
      remove: (cardId) => update((prev) => removeBookmark(prev, cardId)),
    }),
    [bookmarks, ready, update]
  );

  return <BookmarksContext.Provider value={value}>{children}</BookmarksContext.Provider>;
}

export function useBookmarks(): BookmarksValue {
  const value = useContext(BookmarksContext);
  if (!value) throw new Error('useBookmarks must be used inside BookmarksProvider');
  return value;
}
