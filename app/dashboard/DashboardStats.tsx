"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Package,
  CheckCircle,
  Truck,
  AlertTriangle,
  Wrench,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type AssetItem = {
  id?: number | string;
  item_name?: string;
  category?: string;
  condition?: string;
  qty_in_stock?: number;
  [key: string]: unknown;
};

type BorrowItem = {
  id?: number | string;
  borrowingId?: number;
  qty?: number;
  return_date?: string;
  status?: string;
  item_name?: string;
  name?: string;
  [key: string]: unknown;
};

function normalizeAssets(payload: unknown): AssetItem[] {
  if (Array.isArray(payload)) return payload as AssetItem[];
  if (!payload || typeof payload !== "object") return [];
  const any = payload as Record<string, unknown>;
  if (Array.isArray(any.data)) return any.data as AssetItem[];
  if (Array.isArray(any.asset)) {
    return (any.asset as Array<{ id?: unknown; data?: unknown }>).map((row) => {
      const id =
        row && typeof row === "object" && "id" in row
          ? (row as { id?: unknown }).id
          : null;
      const data =
        row && typeof row === "object" && "data" in row
          ? (row as { data?: unknown }).data
          : null;
      const flat =
        data && typeof data === "object"
          ? (data as Record<string, unknown>)
          : {};
      return {
        id: typeof id === "number" || typeof id === "string" ? id : undefined,
        ...(flat as AssetItem),
      };
    });
  }
  return [];
}

function normalizeBorrows(payload: unknown): BorrowItem[] {
  if (!Array.isArray(payload)) return [];
  return payload.map((row) => {
    const item = row as { id?: number; data?: Record<string, unknown> };
    const id = item.id;
    const data = item.data && typeof item.data === "object" ? item.data : {};
    return {
      id,
      borrowingId: id,
      qty: data.qty,
      return_date: data.return_date,
      item_name: data.item_name,
      name: data.name,
      ...data,
    } as BorrowItem;
  });
}

function parseQty(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return Math.max(0, v);
  if (typeof v === "string") return Math.max(0, parseInt(v, 10) || 0);
  return 0;
}

function isOverdue(returnDate: unknown): boolean {
  if (returnDate == null || returnDate === "") return false;
  const s = String(returnDate).trim().replace("T", " ").split(" ")[0];
  if (!s) return false;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

function isMaintenance(condition: unknown): boolean {
  const c = String(condition ?? "").toLowerCase();
  return (
    c === "maintenance" ||
    c === "damaged" ||
    c === "maintanance" ||
    c.includes("damaged") ||
    c.includes("maintenance") ||
    c.includes("maintanance")
  );
}

export function DashboardStats() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalAsset: 0,
    tersedia: 0,
    dipinjam: 0,
    overdue: 0,
    maintenance: 0,
  });
  const [chartStatus, setChartStatus] = useState({
    dipinjam: 0,
    tersedia: 0,
    rusak: 0,
  });
  const [chartReturnStatus, setChartReturnStatus] = useState({
    returned: 0,
    active: 0,
  });
  const [overdueList, setOverdueList] = useState<BorrowItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [assetRes, borrowRes] = await Promise.all([
          fetch("/api/asset", { cache: "no-store", signal: controller.signal }),
          fetch("/api/borrow", {
            cache: "no-store",
            signal: controller.signal,
          }),
        ]);

        const assetText = await assetRes.text();
        const borrowText = await borrowRes.text();
        const assetJson = assetText ? (JSON.parse(assetText) as unknown) : null;
        const borrowJson = borrowText
          ? (JSON.parse(borrowText) as unknown)
          : null;

        if (cancelled) return;

        const assets = normalizeAssets(assetJson);
        const borrows = normalizeBorrows(
          Array.isArray(borrowJson) ? borrowJson : [],
        );

        const qtyInStock = assets.reduce(
          (sum, a) => sum + parseQty(a.qty_in_stock),
          0,
        );
        const qtyBorrowed = borrows.reduce(
          (sum, b) => sum + parseQty(b.qty),
          0,
        );
        const overdueQty = borrows.reduce(
          (sum, b) => {
            const status = String(b.status ?? "").toLowerCase();
            const isActive = status === "active";
            return isOverdue(b.return_date) && isActive
              ? sum + parseQty(b.qty)
              : sum;
          },
          0,
        );
        const maintenanceQty = assets
          .filter((a) => isMaintenance(a.condition))
          .reduce((sum, a) => sum + parseQty(a.qty_in_stock), 0);

        const tersediaChart = assets
          .filter((a) => !isMaintenance(a.condition))
          .reduce((sum, a) => sum + parseQty(a.qty_in_stock), 0);
        const rusakChart = assets
          .filter((a) => isMaintenance(a.condition))
          .reduce((sum, a) => sum + parseQty(a.qty_in_stock), 0);

        setStats({
          totalAsset: qtyInStock + qtyBorrowed,
          tersedia: tersediaChart,
          dipinjam: qtyBorrowed,
          overdue: overdueQty,
          maintenance: maintenanceQty,
        });
        setChartStatus({
          dipinjam: qtyBorrowed,
          tersedia: tersediaChart,
          rusak: rusakChart,
        });

        const returnedQty = borrows
          .filter((b) => String(b.status ?? "").toLowerCase() === "returned")
          .reduce((sum, b) => sum + parseQty(b.qty), 0);
        const activeQty = borrows
          .filter((b) => String(b.status ?? "").toLowerCase() === "active")
          .reduce((sum, b) => sum + parseQty(b.qty), 0);
        setChartReturnStatus({ returned: returnedQty, active: activeQty });

        const overdue = borrows.filter((b) => {
          const status = String(b.status ?? "").toLowerCase();
          return status === "active" && isOverdue(b.return_date);
        });
        setOverdueList(overdue);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Gagal memuat data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
        {error}
      </div>
    );
  }

  const cards: {
    statKey: keyof typeof stats;
    title: string;
    desc: string;
    icon: typeof Package;
    className: string;
  }[] = [
    {
      statKey: "totalAsset",
      title: "Total Assets",
      desc: "Total number of all assets",
      icon: Package,
      className: "border-gray-800 dark:border-zinc-800 border-b-4",
    },
    {
      statKey: "tersedia",
      title: "Available",
      desc: "Assets ready to borrow",
      icon: CheckCircle,
      className: "border-gray-800 dark:border-zinc-800 border-b-4",
    },
    {
      statKey: "dipinjam",
      title: "Borrowed",
      desc: "Assets currently on loan",
      icon: Truck,
      className: "border-gray-800 dark:border-zinc-800 border-b-4",
    },
    {
      statKey: "overdue",
      title: "Overdue",
      desc: "Borrowings past the return date",
      icon: AlertTriangle,
      className: "border-gray-800 dark:border-zinc-800 border-b-4",
    },
    {
      statKey: "maintenance",
      title: "Maintenance / Damaged",
      desc: "Assets under maintenance or damaged",
      icon: Wrench,
      className: "border-red-800 dark:border-rose-800 border-b-4",
    },
  ];

  const pieData = useMemo(() => {
    const raw = [
      {
        name: "Borrowed",
        value: chartStatus.dipinjam,
        color: "hsl(217 91% 60%)",
      },
      {
        name: "Available",
        value: chartStatus.tersedia,
        color: "hsl(142 71% 45%)",
      },
      {
        name: "Damaged",
        value: chartStatus.rusak,
        color: "hsl(0 72% 51%)",
      },
    ];
    return raw.filter((d) => d.value > 0);
  }, [chartStatus.dipinjam, chartStatus.tersedia, chartStatus.rusak]);

  const returnStatusPieData = useMemo(() => {
    const raw = [
      {
        name: "Returned",
        value: chartReturnStatus.returned,
        color: "hsl(142 71% 45%)",
      },
      {
        name: "Active",
        value: chartReturnStatus.active,
        color: "hsl(217 91% 60%)",
      },
    ];
    return raw.filter((d) => d.value > 0);
  }, [chartReturnStatus.returned, chartReturnStatus.active]);

  const hasChartData = pieData.length > 0;
  const hasReturnStatusData = returnStatusPieData.length > 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className={`rounded-lg border bg-white p-4 dark:bg-zinc-950 ${card.className}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-xs text-zinc-600 dark:text-zinc-400">
                  {card.title}
                </div>
                <Icon className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" />
              </div>
              <div className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
                {loading ? "—" : stats[card.statKey]}
              </div>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {card.desc}
              </p>
            </div>
          );
        })}
      </div>
      
      {/* Asset Status | Overdue Detail | Return Status */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-b-4 border-black bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 ">
          <h2 className="mb-4 text-sm font-bold text-zinc-700 dark:text-zinc-300">
            Asset Status
          </h2>
          {loading ? (
            <div className="flex h-70 items-center justify-center text-sm text-zinc-500 ">
              Memuat…
            </div>
          ) : hasChartData ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart className="p-5">
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [value, ""]}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-70 items-center justify-center text-sm text-zinc-500">
              Tidak ada data untuk ditampilkan
            </div>
          )}
        </div>

        <div className="rounded-lg border border-b-4 border-black bg-white p-4 dark:border-amber-800 dark:bg-zinc-950 ">
          <h2 className="mb-4 text-sm font-bold text-zinc-700 dark:text-zinc-300">
            Overdue Detail
          </h2>
          <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
            Borrowers who have not returned assets past the due date
          </p>
          {loading ? (
            <div className="flex h-70 items-center justify-center text-sm text-zinc-500">
              Memuat…
            </div>
          ) : overdueList.length === 0 ? (
            <div className="flex h-70 items-center justify-center text-sm text-zinc-500">
              Tidak ada peminjaman overdue
            </div>
          ) : (
            <div className="max-h-70 overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 border-b bg-zinc-100 dark:bg-zinc-900">
                  <tr>
                    <th className="py-2 pr-2 font-medium">Item</th>
                    <th className="py-2 pr-2 font-medium text-center w-12">Qty</th>
                    <th className="py-2 pr-2 font-medium">Nama</th>
                    <th className="py-2 font-medium whitespace-nowrap">Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueList.map((row, idx) => {
                    const dueStr = row.return_date
                      ? String(row.return_date).replace("T", " ").split(" ")[0]
                      : "-";
                    return (
                      <tr
                        key={row.borrowingId ?? row.id ?? idx}
                        className="border-b border-zinc-100 dark:border-zinc-800"
                      >
                        <td className="py-2 pr-2">{row.item_name ?? "-"}</td>
                        <td className="py-2 pr-2 text-center">{parseQty(row.qty)}</td>
                        <td className="py-2 pr-2">{row.name ?? "-"}</td>
                        <td className="py-2 whitespace-nowrap">{dueStr}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-b-4 border-black bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 ">
          <h2 className="mb-4 text-sm font-bold text-zinc-700 dark:text-zinc-300">
            Return Status
          </h2>
          {loading ? (
            <div className="flex h-70 items-center justify-center text-sm text-zinc-500">
              Memuat…
            </div>
          ) : hasReturnStatusData ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart className="p-5">
                <Pie
                  data={returnStatusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {returnStatusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [value, ""]}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-70 items-center justify-center text-sm text-zinc-500">
              Tidak ada data untuk ditampilkan
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
