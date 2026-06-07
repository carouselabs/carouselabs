export default function DashboardPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-12 h-12 rounded-2xl bg-[rgba(124,58,237,0.1)] border border-[rgba(124,58,237,0.2)] flex items-center justify-center mb-4">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 2L12.5 7.5H18L13.5 11L15.5 17L10 13.5L4.5 17L6.5 11L2 7.5H7.5L10 2Z" fill="#8B5CF6" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-[rgba(255,255,255,0.7)] mb-2">Generate</h2>
      <p className="text-sm text-[rgba(255,255,255,0.28)] max-w-xs">
        Your content generation workspace is coming soon.
      </p>
    </div>
  )
}
