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
    page: "bg-[#F9F7F2]",
    card: "bg-white border border-[#E5E3DE] shadow-[0_20px_60px_rgba(124,58,237,0.08)]",
    name: "text-[#0A0A0A]",
    bio: "text-[#6B7280]",
    link: "bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-[0_8px_24px_rgba(124,58,237,0.25)]",
    footer: "text-[#ADA99F]",
  },
  dark: {
    page: "bg-[#0A0A0A]",
    card: "bg-[#141414] border border-[#2A2A2A]",
    name: "text-white",
    bio: "text-[#9CA3AF]",
    link: "bg-[#F59E0B] hover:bg-[#D97706] text-[#0A0A0A]",
    footer: "text-[#6A6A6A]",
  },
  minimal: {
    page: "bg-white",
    card: "bg-white border border-[#E5E3DE]",
    name: "text-[#0A0A0A]",
    bio: "text-[#6B7280]",
    link: "bg-white border border-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white text-[#0A0A0A] transition-colors",
    footer: "text-[#9CA3AF]",
  },
}

export function StartPageView({ title, bio, avatarUrl, theme, slug, links }: StartPageViewProps) {
  const styles = THEME_STYLES[theme]

  return (
    <div className={`min-h-[70vh] flex items-center justify-center px-4 py-16 ${styles.page}`}>
      <div className={`w-full max-w-sm flex flex-col items-center gap-5 p-8 rounded-3xl ${styles.card}`}>
        <div className="w-20 h-20 rounded-full overflow-hidden bg-[#F4F2EC] border border-[#E5E3DE] flex items-center justify-center flex-shrink-0">
          {avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={avatarUrl} alt={title ?? slug} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[22px] font-bold text-[#ADA99F]">{(title ?? slug)[0]?.toUpperCase()}</span>
          )}
        </div>

        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className={`text-[17px] font-bold ${styles.name}`}>{title || `@${slug}`}</h1>
          {bio && <p className={`text-[13px] leading-[1.5] ${styles.bio}`}>{bio}</p>}
        </div>

        <div className="w-full flex flex-col gap-2.5 mt-2">
          {links.map((link) => (
            <a
              key={link.id}
              href={`/api/start-page/click/${link.id}`}
              className={`w-full text-center px-5 py-3 rounded-xl text-[14px] font-semibold transition-colors ${styles.link}`}
            >
              {link.label}
            </a>
          ))}
        </div>

        <Link href="/" className={`text-[11px] mt-2 hover:underline ${styles.footer}`}>
          Powered by CarouseLabs
        </Link>
      </div>
    </div>
  )
}
