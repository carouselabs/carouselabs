export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <div className="w-8 h-8 border-[3px] border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
      <p className="text-[13px] text-[#6B7280]">Preparing your content...</p>
    </div>
  )
}
