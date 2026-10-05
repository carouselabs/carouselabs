import { lookup } from "node:dns/promises"
import { request as httpRequest } from "node:http"
import { request as httpsRequest } from "node:https"
import { BlockList, isIP } from "node:net"

const blockedV4 = new BlockList()
for (const [network, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15],
  ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) blockedV4.addSubnet(network, prefix, "ipv4")

const globalV6 = new BlockList()
globalV6.addSubnet("2000::", 3, "ipv6")
const blockedV6 = new BlockList()
for (const [network, prefix] of [
  ["2001::", 23], ["2001:db8::", 32], ["2002::", 16], ["3fff::", 20],
] as const) blockedV6.addSubnet(network, prefix, "ipv6")

export function isPublicAddress(address: string): boolean {
  const family = isIP(address)
  if (family === 4) return !blockedV4.check(address, "ipv4")
  // An allowlist of global unicast also excludes mapped IPv4, loopback,
  // unique-local, link-local, multicast and NAT64 translation addresses.
  return family === 6 && globalV6.check(address, "ipv6") && !blockedV6.check(address, "ipv6")
}

function parseExternalUrl(raw: string): URL {
  if (typeof raw !== "string" || raw.length > 4096) throw new Error("Invalid image URL")
  const url = new URL(raw)
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase()
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      (url.port && url.port !== "80" && url.port !== "443") ||
      host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") ||
      (isIP(host) !== 0 && !isPublicAddress(host))) {
    throw new Error("Invalid or unsafe image URL")
  }
  return url
}

// A synchronous preflight only. fetchPublicImage performs DNS checks too.
export function isSafeExternalUrl(raw: string): boolean {
  try { parseExternalUrl(raw); return true } catch { return false }
}

async function resolvePublicHost(url: URL) {
  const host = url.hostname.replace(/^\[|\]$/g, "")
  const family = isIP(host)
  const addresses = family ? [{ address: host, family }] : await lookup(host, { all: true, verbatim: true })
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new Error("Invalid or unsafe image URL")
  }
  return addresses[0]
}

type ImageResponse = { bytes: Buffer; mediaType: string }
type HopResponse = ImageResponse | { redirect: string }

// DNS resolution is checked for every redirect and the socket is pinned to
// the approved address. Checking DNS then calling fetch(url) would be racy:
// a second lookup could point the connection back into the private network.
export async function fetchPublicImage(
  raw: string,
  { maxBytes = 20 * 1024 * 1024, timeoutMs = 10_000, allowedOrigin }: {
    maxBytes?: number; timeoutMs?: number; allowedOrigin?: string
  } = {},
): Promise<ImageResponse> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    let url = parseExternalUrl(raw)
    for (let hop = 0; hop <= 3; hop++) {
      if (allowedOrigin && url.origin !== allowedOrigin) throw new Error("Invalid image URL")
      const approved = await Promise.race([
        resolvePublicHost(url),
        new Promise<never>((_, reject) => {
          if (controller.signal.aborted) reject(new Error("Image request timed out"))
          else controller.signal.addEventListener("abort", () => reject(new Error("Image request timed out")), { once: true })
        }),
      ])
      const response = await new Promise<HopResponse>((resolve, reject) => {
        const transport = url.protocol === "https:" ? httpsRequest : httpRequest
        const req = transport(url, {
          agent: false,
          signal: controller.signal,
          family: approved.family,
          lookup: (_host, _options, callback) => callback(null, approved.address, approved.family),
          headers: { Accept: "image/png,image/jpeg,image/webp", "Accept-Encoding": "identity" },
        }, (res) => {
          res.on("error", reject)
          const status = res.statusCode ?? 0
          if ([301, 302, 303, 307, 308].includes(status) && res.headers.location) {
            resolve({ redirect: res.headers.location })
            res.destroy()
            return
          }
          const mediaType = (res.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase()
          if (status < 200 || status >= 300 || !["image/png", "image/jpeg", "image/webp"].includes(mediaType)) {
            reject(new Error("Couldn't fetch a supported image"))
            res.destroy()
            return
          }
          if (Number(res.headers["content-length"] ?? 0) > maxBytes) {
            reject(new Error("Image too large"))
            res.destroy()
            return
          }
          let size = 0
          const chunks: Buffer[] = []
          res.on("data", (chunk: Buffer) => {
            size += chunk.length
            if (size > maxBytes) {
              reject(new Error("Image too large"))
              res.destroy()
            } else chunks.push(chunk)
          })
          res.on("end", () => resolve({ bytes: Buffer.concat(chunks), mediaType }))
        })
        req.on("error", reject)
        req.end()
      })
      if (!("redirect" in response)) return response
      url = parseExternalUrl(new URL(response.redirect, url).href)
    }
    throw new Error("Too many image redirects")
  } catch (err) {
    if (controller.signal.aborted) throw new Error("Timed out fetching that image")
    // Do not surface response bodies, URLs, or internal networking details.
    if (err instanceof Error && /^(Invalid|Image too large|Couldn't fetch|Too many image)/.test(err.message)) throw err
    throw new Error("Couldn't fetch that image")
  } finally {
    clearTimeout(timeout)
  }
}
