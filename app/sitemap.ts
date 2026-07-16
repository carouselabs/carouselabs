import type { MetadataRoute } from "next"
import { niches } from "./(marketing)/for/data"
import { competitors } from "./(marketing)/vs/data"

const BASE_URL = "https://carouselabs.com"

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/refund`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ]

  const nicheRoutes: MetadataRoute.Sitemap = niches.map((niche) => ({
    url: `${BASE_URL}/for/${niche.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }))

  const ideasRoutes: MetadataRoute.Sitemap = niches.map((niche) => ({
    url: `${BASE_URL}/ideas/${niche.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }))

  // High-intent buyer comparison pages — higher priority than niche pages.
  const versusRoutes: MetadataRoute.Sitemap = competitors.map((competitor) => ({
    url: `${BASE_URL}/vs/${competitor.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.9,
  }))

  return [...staticRoutes, ...nicheRoutes, ...ideasRoutes, ...versusRoutes]
}
