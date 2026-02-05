"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Plus, Search } from "lucide-react";

type BorrowItem = {
  id?: number | string;
  borrowingId?: number;
  borrowID?: string;
  assetID?: number | string;
  item_name?: string;
  qty?: number;
  name?: string;
  branch?: string;
  department?: string;
  date?: string;
  return_date?: string;
  status?: string;
  [key: string]: unknown;
};

function normalizeBorrows(payload: unknown): BorrowItem[] {
  if (!Array.isArray(payload)) return [];
  return payload.map((row) => {
    const item = row as { id?: number; data?: Record<string, unknown> };
    const id = item.id;
    const data = item.data && typeof item.data === "object" ? item.data : {};
    return {
      id,
      borrowingId: id,
      borrowID: data.borrowID,
      assetID: data.assetID,
      qty: data.qty,
      name: data.name,
      branch: data.branch,
      department: data.department,
      date: data.date,
      return_date: data.return_date,
      item_name: data.item_name,
      status: data.status,
      ...data,
    } as BorrowItem;
  });
}

function getErrorMessage(json: unknown, status: number) {
  if (json && typeof json === "object") {
    const any = json as Record<string, unknown>;
    if (typeof any.error === "string" && any.error.trim()) return any.error;
    if (typeof any.message === "string" && any.message.trim()) return any.message;
  }
  return `Request failed: ${status}`;
}

export function ReportTableClient() {
  const [items, setItems] = useState<BorrowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState({
    assetID: "",
    borrowID: "",
    qty: "",
    name: "",
    branch: "",
    department: "",
    date: "",
    return_date: "",
    status: "",
  });

  async function fetchBorrows(signal?: AbortSignal) {
    const res = await fetch("/api/borrow", { cache: "no-store", signal });
    const text = await res.text();
    const json = text ? (JSON.parse(text) as unknown) : null;
    if (!res.ok) {
      throw new Error(getErrorMessage(json, res.status));
    }
    return normalizeBorrows(json);
  }

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    async function run() {
      try {
        setLoading(true);
        setError(null);
        const nextItems = await fetchBorrows(controller.signal);
        if (!cancelled) setItems(nextItems);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Unknown error");
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const rows = useMemo(() => {
    const list = items ?? [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((row) => {
      const borrowID = String(row.borrowID ?? "").toLowerCase();
      const item_name = String(row.item_name ?? "").toLowerCase();
      const name = String(row.name ?? "").toLowerCase();
      const branch = String(row.branch ?? "").toLowerCase();
      const department = String(row.department ?? "").toLowerCase();
      return (
        borrowID.includes(q) ||
        item_name.includes(q) ||
        name.includes(q) ||
        branch.includes(q) ||
        department.includes(q)
      );
    });
  }, [items, searchQuery]);

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="mx-auto max-w-full px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-black">
            Report Peminjaman
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Laporan dan daftar peminjaman asset
          </p>
        </div>

        {/* Actions bar */}
        <div className="mb-4 flex flex-wrap items-center gap-4 rounded-xl px-2 py-2 justify-between">
          <div className="relative flex-1 max-w-60 -ml-1.5">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              type="search"
              placeholder="Search report..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-lg border border-zinc-300 bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={async () => {
                try {
                  setLoading(true);
                  setError(null);
                  setItems(await fetchBorrows());
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Unknown error");
                } finally {
                  setLoading(false);
                }
              }}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-black shadow-sm transition hover:bg-zinc-50 active:scale-[0.98]"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button
              type="button"
              onClick={() => {
                setCreateSuccess(null);
                setCreateError(null);
                setForm({
                  assetID: "",
                  borrowID: "",
                  qty: "",
                  name: "",
                  branch: "",
                  department: "",
                  date: "",
                  return_date: "",
                  status: "",
                });
                setAddOpen(true);
              }}
              className="rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 active:scale-[0.98]"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>
        </div>

        {/* Modal Add Borrow */}
        {addOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setAddOpen(false);
            }}
          >
            <div className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-0 shadow-xl">
              <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-5 py-4">
                <div className="text-base font-semibold text-black">
                  Tambah Peminjaman
                </div>
              </div>
              <form
                className="space-y-4 p-5"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setCreating(true);
                  setCreateError(null);
                  setCreateSuccess(null);
                  try {
                    if (!form.borrowID.trim()) throw new Error("Borrow ID wajib diisi.");
                    if (!form.assetID.trim()) throw new Error("Asset ID wajib diisi.");
                    const formData = new FormData();
                    formData.append("assetID", form.assetID.trim());
                    formData.append("borrowID", form.borrowID.trim());
                    formData.append("qty", form.qty.trim());
                    formData.append("name", form.name.trim() || "");
                    formData.append("branch", form.branch.trim() || "");
                    formData.append("department", form.department.trim() || "");
                    const dateStr = form.date.trim() ? form.date.replace("T", " ") : "";
                    const returnStr = form.return_date.trim() ? form.return_date.replace("T", " ") : "";
                    formData.append("date", dateStr);
                    formData.append("return_date", returnStr);
                    formData.append("status", form.status.trim() || "");

                    const res = await fetch("/api/borrow", {
                      method: "POST",
                      body: formData,
                    });
                    const text = await res.text();
                    const json = text ? (JSON.parse(text) as unknown) : null;

                    if (!res.ok) {
                      throw new Error(getErrorMessage(json, res.status));
                    }

                    const body = json as { borrowingId?: number; message?: string };
                    setCreateSuccess("Peminjaman berhasil dicatat.");
                    setAddOpen(false);

                    setItems((prev) => [
                      ...prev,
                      {
                        id: body.borrowingId,
                        borrowingId: body.borrowingId,
                        borrowID: form.borrowID,
                        assetID: form.assetID,
                        qty: Number(form.qty),
                        name: form.name,
                        branch: form.branch,
                        department: form.department,
                        date: form.date,
                        return_date: form.return_date,
                        status: form.status,
                      },
                    ]);
                  } catch (err) {
                    setCreateError(err instanceof Error ? err.message : "Unknown error");
                  } finally {
                    setCreating(false);
                  }
                }}
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="space-y-1.5">
                    <div className="text-xs font-medium text-zinc-700">
                      Asset ID <span className="text-red-600">*</span>
                    </div>
                    <input
                      value={form.assetID}
                      onChange={(e) => setForm((p) => ({ ...p, assetID: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                      placeholder="1"
                      required
                    />
                  </label>
                  <label className="space-y-1.5">
                    <div className="text-xs font-medium text-zinc-700">
                      Borrow ID <span className="text-red-600">*</span>
                    </div>
                    <input
                      value={form.borrowID}
                      onChange={(e) => setForm((p) => ({ ...p, borrowID: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                      placeholder="FNAprod110022"
                      required
                    />
                  </label>
                  <label className="space-y-1.5">
                    <div className="text-xs font-medium text-zinc-700">Qty</div>
                    <input
                      type="number"
                      placeholder="10"
                      min={1}
                      value={form.qty}
                      onChange={(e) => setForm((p) => ({ ...p, qty: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <div className="text-xs font-medium text-zinc-700">Name</div>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                      placeholder="RAMA"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <div className="text-xs font-medium text-zinc-700">Branch</div>
                    <input
                      value={form.branch}
                      onChange={(e) => setForm((p) => ({ ...p, branch: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                      placeholder="Cretivox"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <div className="text-xs font-medium text-zinc-700">Department</div>
                    <input
                      value={form.department}
                      onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                      placeholder="Production"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <div className="text-xs font-medium text-zinc-700">Date</div>
                    <input
                      type="datetime-local"
                      value={form.date}
                      onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <div className="text-xs font-medium text-zinc-700">Return Date</div>
                    <input
                      type="datetime-local"
                      value={form.return_date}
                      onChange={(e) => setForm((p) => ({ ...p, return_date: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <div className="text-xs font-medium text-zinc-700">Status</div>
                    <input
                      value={form.status}
                      onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                      placeholder="Pending"
                    />
                  </label>
                </div>

                {createError ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
                    {createError}
                  </div>
                ) : null}
                {createSuccess ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
                    {createSuccess}
                  </div>
                ) : null}

                <div className="flex items-center justify-end gap-3 border-t border-zinc-200 pt-4">
                  <button
                    type="button"
                    onClick={() => setAddOpen(false)}
                    className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-black hover:bg-zinc-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 disabled:opacity-60"
                  >
                    {creating ? "Menyimpan..." : "Simpan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-8 text-center text-sm font-medium text-zinc-700">
            Loading...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
            {error}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full w-full text-left text-sm text-black">
                <thead>
                  <tr className="border-b border-zinc-200 bg-gray-300 text-black">
                    <th className="px-5 py-4 font-semibold">#</th>
                    <th className="px-5 py-4 font-semibold">Borrow ID</th>
                    <th className="px-5 py-4 font-semibold">Item Name</th>
                    <th className="px-5 py-4 font-semibold">Qty</th>
                    <th className="px-5 py-4 font-semibold">Name</th>
                    <th className="px-5 py-4 font-semibold">Branch</th>
                    <th className="px-5 py-4 font-semibold">Department</th>
                    <th className="px-5 py-4 font-semibold">Date</th>
                    <th className="px-5 py-4 font-semibold">Return Date</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-5 py-12 text-center text-zinc-600">
                        No borrow records found.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, idx) => (
                      <tr
                        key={`${row.id ?? row.borrowID ?? idx}-${idx}`}
                        className="bg-white hover:bg-zinc-50/80 transition-colors"
                      >
                        <td className="px-5 py-3.5 font-mono text-xs text-zinc-600">
                          {row.borrowingId ?? row.id ?? "-"}
                        </td>
                        <td className="px-5 py-3.5 font-medium text-black">
                          {row.borrowID ?? "-"}
                        </td>
                        <td className="px-5 py-3.5 text-zinc-700">{row.item_name ?? "-"}</td>
                        <td className="px-5 py-3.5 text-zinc-700">{row.qty ?? "-"}</td>
                        <td className="px-5 py-3.5 text-zinc-700">{row.name ?? "-"}</td>
                        <td className="px-5 py-3.5 text-zinc-700">{row.branch ?? "-"}</td>
                        <td className="px-5 py-3.5 text-zinc-700">{row.department ?? "-"}</td>
                        <td className="px-5 py-3.5 text-zinc-700">{row.date ?? "-"}</td>
                        <td className="px-5 py-3.5 text-zinc-700">{row.return_date ?? "-"}</td>
                        <td className="px-5 py-3.5 text-zinc-700">{row.status ?? "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
