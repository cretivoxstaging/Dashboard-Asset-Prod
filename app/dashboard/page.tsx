export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Ringkasan aplikasi Asset Management.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
          <div className="text-xs text-zinc-600 dark:text-zinc-400">
            Endpoint
          </div>
          <div className="mt-1 font-mono text-sm">asset</div>
        </div>
        <div className="rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
          <div className="text-xs text-zinc-600 dark:text-zinc-400">Menu</div>
          <div className="mt-1 text-sm">Dashboard, Asset, Report</div>
        </div>
        <div className="rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
          <div className="text-xs text-zinc-600 dark:text-zinc-400">
            Catatan
          </div>
          <div className="mt-1 text-sm">
            Token API disimpan di server via <span className="font-mono">.env</span>
          </div>
        </div>
      </div>
    </div>
  );
}

