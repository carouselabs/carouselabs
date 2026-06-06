export default function BreakdownPage({
  params,
}: {
  params: { ideaId: string }
}) {
  return (
    <main className="flex-1 p-8">
      <h1 className="text-3xl font-bold text-white">Breakdown — {params.ideaId}</h1>
    </main>
  )
}
