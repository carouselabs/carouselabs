// The 48 looks shown after "Skip, generate without reference": every one has
// its two pictures, and every reference picture passes the same server check an
// uploaded reference does (lib/validateImage.ts), at the upload compressor's size.
import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { LOOK_CATEGORIES, STYLE_LOOKS, lookById, lookImagePath, lookThumbPath } from "@/lib/styleLooks"
import { validateReferenceImage } from "@/lib/validateImage"

const publicFile = (p: string) => path.join(process.cwd(), "public", p)

// Width and height from a baseline or progressive JPEG's SOF marker.
function jpegSize(buf: Buffer): { width: number; height: number } {
  let i = 2
  while (i < buf.length) {
    const marker = buf[i + 1]
    const length = buf.readUInt16BE(i + 2)
    if (marker >= 0xc0 && marker <= 0xc3) return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) }
    i += 2 + length
  }
  throw new Error("no size marker")
}

describe("the 48 looks", () => {
  it("are 48, each with its own id, in one of the categories, with every category used", () => {
    expect(STYLE_LOOKS).toHaveLength(48)
    expect(new Set(STYLE_LOOKS.map((l) => l.id)).size).toBe(48)
    expect(new Set(STYLE_LOOKS.map((l) => l.name)).size).toBe(48)
    for (const look of STYLE_LOOKS) expect(LOOK_CATEGORIES).toContain(look.category)
    for (const category of LOOK_CATEGORIES) expect(STYLE_LOOKS.some((l) => l.category === category)).toBe(true)
    expect(lookById("dark-premium")?.name).toBe("Dark Premium")
    expect(lookById("nope")).toBeNull()
  })

  it("each have a reference picture the server accepts, at the upload size, and a thumbnail", () => {
    for (const look of STYLE_LOOKS) {
      const ref = fs.readFileSync(publicFile(lookImagePath(look.id)))
      const check = validateReferenceImage(ref.toString("base64"), "image/jpeg")
      expect(check.ok, look.id).toBe(true)
      expect(jpegSize(ref), look.id).toEqual({ width: 819, height: 1024 })
      expect(ref.length, look.id).toBeLessThan(400 * 1024)

      const thumb = fs.readFileSync(publicFile(lookThumbPath(look.id)))
      expect(jpegSize(thumb), look.id).toEqual({ width: 360, height: 450 })
      expect(thumb.length, look.id).toBeLessThan(80 * 1024)
    }
  })

  it("has no stray pictures beyond the 48", () => {
    const refs = fs.readdirSync(publicFile("images/looks")).filter((f) => f.endsWith(".jpg"))
    const thumbs = fs.readdirSync(publicFile("images/looks/thumbs"))
    expect(refs.sort()).toEqual(STYLE_LOOKS.map((l) => `${l.id}.jpg`).sort())
    expect(thumbs.sort()).toEqual(STYLE_LOOKS.map((l) => `${l.id}.jpg`).sort())
  })
})
