// Motion tokens for framer-motion and GSAP. The CSS side lives in
// app/globals.css (--motion-* durations, ease-entry / ease-standard /
// ease-exit). Keep both in step.

/** Durations in seconds (framer-motion's unit). */
export const duration = {
  instant: 0,
  fast: 0.12,
  normal: 0.18,
  panel: 0.24,
  reveal: 0.42,
  maximum: 0.6,
} as const

/** Cubic-bezier control points. */
export const ease = {
  entry: [0.22, 1, 0.36, 1],
  standard: [0.4, 0, 0.2, 1],
  exit: [0.4, 0, 1, 1],
} as const
