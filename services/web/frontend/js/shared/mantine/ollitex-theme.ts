import { createTheme } from '@mantine/core'
import { OLLITEX_BLUE, OLLITEX_RADIUS } from './palette'

/**
 * OlliTeX Mantine 9 theme — one brand, both light and dark.
 *
 * - primaryColor 'ollitex': the brand deep blue (H217), light/dark via
 *   Mantine's colorScheme (bridged to our body[data-theme] in provider.tsx)
 * - typography: the app's existing Noto Sans / DM Mono stack
 * - radius 8px to match the existing kit (--kit-radius 0.5rem)
 */
export const ollitexTheme = createTheme({
  primaryColor: 'ollitex',
  primaryShade: 6,
  colors: { ollitex: OLLITEX_BLUE },
  fontFamily: "'Noto Sans', -apple-system, 'Segoe UI', sans-serif",
  fontFamilyMonospace: "'DM Mono', 'SFMono-Regular', monospace",
  borderRadius: OLLITEX_RADIUS,
  defaultRadius: OLLITEX_RADIUS,
  focusRing: 'auto',
  headings: {
    fontFamily: "'Noto Sans', sans-serif",
    fontWeight: 600,
  },
  other: {
    cursorModifier: 'pointer',
  },
})

export type OllitexTheme = typeof ollitexTheme
