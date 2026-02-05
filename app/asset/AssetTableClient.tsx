"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Plus, Search } from "lucide-react";

type AssetItem = {
  id?: number | string;
  item_name?: string;
  category?: string;
  condition?: string;
  qty_in_stock?: number;
  picture?: string | null;
  description?: string | null;
  owner?: string | null;
  [key: string]: unknown;
};

function normalizeAssets(payload: unknown): AssetItem[] {
  // supported response shapes:
  // - AssetItem[]
  // - { data: AssetItem[] }
  // - { asset: { id, data: AssetItem }[] }
  if (Array.isArray(payload)) return payload as AssetItem[];

  if (!payload || typeof payload !== "object") return [];

  const any = payload as Record<string, unknown>;

  if (Array.isArray(any.data)) return any.data as AssetItem[];

  if (Array.isArray(any.asset)) {
    return (any.asset as Array<{ id?: unknown; data?: unknown }>).map((row) => {
      const id =
        row && typeof row === "object" && "id" in row ? (row as any).id : null;
      const data =
        row && typeof row === "object" && "data" in row
          ? (row as any).data
          : null;
      const flat =
        data && typeof data === "object" ? (data as Record<string, unknown>) : {};

      return {
        id: typeof id === "number" || typeof id === "string" ? id : undefined,
        ...(flat as AssetItem),
      };
    });
  }

  return [];
}

function getErrorMessage(json: unknown, status: number) {
  if (json && typeof json === "object") {
    const any = json as Record<string, unknown>;
    if (typeof any.error === "string" && any.error.trim()) return any.error;
    if (typeof any.message === "string" && any.message.trim()) return any.message;
  }
  return `Request failed: ${status}`;
}

export function AssetTableClient() {
  const [items, setItems] = useState<AssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | number | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [pictureFile, setPictureFile] = useState<File | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState({
    item_name: "",
    category: "",
    condition: "",
    qty_in_stock: "",
    owner: "",
    picture: "",
    description: "",
  });

  async function fetchAssets(signal?: AbortSignal) {
    const res = await fetch("/api/asset", { cache: "no-store", signal });
    const text = await res.text();
    const json = text ? (JSON.parse(text) as unknown) : null;

    if (!res.ok) {
      throw new Error(getErrorMessage(json, res.status));
    }

    return normalizeAssets(json);
  }

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function run() {
      try {
        setLoading(true);
        setError(null);

        const nextItems = await fetchAssets(controller.signal);
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
      const name = String(row.item_name ?? "").toLowerCase();
      const category = String(row.category ?? "").toLowerCase();
      const condition = String(row.condition ?? "").toLowerCase();
      const owner = String(row.owner ?? "").toLowerCase();
      const desc = String(row.description ?? "").toLowerCase();
      return (
        name.includes(q) ||
        category.includes(q) ||
        condition.includes(q) ||
        owner.includes(q) ||
        desc.includes(q)
      );
    });
  }, [items, searchQuery]);
  const isEdit = editId !== null && editId !== undefined;

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="mx-auto max-w-full px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-black">
            Management Asset
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Kelola daftar asset perusahaan Anda
          </p>
        </div>

        {/* Actions bar */}
        <div className="mb-4 flex flex-wrap items-center gap-4 rounded-xl px-2 py-2 justify-between">
          <div className="relative flex-1 max-w-60 -ml-1.5">
            <Search className="absolute left-3 top-1/2 h- w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              type="search"
              placeholder="Search assets..."
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
                  setItems(await fetchAssets());
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
                setEditId(null);
                setForm({
                  item_name: "",
                  category: "",
                  condition: "",
                  qty_in_stock: "",
                  owner: "",
                  picture: "",
                  description: "",
                });
                setPictureFile(null);
                setAddOpen(true);
              }}
              className="rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 active:scale-[0.98]"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
            
          </div>
        </div>

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
                  {isEdit ? "Edit Asset" : "Add New Asset"}
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
                  if (!form.item_name.trim()) throw new Error("Item name wajib diisi.");

                  const url = isEdit ? `/api/asset/${encodeURIComponent(String(editId))}` : "/api/asset";
                  const method = isEdit ? "PUT" : "POST";

                  const formData = new FormData();
                  formData.append("item_name", form.item_name.trim());
                  formData.append("category", form.category.trim() || "");
                  formData.append("condition", form.condition.trim() || "");
                  formData.append("qty_in_stock", String(Number.isFinite(Number(form.qty_in_stock)) ? Number(form.qty_in_stock) : 0));
                  formData.append("owner", form.owner.trim() || "");
                  formData.append("description", form.description.trim() || "");
                  if (pictureFile) {
                    formData.append("picture", pictureFile);
                  }

                  const res = await fetch(url, {
                    method,
                    body: formData,
                  });
                  const text = await res.text();
                  const json = text ? (JSON.parse(text) as unknown) : null;

                  if (!res.ok) {
                    throw new Error(getErrorMessage(json, res.status));
                  }

                  setCreateSuccess(isEdit ? "Asset berhasil diupdate." : "Asset berhasil ditambahkan.");
                  setAddOpen(false);
                  setEditId(null);

                  // refresh table after create
                  setLoading(true);
                  setError(null);
                  setItems(await fetchAssets());
                } catch (err) {
                  setCreateError(err instanceof Error ? err.message : "Unknown error");
                } finally {
                  setCreating(false);
                  setLoading(false);
                }
              }}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <div className="text-xs font-medium text-zinc-700">
                    Asset Name <span className="text-red-600">*</span>
                  </div>
                  <input
                    value={form.item_name}
                    onChange={(e) => setForm((p) => ({ ...p, item_name: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                    placeholder="Camera Canon EOS 5D"
                    required
                  />
                </label>

                <label className="space-y-1.5">
                  <div className="text-xs font-medium text-zinc-700">Category</div>
                  <input
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                    placeholder="Grip"
                  />
                </label>

                <label className="space-y-1.5">
                  <div className="text-xs font-medium text-zinc-700">Condition</div>
                  <input
                    value={form.condition}
                    onChange={(e) => setForm((p) => ({ ...p, condition: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                    placeholder="Good"
                  />
                </label>

                <label className="space-y-1.5">
                  <div className="text-xs font-medium text-zinc-700">Stock</div>
                  <input
                    type="number"
                    placeholder="10"
                    min={0}
                    value={form.qty_in_stock}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, qty_in_stock: e.target.value }))
                    }
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                  />
                </label>

                <label className="space-y-1.5">
                  <div className="text-xs font-medium text-zinc-700">Owner</div>
                  <input
                    value={form.owner}
                    onChange={(e) => setForm((p) => ({ ...p, owner: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                    placeholder="Cretivox"
                  />
                </label>

                <label className="space-y-1.5 sm:col-span-2">
                  <div className="text-xs font-medium text-zinc-700">Picture (upload file)</div>
                  {form.picture && !pictureFile ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={form.picture}
                        alt="Current"
                        className="h-16 w-16 rounded-lg border border-zinc-200 object-cover"
                      />
                      <span className="text-xs text-zinc-500">Ganti dengan file baru di bawah</span>
                    </div>
                  ) : null}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPictureFile(e.target.files?.[0] ?? null)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-black file:mr-3 file:rounded file:border-0 file:bg-black file:px-3 file:py-1.5 file:text-sm file:text-white file:hover:bg-zinc-800 outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                  />
                  {pictureFile ? (
                    <span className="text-xs text-zinc-600">{pictureFile.name}</span>
                  ) : null}
                </label>
              </div>

              <label className="space-y-1.5 block">
                <div className="text-xs font-medium text-zinc-700">Description</div>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className="min-h-24 w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                  placeholder="Additional notes..."
                />
              </label>

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
                  onClick={() => {
                    setAddOpen(false);
                    setEditId(null);
                  }}
                  className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-black hover:bg-zinc-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 disabled:opacity-60"
                >
                  {creating ? "Creating..." : isEdit ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
        ) : null}

        {/* Popup preview gambar */}
        {previewImage ? (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setPreviewImage(null)}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-black shadow-lg hover:bg-white"
              aria-label="Tutup"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={previewImage}
              alt="Preview"
              className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
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
                    <th className="px-5 py-4 font-semibold">Asset Name</th>
                    <th className="px-5 py-4 font-semibold">Category</th>
                    <th className="px-5 py-4 font-semibold">Condition</th>
                    <th className="px-5 py-4 font-semibold">Stock</th>
                    <th className="px-5 py-4 font-semibold">Owner</th>
                    <th className="px-5 py-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-12 text-center text-zinc-600"
                      >
                        No assets found.
                      </td>
                    </tr>
                  ) : (
                    rows.map((a, idx) => (
                      <tr
                        key={`${a.id ?? "no-id"}-${idx}`}
                        className="bg-white hover:bg-zinc-50/80 transition-colors"
                      >
                        <td className="px-5 py-3.5 font-mono text-xs text-zinc-600">
                          {a.id ?? "-"}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            {a.picture ? (
                              <button
                                type="button"
                                onClick={() => setPreviewImage(a.picture ?? null)}
                                title="Klik untuk lihat gambar"
                                className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 transition hover:ring-2 hover:ring-black/20 focus:outline-none focus:ring-2 focus:ring-black/20"
                              >
                                <img
                                  src={a.picture}
                                  alt=""
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    const el = e.target as HTMLImageElement;
                                    el.style.display = "none";
                                    el.nextElementSibling?.classList.remove("hidden");
                                  }}
                                />
                                <span className="hidden text-zinc-400" aria-hidden>🖼</span>
                              </button>
                            ) : (
                              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
                                <span className="text-zinc-400" aria-hidden>🖼</span>
                              </div>
                            )}
                            <span className="font-medium text-black">{a.item_name ?? "-"}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-zinc-700">{a.category ?? "-"}</td>
                        <td className="px-5 py-3.5 text-zinc-700">{a.condition ?? "-"}</td>
                        <td className="px-5 py-3.5 text-zinc-700">{a.qty_in_stock ?? 0}</td>
                        <td className="px-5 py-3.5 text-zinc-700">{a.owner ?? "-"}</td>
                        
                        <td className="px-5 py-3.5">
                          <button
                            type="button"
                            disabled={a.id === undefined || a.id === null || a.id === ""}
                            onClick={() => {
                              if (a.id === undefined || a.id === null || a.id === "") return;
                              setCreateSuccess(null);
                              setCreateError(null);
                              setPictureFile(null);
                              setEditId(a.id as string | number);
                              setForm({
                                item_name: String(a.item_name ?? ""),
                                category: String(a.category ?? ""),
                                condition: String(a.condition ?? ""),
                                qty_in_stock:
                                  typeof a.qty_in_stock === "number" ? String(a.qty_in_stock) : "",
                                owner: String(a.owner ?? ""),
                                picture: String(a.picture ?? ""),
                                description: String(a.description ?? ""),
                              });
                              setAddOpen(true);
                            }}
                            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-zinc-100 disabled:opacity-50"
                          >
                            Edit
                          </button>
                        </td>
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

