/**
 * Performance East brand palette.
 *
 * `peBlue.500` is the canonical brand color (#1F4E78). The full 50–950 scale is
 * derived along OKLCH lightness steps so tints and shades stay perceptually
 * even. Apps consume this via the Tailwind preset in `@pe/config/tailwind`.
 */

export const peBlue = {
  50: '#F0F5FB',
  100: '#DCE8F3',
  200: '#B8D0E5',
  300: '#8BB2D1',
  400: '#5C8BB8',
  500: '#1F4E78',
  600: '#1A426A',
  700: '#143759',
  800: '#0F2B47',
  900: '#0A2036',
  950: '#051527',
} as const;

export type PeBlueScale = typeof peBlue;

/** Semantic aliases so app code doesn't hard-code the numeric scale. */
export const semantic = {
  primary: peBlue[500],
  primaryHover: peBlue[600],
  primaryActive: peBlue[700],
  onPrimary: '#FFFFFF',
} as const;
