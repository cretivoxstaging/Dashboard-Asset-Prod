import { DashboardStats } from "./DashboardStats";

export default function DashboardPage() {
  return (
    <div className="space-y-4 p-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Asset Management Application Summary
        </p>
      </div>

      <DashboardStats />
    </div>
  );
}

