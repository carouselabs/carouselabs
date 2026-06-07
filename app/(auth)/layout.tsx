export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#080810]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 50% -5%, rgba(124,58,237,0.18) 0%, transparent 70%)",
        }}
      />
      <div className="relative z-10 w-full px-4 py-16">{children}</div>
    </div>
  )
}
