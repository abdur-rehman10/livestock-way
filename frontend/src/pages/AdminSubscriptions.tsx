import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Separator } from "../components/ui/separator";
import { toast } from "sonner";

type PayingFilter = "ALL" | "PAID" | "UNPAID";
type HaulerTypeFilter = "ALL" | "INDIVIDUAL" | "COMPANY";

interface SubscriptionRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  hauler_type: string | null;
  free_trip_used: boolean | null;
  subscription_status: string | null;
  billing_cycle: string | null;
  current_period_end: string | null;
  last_payment_amount: string | number | null;
  last_payment_status: string | null;
  last_payment_at: string | null;
  pay_status?: string | null;
}

interface SubscriptionResponse {
  items: SubscriptionRow[];
  page: number;
  pageSize: number;
  total: number;
}

export default function AdminSubscriptions() {
  const [items, setItems] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState<PayingFilter>("ALL");
  const [haulerType, setHaulerType] = useState<HaulerTypeFilter>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("paying", paying);
      params.set("hauler_type", haulerType);
      if (search.trim()) params.set("q", search.trim());
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      const resp = await fetch(`/api/admin/subscriptions?${params.toString()}`, {
        headers: {
          Accept: "application/json",
        },
      });
      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Failed to load subscriptions (${resp.status})`);
      }
      const data = (await resp.json()) as SubscriptionResponse;
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      console.error(err);
      const msg = err?.message ?? "Failed to load subscriptions";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paying, haulerType, page]);

  const resetToFirstPageAndFetch = () => {
    setPage(1);
    // fetchData will run via useEffect on state change
  };

  const formatDate = (value: string | null) => {
    if (!value) return "—";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
  };

  const formatCurrency = (value: string | number | null) => {
    if (value === null || value === undefined || value === "") return "—";
    const num = Number(value);
    if (!Number.isFinite(num)) return String(value);
    return `$${num.toFixed(2)}`;
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#172039]">Subscriptions</h1>
          <p className="text-sm text-gray-600">Monitor paid vs unpaid accounts.</p>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">Paying</p>
              <Select value={paying} onValueChange={(v) => { setPaying(v as PayingFilter); resetToFirstPageAndFetch(); }}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="UNPAID">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Hauler Type</p>
              <Select value={haulerType} onValueChange={(v) => { setHaulerType(v as HaulerTypeFilter); resetToFirstPageAndFetch(); }}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                  <SelectItem value="COMPANY">Company</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-64">
              <p className="text-xs text-gray-500 mb-1">Search (name/email/phone)</p>
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    resetToFirstPageAndFetch();
                  }
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => { setSearch(""); setPaying("ALL"); setHaulerType("ALL"); setPage(1); }}>
              Reset
            </Button>
            <Button onClick={() => resetToFirstPageAndFetch()} className="bg-[#29CA8D] hover:bg-[#24b67d]">
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 text-sm text-gray-500">Loading…</div>
          ) : error ? (
            <div className="p-4 text-sm text-red-600">{error}</div>
          ) : items.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">No records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Email</th>
                    <th className="px-4 py-2">Role</th>
                    <th className="px-4 py-2">Hauler Type</th>
                    <th className="px-4 py-2">Free Trip</th>
                    <th className="px-4 py-2">Subscription</th>
                    <th className="px-4 py-2">Period End</th>
                    <th className="px-4 py-2">Last Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => {
                    const subscriptionLabel = row.subscription_status
                      ? row.subscription_status
                      : "NONE";
                    const billing = row.billing_cycle ? ` · ${row.billing_cycle}` : "";
                    return (
                      <tr key={row.user_id} className="border-b last:border-0">
                        <td className="px-4 py-2">{row.full_name ?? "—"}</td>
                        <td className="px-4 py-2">{row.email ?? "—"}</td>
                        <td className="px-4 py-2 capitalize">{row.role ?? "—"}</td>
                        <td className="px-4 py-2">{row.hauler_type ?? "—"}</td>
                        <td className="px-4 py-2">
                          <Badge variant="outline" className={row.free_trip_used ? "border-amber-300 text-amber-800" : "border-emerald-300 text-emerald-800"}>
                            {row.free_trip_used ? "Used" : "Unused"}
                          </Badge>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <Badge
                              className={
                                (row.subscription_status ?? "").toUpperCase() === "ACTIVE"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-100 text-slate-700"
                              }
                            >
                              {subscriptionLabel}
                            </Badge>
                            <span className="text-xs text-gray-500">{billing}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2">{formatDate(row.current_period_end)}</td>
                        <td className="px-4 py-2">
                          <div className="flex flex-col">
                            <span>{formatCurrency(row.last_payment_amount)}</span>
                            <span className="text-xs text-gray-500">
                              {row.last_payment_status ?? "—"} · {formatDate(row.last_payment_at)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          Page {page} of {totalPages} ({total} total)
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
