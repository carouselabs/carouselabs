import type { ReactNode } from "react"
import { fontVariables, uiFontFamily } from "@/lib/fonts"

/** The full-height light canvas every signed-in page sits on. */
export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <div
      data-theme="light"
      className={`${fontVariables} flex h-dvh flex-col overflow-hidden bg-background font-ui text-foreground`}
    >
      {/* The root layout sets a dark body background; keep the app on its
          canvas. The font goes on body too so menus and dialogs (rendered
          outside this wrapper) match the page. */}
      <style
        // Raw so the font name's quotes aren't HTML-escaped inside the CSS.
        dangerouslySetInnerHTML={{
          __html: `body{background-color:#F4F3FC;color:#100C33;font-family:${uiFontFamily}}`,
        }}
      />
      {children}
    </div>
  )
}
