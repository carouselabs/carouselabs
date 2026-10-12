import { ImageResponse } from "next/og"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

// Link-preview image for the marketing pages. Uses the current logo and the
// current headline — no unapproved copy.
export const alt = "CarouseLabs — Create viral content for every platform"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function OpengraphImage() {
  const logo = await readFile(join(process.cwd(), "app/icon.png"))
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#F9F7F2", color: "#211F1C", padding: 72 }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 640 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} width={52} height={52} alt="" />
            <span style={{ fontSize: 34, fontWeight: 600, letterSpacing: -1 }}>CarouseLabs</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <span style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.02, letterSpacing: -3 }}>Create viral content for every platform</span>
            <span style={{ fontSize: 28, color: "#67625B", lineHeight: 1.35 }}>AI-native social media content studio. Create carousels, captions, and posts for LinkedIn, Instagram, and Twitter/X in seconds.</span>
          </div>
        </div>
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
          <div style={{ display: "flex", position: "relative", width: 330, height: 412 }}>
            <div style={{ position: "absolute", left: 34, top: 18, width: 300, height: 375, borderRadius: 20, background: "#F0ECE5", border: "2px solid #DED8CD", transform: "rotate(6deg)" }} />
            <div style={{ position: "absolute", left: 16, top: 8, width: 300, height: 375, borderRadius: 20, background: "#FFFFFF", border: "2px solid #DED8CD", transform: "rotate(3deg)" }} />
            <div style={{ position: "absolute", left: 0, top: 0, width: 300, height: 375, borderRadius: 20, background: "#211F1C", color: "#FFFDF9", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, opacity: 0.7 }}>
                <span>Carousel</span>
                <span>1/8</span>
              </div>
              <span style={{ fontSize: 40, lineHeight: 1.05, letterSpacing: -1 }}>Day two decides everything.</span>
              <span style={{ fontSize: 16, opacity: 0.7 }}>Example</span>
            </div>
          </div>
        </div>
      </div>
    ),
    size
  )
}
