import { Onest } from "next/font/google"
import { AuthStickers } from "@/components/auth/AuthStickers"

const font = Onest({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
})

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${font.className} relative min-h-screen flex items-center justify-center overflow-hidden bg-[#F9F7F2] text-[#0A0A0A]`}
    >
      {/* The root layout sets a dark body background for the authenticated app.
          Override it to cream for the auth pages. */}
      <style>{`body{background-color:#F9F7F2;color:#0A0A0A}`}</style>

      {/* Decorative floating stickers around the card */}
      <AuthStickers />

      <div className="relative z-10 w-full px-4 py-16">{children}</div>
    </div>
  )
}
