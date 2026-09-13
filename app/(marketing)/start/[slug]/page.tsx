import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { StartPageView } from "@/components/startpage/StartPageView"
import type { StartPageTheme } from "@/lib/startPage"

// Public — always fresh (a link added seconds ago, or an updated bio, must
// show immediately; see proxy.ts's public route list for the auth exemption).
export const dynamic = "force-dynamic"

async function getStartPage(slug: string) {
  return db.startPage.findUnique({
    where: { slug },
    include: { links: { orderBy: { order: "asc" } } },
  })
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const startPage = await getStartPage(slug)
  if (!startPage) return {}

  const title = startPage.title || `@${startPage.slug}`
  return {
    title: `${title} — CarouseLabs Start Page`,
    description: startPage.bio || `${title}'s links, all in one place.`,
  }
}

export default async function StartPagePublic({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const startPage = await getStartPage(slug)
  if (!startPage) notFound()

  return (
    <StartPageView
      title={startPage.title}
      bio={startPage.bio}
      avatarUrl={startPage.avatarUrl}
      theme={startPage.theme as StartPageTheme}
      slug={startPage.slug}
      links={startPage.links}
    />
  )
}
