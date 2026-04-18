/**
 * Performance East brand palette.
 *
 * `peRed.500` is the canonical brand color (#E31C2F — the red in the
 * racing-style PE logo). The full 50–950 scale is derived along OKLCH
 * lightness steps so tints and shades stay perceptually even. Apps consume
 * this via the Tailwind preset in `@pe/config/tailwind`.
 *
 * History: v0 of the platform used PE Blue (#1F4E78) as the primary before
 * we reconciled with the consumer-facing brand. The legacy blue survives as
 * `peNavy` so it can still be pulled in as an accent (used today by the
 * Sales department badge — chrome + navy + red echoes the logo itself).
 */

export const peRed = {
  50: '#FEF2F3',
  100: '#FDE3E5',
  200: '#FBC5C9',
  300: '#F79098',
  400: '#EF525D',
  500: '#E31C2F',
  600: '#C41224',
  700: '#A20D1B',
  800: '#820B16',
  900: '#601017',
  950: '#3C0308',
} as const;

export type PeRedScale = typeof peRed;

/** Legacy PE Blue, retained as an accent token (not the primary). */
export const peNavy = '#1F4E78';

/** Semantic aliases so app code doesn't hard-code the numeric scale. */
export const semantic = {
  primary: peRed[500],
  primaryHover: peRed[600],
  primaryActive: peRed[700],
  onPrimary: '#FFFFFF',
} as const;
