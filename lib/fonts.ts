import { Geist, Instrument_Sans, Instrument_Serif } from "next/font/google"

// Redesign fonts. Apply `fontVariables` on a layout's wrapper to opt that
// subtree in; app/globals.css maps them to `font-ui` and `font-display`.
// Pages that haven't migrated don't render these classes, so the fonts are
// neither preloaded nor downloaded there.
export const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
})

// Display face for a few large marketing phrases only — never for labels,
// buttons, tables, app headings or body text.
export const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
})

export const fontVariables = `${geist.variable} ${instrumentSerif.variable}`

// Engage's own face (app/(app)/extension/layout.tsx puts this on the section's
// wrapper; .engage-root in app/globals.css applies it). Instrument Serif comes
// from fontVariables above, which every signed-in page already has.
export const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
  display: "swap",
})
