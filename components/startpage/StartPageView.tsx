// components/startpage/StartPageView.tsx — the actual rendered link-in-bio
// content for a public Start Page. Server component (no interactivity needed
// — every link is a plain <a> to the click-tracking redirect route).
import Link from "next/link"
import type { StartPageTheme } from "@/lib/startPage"

interface StartPageViewLink {
  id: string
  label: string
}

interface StartPageViewProps {
  title: string | null
  bio: string | null
  avatarUrl: string | null
  theme: StartPageTheme
  slug: string
  links: StartPageViewLink[]
}

const THEME_STYLES: Record<
  StartPageTheme,
  { page: string; card: string; name: string; bio: string; link: string; footer: string }
> = {
  default: {
    page: "bg-background",
    card: "bg-surface border border-border shadow-popover",
    name: "text-foreground",
    bio: "text-muted-foreground",
    link: "bg-brand hover:bg-brand-hover text-brand-foreground",
    footer: "text-muted-foreground",
  },
  dark: {
    page: "bg-[#0A0A0A]",
    card: "bg-[#141414] border border-[#2A2A2A]",
    name: "text-white",
    bio: "text-[#9CA3AF]",
    link: "bg-[#F59E0B] hover:bg-[#D97706] text-[#0A0A0A]",
    footer: "text-[#9CA3AF]",
  },
  minimal: {
    page: "bg-white",
    card: "bg-white border border-[#E5E3DE]",
    name: "text-[#0A0A0A]",
    bio: "text-[#6B7280]",
    link: "bg-white border border-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white text-[#0A0A0A] transition-colors",
    footer: "text-[#6B7280]",
  },
}

export function StartPageView({ title, bio, avatarUrl, theme, slug, links }: StartPageViewProps) {
  const styles = THEME_STYLES[theme]

  return (
    <div className={`flex min-h-[70vh] items-center justify-center px-4 py-16 font-ui ${styles.page}`}>
      <div className={`flex w-full max-w-sm flex-col items-center gap-5 rounded-showcase p-8 ${styles.card}`}>
        <div className="w-20 h-20 rounded-full overflow-hidden bg-[#F4F2EC] border border-[#E5E3DE] flex items-center justify-center flex-shrink-0">
          {avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={avatarUrl} alt={title ?? slug} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[22px] font-bold text-[#ADA99F]">{(title ?? slug)[0]?.toUpperCase()}</span>
          )}
        </div>

        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className={`text-lead font-semibold tracking-[-0.01em] ${styles.name}`}>{title || `@${slug}`}</h1>
          {bio && <p className={`text-label ${styles.bio}`}>{bio}</p>}
        </div>

        <div className="w-full flex flex-col gap-2.5 mt-2">
          {links.map((link) => (
            <a
              key={link.id}
              href={`/api/start-page/click/${link.id}`}
              className={`flex min-h-12 w-full items-center justify-center rounded-control px-5 py-3 text-center text-label font-semibold transition-colors ${styles.link}`}
            >
              {link.label}
            </a>
          ))}
        </div>

        <Link href="/" className={`mt-2 inline-flex min-h-9 items-center text-caption hover:underline ${styles.footer}`}>
          Powered by CarouseLabs
        </Link>
      </div>
    </div>
  )
}
