import Link from "next/link"

export function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-[rgba(255,255,255,0.06)]">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#7C3AED] flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">C</span>
          </div>
          <span className="text-[14px] font-semibold text-[rgba(255,255,255,0.65)]">
            CarouseLabs
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link
            href="/sign-in"
            className="text-[12px] text-[rgba(255,255,255,0.32)] hover:text-[rgba(255,255,255,0.58)] transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="text-[12px] text-[rgba(255,255,255,0.32)] hover:text-[rgba(255,255,255,0.58)] transition-colors"
          >
            Sign up
          </Link>
        </nav>

        <p className="text-[11px] text-[rgba(255,255,255,0.18)]">
          © {new Date().getFullYear()} CarouseLabs. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
