import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Teach tailwind-merge the redesign's named scales (app/globals.css). Without
// this, an unknown `text-body` is read as a text color and a later
// `text-foreground` silently removes it.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["caption", "label", "body", "body-lg", "lead", "title-sm", "title", "section", "display"],
      radius: ["detail", "control-sm", "control", "card", "showcase"],
      shadow: ["card", "popover", "dialog"],
      container: ["form", "reading", "marketing", "showcase"],
      ease: ["entry", "standard", "exit"],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
