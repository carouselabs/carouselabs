export default function HistoryPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-12 h-12 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] flex items-center justify-center mb-4">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-[rgba(255,255,255,0.7)] mb-2">History</h2>
      <p className="text-sm text-[rgba(255,255,255,0.28)] max-w-xs">
        Your past sessions and generated content will appear here.
      </p>
    </div>
  )
}
