export default function DashboardPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Active positions
        </h1>
      </div>
      <div className="mt-6 rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center">
        <p className="text-sm text-zinc-600">
          No open positions yet. Open a new position to start receiving
          candidates.
        </p>
      </div>
    </div>
  )
}
