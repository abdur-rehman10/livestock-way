import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Separator } from "../components/ui/separator";
import { toast } from '../lib/swal';
import { useHaulerSubscription } from "../hooks/useHaulerSubscription";
import { fetchPublicIndividualPackages } from "../api/marketplace";
import type { IndividualPackage } from "../api/marketplace";
import { storage, STORAGE_KEYS } from "../lib/storage";
import { API_BASE_URL } from "../lib/api";

type PackageResponse = {
  packages: IndividualPackage[];
  paid_monthly_price: number | null;
  paid_yearly_price: number | null;
};

export default function HaulerPayment() {
  const navigate = useNavigate();
  const { data, loading, refresh, subscriptionStatus, isIndividualHauler, isPaid } = useHaulerSubscription();
  const [packages, setPackages] = useState<PackageResponse | null>(null);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [packagesError, setPackagesError] = useState<string | null>(null);
  const [paying, setPaying] = useState<"MONTHLY" | "YEARLY" | null>(null);

  const planCode = storage.get<string | null>(STORAGE_KEYS.INDIVIDUAL_PLAN_CODE, null);

  useEffect(() => {
    if (loading) return;
    if (!isIndividualHauler || planCode !== "PAID") {
      navigate("/hauler/subscription", { replace: true });
      return;
    }
    if (isPaid || (subscriptionStatus ?? "").toUpperCase() === "ACTIVE") {
      navigate("/hauler/dashboard", { replace: true });
    }
  }, [isIndividualHauler, planCode, isPaid, subscriptionStatus, loading, navigate]);

  useEffect(() => {
    let ignore = false;
    setPackagesLoading(true);
    setPackagesError(null);
    fetchPublicIndividualPackages()
      .then((resp) => {
        if (ignore) return;
        setPackages(resp as any);
      })
      .catch((err: any) => {
        if (ignore) return;
        setPackagesError(err?.message || "Failed to load plans");
      })
      .finally(() => {
        if (ignore) return;
        setPackagesLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const paidMonthly = useMemo(() => packages?.paid_monthly_price ?? null, [packages]);
  const paidYearly = useMemo(
    () =>
      packages?.paid_yearly_price ??
      (paidMonthly != null ? Number((paidMonthly * 10).toFixed(2)) : null),
    [packages, paidMonthly]
  );

  const handlePay = async (billing_cycle: "MONTHLY" | "YEARLY") => {
    try {
      setPaying(billing_cycle);
      const resp = await fetch(`${API_BASE_URL}/api/hauler/subscription/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: typeof window !== "undefined" ? `Bearer ${localStorage.getItem("token") ?? ""}` : "",
        },
        body: JSON.stringify({ billing_cycle }),
      });
      if (!resp.ok) {
        const msg = await resp.text().catch(() => "");
        throw new Error(msg || "Payment failed");
      }
      await fetch(`${API_BASE_URL}/api/auth/onboarding-complete`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: typeof window !== "undefined" ? `Bearer ${localStorage.getItem("token") ?? ""}` : "",
        },
      }).catch(() => null);
      toast.success("Subscription activated.", {
        description: "You now have full access to all hauler features.",
      });
      await refresh();
      navigate("/hauler/dashboard", { replace: true });
    } catch (err: any) {
      toast.error(err?.message || "Payment failed");
    } finally {
      setPaying(null);
    }
  };

  const paidFeatures = [
    "Unlimited Trips",
    "Unlimited Loadboard",
    "Unlimited Truckboard",
    "Finance Module",
    "Marketplace",
    "Direct + Escrow",
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#172039]">Complete Payment</h1>
        <p className="text-sm text-slate-600">
          Finish activating your Paid plan. Select billing cycle to continue.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Paid Plan</CardTitle>
          <CardDescription>Full access to loadboard, truckboard, and unlimited trips.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {packagesError && <div className="text-xs text-rose-600">{packagesError}</div>}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border rounded-lg p-4 space-y-2">
              <div className="text-lg font-semibold text-[#172039]">
                Monthly {paidMonthly != null ? `— $${paidMonthly.toFixed(2)}` : "(pricing unavailable)"}
              </div>
              <p className="text-sm text-slate-600">Billed monthly. Cancel anytime.</p>
              <Button
                className="w-full bg-[#29CA8D] hover:bg-[#24b67d]"
                disabled={paying === "MONTHLY" || paidMonthly === null}
                onClick={() => handlePay("MONTHLY")}
              >
                {paying === "MONTHLY" ? "Processing…" : "Pay Monthly (Dummy)"}
              </Button>
            </div>
            <div className="border rounded-lg p-4 space-y-2">
              <div className="text-lg font-semibold text-[#172039]">
                Yearly {paidYearly != null ? `— $${paidYearly.toFixed(2)}` : "(pricing unavailable)"}
              </div>
              <p className="text-sm text-slate-600">2 months free when billed yearly.</p>
              <Button
                className="w-full bg-[#29CA8D] hover:bg-[#24b67d]"
                disabled={paying === "YEARLY" || paidYearly === null}
                onClick={() => handlePay("YEARLY")}
              >
                {paying === "YEARLY" ? "Processing…" : "Pay Yearly (Dummy, 2 months free)"}
              </Button>
            </div>
          </div>
          <Separator />
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">What’s included</p>
            <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
              {paidFeatures.map((f, idx) => (
                <li key={idx}>{f}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
