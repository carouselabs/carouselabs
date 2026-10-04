import { test, expect } from "@playwright/test"
import path from "node:path"
import { readFile } from "node:fs/promises"

test.beforeEach(async ({ context, baseURL }) => {
  // Public application behavior, deliberately isolated from analytics/auth providers.
  await context.route("**/*", route => new URL(route.request().url()).origin === baseURL ? route.continue() : route.abort())
})

test("public homepage loads, stays within viewport, and keyboard links work", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", error => errors.push(error.message))
  const response = await page.goto("/")
  expect(response?.status()).toBe(200)
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Create viral content for every platform")
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole("link", { name: "See how it works", exact: true }).focus()
  await page.keyboard.press("Enter")
  await expect(page).toHaveURL(/#how-it-works$/)
  await expect.poll(() => page.locator('img[src="/icon.png"]').evaluateAll(images => images.length === 2 && images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true)
  expect(errors).toEqual([])
})

test("public headers and cookie mutation origin protection", async ({ request }) => {
  const page = await request.get("/terms")
  expect(page.status()).toBe(200)
  expect(page.headers()["x-content-type-options"]).toBe("nosniff")
  expect(page.headers()["content-security-policy"]).toContain("frame-ancestors 'none'")
  const attack = await request.post("/api/posts", { headers: { origin: "https://attacker.example" }, data: {} })
  expect(attack.status()).toBe(403)
  const privateResponse = await request.get("/api/ext/me")
  expect([401,403]).toContain(privateResponse.status())
  expect(privateResponse.headers()["cache-control"]).toContain("no-store")
})

test("local image editing, invalid file recovery and PNG/WebP downloads", async ({ page }, testInfo) => {
  await page.goto("/tools/tap-hold-maker")
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Tap & Hold Image Maker")
  await page.getByRole("button", { name: "Choose an image", exact: true }).focus()
  await expect(page.getByRole("button", { name: "Choose an image", exact: true })).toBeFocused()
  const input = page.locator('input[type="file"]')
  await input.setInputFiles({ name: "broken.png", mimeType: "image/png", buffer: Buffer.from("not an image") })
  await expect(page.getByRole("status")).toContainText(/couldn't be opened|corrupted/)
  await input.setInputFiles(path.resolve("public/images/msedge_GxpOUT38VY.png"))
  await expect(page.getByRole("button", { name: "Download for X", exact: true })).toBeVisible()
  const canvas=page.locator("canvas").first()
  await expect(canvas).toBeVisible()
  // Actionability scrolls the drawing surface into view before raw pointer input.
  await canvas.hover()
  const dimensions = await canvas.evaluate(element => ({ width: (element as HTMLCanvasElement).width, height: (element as HTMLCanvasElement).height }))
  const box=await canvas.boundingBox()
  if (!box) throw new Error("Editor canvas unavailable")
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2)
  await page.mouse.down()
  await page.mouse.move(box.x+box.width/2+20,box.y+box.height/2+20)
  await page.mouse.up()
  await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeEnabled()
  await page.getByRole("button", { name: "Undo", exact: true }).click()
  await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeDisabled()
  const downloadPromise=page.waitForEvent("download")
  await page.getByRole("button", { name: "WebP", exact: true }).click()
  const download=await downloadPromise
  expect(await download.failure()).toBeNull()
  expect(download.suggestedFilename()).toMatch(/\.webp$/)
  await download.saveAs(testInfo.outputPath("export.webp"))
  const pngPromise = page.waitForEvent("download")
  await page.getByRole("button", { name: "Download for X", exact: true }).click()
  const png = await pngPromise
  expect(await png.failure()).toBeNull()
  expect(png.suggestedFilename()).toMatch(/\.png$/)
  const pngPath = testInfo.outputPath("export.png")
  await png.saveAs(pngPath)
  const bytes = await readFile(pngPath)
  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a")
  expect(bytes.readUInt32BE(16)).toBe(2432)
  expect(bytes.readUInt32BE(20)).toBe(Math.round(dimensions.height / dimensions.width * 2432))
  expect(bytes[25]).toBe(3) // Indexed palette, preserving the X export contract.
  const decoded = await page.evaluate(async base64 => {
    const bitmap = await createImageBitmap(await (await fetch("data:image/png;base64," + base64)).blob())
    const size = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return size
  }, bytes.toString("base64"))
  expect(decoded).toEqual({ width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) })

  await page.screenshot({path:testInfo.outputPath("editor.png"),fullPage:false})
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
