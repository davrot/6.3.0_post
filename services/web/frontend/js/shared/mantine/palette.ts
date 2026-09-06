/**
 * OlliTeX brand palette for Mantine 9 (primaryColor key: 'ollitex').
 *
 * Source of truth: frontend/stylesheets/olkit.scss
 *   light primary = hsl(217 47% 38%) (~#28518f), dark primary = hsl(217 75% 62%)
 * Mantine shades: index 0 lightest … 9 darkest; `primaryShade: 6` is Mantine's
 * default "primary" index — shade 6 lands on the brand deep blue in light mode.
 *
 * All HSL channels kept on hue 217 for a single-hue ramp.
 */
export const OLLITEX_BLUE: string[] = [
  'hsl(217, 60%, 96%)', // 0
  'hsl(217, 50%, 88%)', // 1
  'hsl(217, 48%, 78%)', // 2
  'hsl(217, 50%, 68%)', // 3
  'hsl(217, 52%, 58%)', // 4
  'hsl(217, 54%, 50%)', // 5
  'hsl(217, 47%, 38%)', // 6 — brand deep blue (light theme)
  'hsl(217, 55%, 32%)', // 7
  'hsl(217, 60%, 26%)', // 8
  'hsl(217, 65%, 18%)', // 9
]

export const OLLITEX_RADIUS = 8 // px — olkit --kit-radius 0.5rem
