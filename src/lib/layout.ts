import { useWindowDimensions, type ViewStyle } from 'react-native';

/**
 * Screen-size aware layout, mostly for the web app (the iPhone app is always "compact").
 *
 * - compact (< 768px): phones, including Safari on iPhone. One column, bottom navigation.
 * - medium (768–1199px): tablets, small windows. Icon sidebar, 2 columns.
 * - wide (≥ 1200px): laptops and desktops. Full sidebar, 3 columns.
 *
 * useWindowDimensions updates as the window is resized, so the layout follows along.
 */
export type LayoutSize = 'compact' | 'medium' | 'wide';

/** How wide a page's content may get: lists use the room, reading pages stay comfortable to read. */
export type PageKind = 'list' | 'reading';

const MAX_WIDTH: Record<PageKind, Record<LayoutSize, number>> = {
  list: { compact: 720, medium: 1100, wide: 1280 },
  reading: { compact: 720, medium: 820, wide: 900 },
};

export function useLayout() {
  const { width } = useWindowDimensions();
  const size: LayoutSize = width >= 1200 ? 'wide' : width >= 768 ? 'medium' : 'compact';
  /** Space between the content and the screen edge. */
  const gutter = size === 'compact' ? 16 : size === 'medium' ? 24 : 32;
  /** Cards per row in lists. */
  const columns = size === 'wide' ? 3 : size === 'medium' ? 2 : 1;

  /** The style for a page's scrolling content: centred, with a sensible max width and side gutters. */
  const page = (kind: PageKind = 'list'): ViewStyle => ({
    width: '100%',
    maxWidth: MAX_WIDTH[kind][size],
    alignSelf: 'center',
    paddingHorizontal: gutter,
  });

  return { size, isCompact: size === 'compact', gutter, columns, page };
}

/** Fill the last row of a grid with empty slots, so its cards keep the same width as the rows above. */
export function padRows<T>(items: T[], columns: number): (T | null)[] {
  const missing = columns > 1 ? (columns - (items.length % columns)) % columns : 0;
  return [...items, ...Array<null>(missing).fill(null)];
}
