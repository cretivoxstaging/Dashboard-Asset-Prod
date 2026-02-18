"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw,
  Plus,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CalendarIcon,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200];

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

type Employee = {
  name?: string;
  branch?: string;
  department?: string;
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
    if (typeof any.message === "string" && any.message.trim())
      return any.message;
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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [updatingStatusId, setUpdatingStatusId] = useState<
    number | string | null
  >(null);
  type AssetRow = { assetID: string; qty: string };
  const [form, setForm] = useState({
    borrowID: "",
    name: "",
    branch: "",
    department: "",
    date: "",
    return_date: "",
    status: "active",
  });
  const [assetRows, setAssetRows] = useState<AssetRow[]>([
    { assetID: "", qty: "" },
  ]);

  type Asset = {
    id?: number | string;
    item_name?: string;
    [key: string]: unknown;
  };
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);

  function normalizeAssets(payload: unknown): Asset[] {
    if (Array.isArray(payload)) return payload as Asset[];
    if (!payload || typeof payload !== "object") return [];
    const any = payload as Record<string, unknown>;
    if (Array.isArray(any.data)) return any.data as Asset[];
    if (Array.isArray(any.asset)) {
      return (any.asset as Array<{ id?: unknown; data?: unknown }>).map(
        (row) => {
          const id =
            row && typeof row === "object" && "id" in row
              ? (row as any).id
              : null;
          const data =
            row && typeof row === "object" && "data" in row
              ? (row as any).data
              : null;
          const flat =
            data && typeof data === "object"
              ? (data as Record<string, unknown>)
              : {};
          return {
            id:
              typeof id === "number" || typeof id === "string" ? id : undefined,
            ...(flat as Asset),
          };
        },
      );
    }
    return [];
  }

  async function fetchAssets(signal?: AbortSignal) {
    const res = await fetch("/api/asset", { cache: "no-store", signal });
    const text = await res.text();
    const json = text ? (JSON.parse(text) as unknown) : null;
    if (!res.ok) {
      throw new Error(getErrorMessage(json, res.status));
    }
    return normalizeAssets(json);
  }

  // Employee data - fetch once
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeesError, setEmployeesError] = useState<string | null>(null);

  // Employee search states
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");
  const [employeeResults, setEmployeeResults] = useState<Employee[]>([]);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

  async function fetchBorrows(signal?: AbortSignal) {
    const res = await fetch("/api/borrow", { cache: "no-store", signal });
    const text = await res.text();
    const json = text ? (JSON.parse(text) as unknown) : null;
    if (!res.ok) {
      throw new Error(getErrorMessage(json, res.status));
    }
    return normalizeBorrows(json);
  }

  async function handleStatusChange(row: BorrowItem, newStatus: string) {
    const id = row.borrowingId ?? row.id;
    if (id == null || id === undefined) return;
    setUpdatingStatusId(id);
    try {
      const res = await fetch(`/api/borrow/${encodeURIComponent(String(id))}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const text = await res.text();
      const json = text ? (JSON.parse(text) as unknown) : null;
      if (!res.ok) {
        throw new Error(getErrorMessage(json, res.status));
      }
      setItems((prev) =>
        prev.map((item) =>
          (item.borrowingId ?? item.id) === id
            ? { ...item, status: newStatus }
            : item,
        ),
      );
    } catch {
      // Silently fail or could set error state
    } finally {
      setUpdatingStatusId(null);
    }
  }

  // Fetch all employees once when component mounts
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function fetchAllEmployees() {
      try {
        setEmployeesLoading(true);
        setEmployeesError(null);

        const res = await fetch("/api/employee?limit=1000", {
          cache: "no-store",
          signal: controller.signal,
        });
        const text = await res.text();
        const json = text ? (JSON.parse(text) as unknown) : null;

        if (!res.ok) {
          throw new Error(getErrorMessage(json, res.status));
        }

        if (!cancelled) {
          // Handle different response formats
          let employees: Employee[] = [];
          if (Array.isArray(json)) {
            employees = json;
          } else if (json && typeof json === "object") {
            const obj = json as Record<string, unknown>;
            if (Array.isArray(obj.data)) {
              employees = obj.data as Employee[];
            } else if (Array.isArray(obj.employees)) {
              employees = obj.employees as Employee[];
            } else if (Array.isArray(obj.results)) {
              employees = obj.results as Employee[];
            }
          }
          setAllEmployees(employees);
        }
      } catch (e) {
        if (!cancelled) {
          setEmployeesError(
            e instanceof Error ? e.message : "Failed to fetch employees",
          );
          setAllEmployees([]);
        }
      } finally {
        if (!cancelled) {
          setEmployeesLoading(false);
        }
      }
    }

    fetchAllEmployees();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  // Local search employees - no API call
  const searchEmployeesLocally = useCallback(
    (query: string) => {
      if (!query.trim()) {
        setEmployeeResults([]);
        setShowEmployeeDropdown(false);
        return;
      }

      const searchTerm = query.toLowerCase().trim();
      const filtered = allEmployees.filter((employee) => {
        const name = employee.name?.toLowerCase() || "";
        return name.includes(searchTerm);
      });

      setEmployeeResults(filtered);
      setShowEmployeeDropdown(filtered.length > 0);
    },
    [allEmployees],
  );

  // Debounced local employee search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchEmployeesLocally(employeeSearchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [employeeSearchQuery, searchEmployeesLocally]);

  // Handle employee selection
  const handleEmployeeSelect = (employee: Employee) => {
    setForm((prev) => ({
      ...prev,
      name: employee.name || prev.name,
      branch: employee.branch || prev.branch,
      department: employee.department || prev.department,
    }));
    setEmployeeSearchQuery(employee.name || "");
    setShowEmployeeDropdown(false);
  };

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

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    async function runAssets() {
      try {
        setAssetsLoading(true);
        const list = await fetchAssets(controller.signal);
        if (!cancelled) setAssets(list);
      } catch (e) {
        if (!cancelled) setAssets([]);
      } finally {
        if (!cancelled) setAssetsLoading(false);
      }
    }
    runAssets();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  // Data lewat return_date (telat) → true
  function isOverdue(row: BorrowItem): boolean {
    const rd = row.return_date;
    if (!rd || typeof rd !== "string" || row.status === "returned")
      return false;
    const returnTime = new Date(rd.replace(" ", "T")).getTime();
    if (Number.isNaN(returnTime)) return false;
    return Date.now() > returnTime;
  }

  const rows = useMemo(() => {
    const raw = items ?? [];
    // Data yang lewat tanggal (overdue) paling atas, lalu urutkan ID terbesar di atas
    const list = raw.slice().sort((a, b) => {
      const overdueA = isOverdue(a) ? 1 : 0;
      const overdueB = isOverdue(b) ? 1 : 0;
      if (overdueB !== overdueA) return overdueB - overdueA; // overdue paling atas (di atas data ID terbesar/terbaru)
      const idA = a.borrowingId ?? a.id;
      const idB = b.borrowingId ?? b.id;
      if (idA == null && idB == null) return 0;
      if (idA == null) return 1;
      if (idB == null) return -1;
      const numA = typeof idA === "number" ? idA : Number(idA);
      const numB = typeof idB === "number" ? idB : Number(idB);
      if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numB - numA;
      return String(idB).localeCompare(String(idA), undefined, {
        numeric: true,
      });
    });
    let filtered = list;
    if (statusFilter && statusFilter !== "all") {
      filtered = filtered.filter((row) => {
        const rowStatus = String(row.status ?? "").toLowerCase();
        if (statusFilter === "overdue") {
          // Overdue = melewati tanggal jatuh tempo dan status masih active
          return rowStatus === "active" && isOverdue(row);
        }
        return rowStatus === statusFilter.toLowerCase();
      });
    }
    if (dateFilter) {
      const filterYmd =
        dateFilter.getFullYear() +
        "-" +
        String(dateFilter.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(dateFilter.getDate()).padStart(2, "0");
      filtered = filtered.filter((row) => {
        const d = row.date;
        if (!d || typeof d !== "string") return false;
        const rowYmd = d.trim().slice(0, 10);
        return rowYmd === filterYmd;
      });
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return filtered;
    return filtered.filter((row) => {
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
  }, [items, searchQuery, statusFilter, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, pageSize, safePage]);

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages));
  }, [totalPages, searchQuery, statusFilter, dateFilter, pageSize]);

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="mx-auto max-w-full px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-black">
            Borrow Report
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Reports and list of asset
          </p>
        </div>

        {/* Actions bar */}
        <div className="mb-4 flex flex-wrap items-center gap-4 rounded-xl px-2 py-2 justify-between">
          <div className="flex items-center gap-3 flex-1 flex-wrap">
            <div className="relative max-w-60 -ml-1.5">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                type="search"
                placeholder="Search report..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-lg border border-zinc-300 bg-white"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-35 rounded-lg border border-zinc-300 bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="min-w-30 justify-start rounded-lg border border-zinc-300 bg-white pl-3 text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-zinc-500" />
                  {dateFilter ? (
                    format(dateFilter, "d MMMM yyyy")
                  ) : (
                    <span className="text-zinc-500">Date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto h-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFilter}
                  onSelect={setDateFilter}
                  initialFocus
                  className="p-3"
                  // Tambahkan modifiers untuk menandai tanggal yang memiliki data
                  modifiers={{
                    hasData: (date) => {
                      // Format tanggal ke YYYY-MM-DD
                      const dateStr = format(date, "yyyy-MM-dd");

                      // Cek apakah ada data di tanggal tersebut
                      return items.some((item) => {
                        const itemDate = item.date;
                        if (!itemDate || typeof itemDate !== "string")
                          return false;
                        return itemDate.slice(0, 10) === dateStr;
                      });
                    },
                  }}
                  modifiersClassNames={{
                    hasData:
                      "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-blue-500 font-medium",
                  }}
                  classNames={{
                    caption:
                      "flex justify-center pt-1 relative items-center text-sm font-semibold",
                    caption_label: "text-sm font-semibold",
                    nav_button:
                      "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                    nav_button_previous: "absolute left-1",
                    nav_button_next: "absolute right-1",
                    table: "w-full border-collapse",
                    head_row: "flex",
                    head_cell:
                      "text-zinc-600 rounded-md w-9 font-medium text-xs",
                    row: "flex w-full mt-1",
                    cell: "text-center text-sm p-0 relative",
                    day: "h-9 w-9 p-0 font-normal hover:bg-zinc-100 rounded-md",
                    day_selected:
                      "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                    day_today: "font-bold bg-zinc-100 text-foreground",
                    day_outside: "text-zinc-400",
                  }}
                />
                <div className="border-t border-zinc-200 p-3">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full rounded-lg bg-black text-white hover:bg-zinc-800 active:scale-[0.98]"
                    onClick={() => {
                      setDateFilter(new Date());
                    }}
                  >
                    Today
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
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
                  borrowID: "",
                  name: "",
                  branch: "",
                  department: "",
                  date: "",
                  return_date: "",
                  status: "active",
                });
                setAssetRows([{ assetID: "", qty: "" }]);
                setEmployeeSearchQuery("");
                setEmployeeResults([]);
                setShowEmployeeDropdown(false);
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-200 bg-white p-0 shadow-xl">
              <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-5 py-4 rounded-t-2xl">
                <div className="text-base font-semibold text-black">
                  Add Borrow
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
                    if (!form.borrowID.trim())
                      throw new Error("Borrow ID wajib diisi.");
                    const filledAssets = assetRows.filter(
                      (r) => r.assetID && r.assetID.trim(),
                    );
                    if (filledAssets.length === 0)
                      throw new Error("Minimal 1 asset wajib dipilih.");
                    const dateStr = form.date.trim()
                      ? form.date.replace("T", " ")
                      : "";
                    const returnStr = form.return_date.trim()
                      ? form.return_date.replace("T", " ")
                      : "";
                    const newItems: BorrowItem[] = [];
                    for (const row of filledAssets) {
                      const formData = new FormData();
                      formData.append("assetID", row.assetID.trim());
                      formData.append("borrowID", form.borrowID.trim());
                      formData.append(
                        "qty",
                        (row.qty && row.qty.trim() ? row.qty : "1").trim(),
                      );
                      formData.append("name", form.name.trim() || "");
                      formData.append("branch", form.branch.trim() || "");
                      formData.append(
                        "department",
                        form.department.trim() || "",
                      );
                      formData.append("date", dateStr);
                      formData.append("return_date", returnStr);
                      formData.append("status", form.status.trim() || "active");

                      const res = await fetch("/api/borrow", {
                        method: "POST",
                        body: formData,
                      });
                      const text = await res.text();
                      const json = text ? (JSON.parse(text) as unknown) : null;

                      if (!res.ok) {
                        throw new Error(getErrorMessage(json, res.status));
                      }

                      const body = json as {
                        borrowingId?: number;
                        message?: string;
                        item_name?: string;
                      };
                      const asset = assets.find(
                        (a) => String(a.id) === String(row.assetID),
                      );
                      newItems.push({
                        id: body.borrowingId,
                        borrowingId: body.borrowingId,
                        borrowID: form.borrowID,
                        assetID: row.assetID,
                        qty: Number(row.qty || 1),
                        name: form.name,
                        branch: form.branch,
                        department: form.department,
                        date: form.date,
                        return_date: form.return_date,
                        status: form.status.trim() || "active",
                        item_name: body.item_name ?? asset?.item_name,
                      });
                    }
                    setCreateSuccess(
                      `${newItems.length} peminjaman berhasil dicatat.`,
                    );
                    setAddOpen(false);
                    setItems((prev) => [...prev, ...newItems]);
                  } catch (err) {
                    setCreateError(
                      err instanceof Error ? err.message : "Unknown error",
                    );
                  } finally {
                    setCreating(false);
                  }
                }}
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="space-y-1.5 relative">
                    <div className="text-xs font-medium text-zinc-700">
                      Borrow ID <span className="text-red-600">*</span>
                    </div>
                    <input
                      value={form.borrowID}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, borrowID: e.target.value }))
                      }
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                      placeholder="FNAprod110022"
                      required
                    />
                  </label>
                  <label className="space-y-1.5 relative">
                    <div className="text-xs font-medium text-zinc-700">
                      Name
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <input
                        value={employeeSearchQuery || form.name}
                        onChange={(e) => {
                          const value = e.target.value;
                          setEmployeeSearchQuery(value);
                          setForm((p) => ({ ...p, name: value }));
                          if (value.trim()) {
                            searchEmployeesLocally(value);
                          }
                        }}
                        onFocus={() => {
                          if (employeeResults.length > 0) {
                            setShowEmployeeDropdown(true);
                          }
                        }}
                        onBlur={() => {
                          setTimeout(() => setShowEmployeeDropdown(false), 200);
                        }}
                        className="w-full rounded-lg border border-zinc-300 bg-white pl-9 pr-3 py-2.5 text-sm text-black outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                        placeholder="Search name..."
                      />
                      {employeesLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <RefreshCw className="h-4 w-4 animate-spin text-zinc-500" />
                        </div>
                      )}
                      {employeesError && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <span className="text-xs text-red-500">!</span>
                        </div>
                      )}
                      {showEmployeeDropdown && employeeResults.length > 0 && (
                        <div className="absolute z-50 mt-1 w-full rounded-lg border border-zinc-200 bg-white shadow-lg max-h-60 overflow-auto">
                          {employeeResults.map((employee, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleEmployeeSelect(employee)}
                              className="w-full px-3 py-2 text-left text-sm text-black hover:bg-zinc-50 transition-colors"
                            >
                              <div className="font-medium">
                                {employee.name || "-"}
                              </div>
                              {(employee.branch || employee.department) && (
                                <div className="text-xs text-zinc-500">
                                  {employee.branch && employee.department
                                    ? `${employee.branch} • ${employee.department}`
                                    : employee.branch || employee.department}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </label>
                  <label className="space-y-1.5">
                    <div className="text-xs font-medium text-zinc-700">
                      Branch
                    </div>
                    <input
                      value={form.branch}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, branch: e.target.value }))
                      }
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                      placeholder="Cretivox"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <div className="text-xs font-medium text-zinc-700">
                      Department
                    </div>
                    <input
                      value={form.department}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, department: e.target.value }))
                      }
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                      placeholder="Production"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <div className="text-xs font-medium text-zinc-700">
                      Date
                    </div>
                    <input
                      type="datetime-local"
                      value={form.date}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, date: e.target.value }))
                      }
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <div className="text-xs font-medium text-zinc-700">
                      Return Date
                    </div>
                    <input
                      type="datetime-local"
                      value={form.return_date}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, return_date: e.target.value }))
                      }
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                    />
                  </label>
                  <div className="space-y-3 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-medium text-zinc-700">
                        Assets <span className="text-red-600">*</span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setAssetRows((prev) => [
                            ...prev,
                            { assetID: "", qty: "" },
                          ])
                        }
                        className="flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-zinc-50"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Asset
                      </button>
                    </div>
                    <div className="space-y-3">
                      {assetRows.map((row, idx) => (
                        <div
                          key={idx}
                          className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-zinc-50/50 p-3"
                        >
                          <label className="flex-1 min-w-35 space-y-1.5">
                            <div className="text-xs font-medium text-zinc-700">
                              Asset Name
                            </div>
                            <select
                              value={row.assetID}
                              onChange={(e) =>
                                setAssetRows((prev) => {
                                  const next = [...prev];
                                  next[idx] = {
                                    ...next[idx],
                                    assetID: e.target.value,
                                  };
                                  return next;
                                })
                              }
                              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                            >
                              <option value="">Select asset...</option>
                              {assetsLoading ? (
                                <option value="" disabled>
                                  Loading asset...
                                </option>
                              ) : null}
                              {assets
                                .filter((a) => {
                                  const possible =
                                    (a as any).qty_in_stock ??
                                    (a as any).qty ??
                                    (a as any).stock ??
                                    null;
                                  if (
                                    possible === null ||
                                    possible === undefined
                                  )
                                    return true;
                                  const n = Number(possible);
                                  return Number.isFinite(n) ? n > 0 : true;
                                })
                                .map((a, i) => (
                                  <option
                                    key={String(a.id ?? i)}
                                    value={String(a.id ?? "")}
                                  >
                                    {a.item_name ?? String(a.id ?? "-")}
                                  </option>
                                ))}
                            </select>
                          </label>
                          <label className="w-24 space-y-1.5">
                            <div className="text-xs font-medium text-zinc-700">
                              Quantity
                            </div>
                            <input
                              type="number"
                              placeholder="1"
                              min={1}
                              value={row.qty}
                              onChange={(e) =>
                                setAssetRows((prev) => {
                                  const next = [...prev];
                                  next[idx] = {
                                    ...next[idx],
                                    qty: e.target.value,
                                  };
                                  return next;
                                })
                              }
                              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setAssetRows((prev) =>
                                prev.length > 1
                                  ? prev.filter((_, i) => i !== idx)
                                  : prev,
                              )
                            }
                            className="rounded-lg p-2.5 text-zinc-500 hover:bg-zinc-200 hover:text-red-600 disabled:opacity-40"
                            disabled={assetRows.length <= 1}
                            title="Delete asset"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
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
                    {creating ? "Saving..." : "Save"}
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
                  <tr className="border-b border-zinc-200 bg-black text-white">
                    <th className="px-5 py-4 font-semibold">#</th>
                    <th className="px-5 py-4 font-semibold">Borrow ID</th>
                    <th className="px-5 py-4 font-semibold">Item Name</th>
                    <th className="px-5 py-4 font-semibold">Qty</th>
                    <th className="px-5 py-4 font-semibold">Name</th>
                    <th className="px-5 py-4 font-semibold">Branch</th>
                    <th className="px-5 py-4 font-semibold">Date</th>
                    <th className="px-5 py-4 font-semibold">Return Date</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-5 py-12 text-center text-zinc-600"
                      >
                        No borrow records found.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row, idx) => (
                      <tr
                        key={`${row.id ?? row.borrowID ?? idx}-${idx}`}
                        className={
                          isOverdue(row)
                            ? "bg-yellow-200 hover:bg-yellow-500/90 transition-colors"
                            : "bg-white hover:bg-zinc-50/80 transition-colors"
                        }
                      >
                        <td className="px-5 py-3.5 font-mono text-xs text-zinc-600">
                          {(safePage - 1) * pageSize + idx + 1}
                        </td>
                        <td className="px-5 py-3.5 font-medium text-black">
                          {row.borrowID ?? "-"}
                        </td>
                        <td className="px-5 py-3.5 text-zinc-700">
                          {row.item_name ?? "-"}
                        </td>
                        <td className="px-5 py-3.5 text-zinc-700">
                          {row.qty ?? "-"}
                        </td>
                        <td className="px-5 py-3.5 text-zinc-700">
                          {row.name ?? "-"}
                        </td>
                        <td className="px-5 py-3.5 text-zinc-700">
                          {row.branch ?? "-"} - {row.department ?? "-"}
                        </td>
                        <td className="px-5 py-3.5 text-zinc-700">
                          {row.date ?? "-"}
                        </td>
                        <td className="px-5 py-3.5 text-zinc-700">
                          {row.return_date ?? "-"}
                        </td>
                        <td className="px-5 py-3.5">
                          {(() => {
                            const value =
                              row.status === "active" ||
                              row.status === "returned"
                                ? row.status
                                : row.status || "active";

                            const colorClasses =
                              value === "returned"
                                ? "border-blue-200 bg-blue-50 text-blue-700"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700";

                            return (
                              <select
                                value={value}
                                onChange={(e) =>
                                  handleStatusChange(row, e.target.value)
                                }
                                disabled={
                                  updatingStatusId ===
                                  (row.borrowingId ?? row.id)
                                }
                                className={`rounded-lg px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-black/10 disabled:opacity-60 ${colorClasses}`}
                              >
                                <option value="active">Active</option>
                                <option value="returned">Returned</option>
                              </select>
                            );
                          })()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {rows.length > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-zinc-200 bg-zinc-50/50 px-5 py-4">
                <div className="flex items-center gap-2 text-sm text-zinc-700">
                  <span>Showing</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => {
                      setPageSize(Number(v));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-9 w-20 rounded-lg border border-zinc-300 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span>entries</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-black hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft className="mr-1 inline h-4 w-4" />
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setCurrentPage(p)}
                        className={`min-w-9 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                          p === safePage
                            ? "border-black bg-black text-white"
                            : "border-zinc-300 bg-white text-black hover:bg-zinc-50"
                        }`}
                      >
                        {p}
                      </button>
                    ),
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={safePage >= totalPages}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-black hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                    <ChevronRight className="ml-1 inline h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
