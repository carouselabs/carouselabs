import { Instrument_Sans, Instrument_Serif } from "next/font/google"

// The anantgoyal.in pair, used on every page: Instrument Sans for everything,
// Instrument Serif italics for one phrase in a big heading (font-display /
// .serif-accent). app/layout.tsx puts both variables on <html>, so menus and
// dialogs rendered outside a page's wrapper get them too; `fontVariables` is
// still exported for wrappers that set them explicitly.
export const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
  display: "swap",
})

// Display face for a few large phrases only — never for labels, buttons,
// tables, app headings or body text.
export const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
})

export const fontVariables = `${instrumentSans.variable} ${instrumentSerif.variable}`

/** The UI face's real family name, for raw CSS (body styles in layouts). */
export const uiFontFamily = `${instrumentSans.style.fontFamily},system-ui,sans-serif`
