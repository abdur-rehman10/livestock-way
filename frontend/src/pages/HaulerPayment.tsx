import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Separator } from "../components/ui/separator";
import { Loader2, CheckCircle, CreditCard } from "lucide-react";
import { toast } from '../lib/swal';
import { useHaulerSubscription } from "../hooks/useHaulerSubscription";
import { fetchPublicIndividualPackages, createStripeSubscriptionCheckout } from "../api/marketplace";
import type { IndividualPackage } from "../api/marketplace";
import { storage, STORAGE_KEYS } from "../lib/storage";

type PackageResponse = {
  packages: IndividualPackage[];
  paid_monthly_price: number | null;
  paid_yearly_price: number | null;
};

export default function HaulerPayment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loading, refresh, subscriptionStatus, isPaid, planCode: hookPlanCode } = useHaulerSubscription();
  const [packages, setPackages] = useState<PackageResponse | null>(null);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [packagesError, setPackagesError] = useState<string | null>(null);
  const [paying, setPaying] = useState<"MONTHLY" | "YEARLY" | null>(null);

  const storagePlanCode = storage.get<string | null>(STORAGE_KEYS.INDIVIDUAL_PLAN_CODE, null);
  const effectivePlanCode = hookPlanCode || storagePlanCode;
  const status = searchParams.get("status");

  useEffect(() => {
    if (status === "success") {
      toast.success("Subscription activated!", {
        description: "Your payment was processed. You now have full access.",
      });
      refresh();
    } else if (status === "cancelled") {
      toast.info("Payment cancelled. You can try again anytime.");
    }
  }, [status]);

  useEffect(() => {
    if (loading) return;
    if (effectivePlanCode?.toUpperCase() !== "PAID") {
      navigate("/hauler/subscription", { replace: true });
      return;
    }
    if (isPaid || (subscriptionStatus ?? "").toUpperCase() === "ACTIVE") {
      if (!status) navigate("/hauler/dashboard", { replace: true });
    }
  }, [effectivePlanCode, isPaid, subscriptionStatus, loading, navigate, status]);

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
      const result = await createStripeSubscriptionCheckout(billing_cycle);
      if (result.url) {
        window.location.href = result.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      let msg = "Payment failed";
      try {
        const parsed = JSON.parse(err?.message || "{}");
        msg = parsed?.error || parsed?.message || msg;
      } catch {
        msg = err?.message || msg;
      }
      toast.error(msg);
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

  if (status === "success" && (isPaid || (subscriptionStatus ?? "").toUpperCase() === "ACTIVE")) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
            <h2 className="text-xl font-semibold text-green-800">Subscription Active!</h2>
            <p className="text-sm text-green-700">
              Your paid plan is now active. Enjoy unlimited access to all hauler features.
            </p>
            <Button
              className="bg-[#29CA8D] hover:bg-[#24b67d]"
              onClick={() => navigate("/hauler/dashboard", { replace: true })}
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#172039]">Complete Payment</h1>
        <p className="text-sm text-slate-600">
          Select a billing cycle to continue. You'll be redirected to Stripe for secure payment.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Paid Plan
          </CardTitle>
          <CardDescription>Full access to loadboard, truckboard, and unlimited trips.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {packagesError && <div className="text-xs text-rose-600">{packagesError}</div>}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border rounded-lg p-4 space-y-2 hover:border-[#29CA8D] transition-colors">
              <div className="text-lg font-semibold text-[#172039]">
                Monthly {paidMonthly != null ? `— $${paidMonthly.toFixed(2)}` : "(pricing unavailable)"}
              </div>
              <p className="text-sm text-slate-600">Billed monthly. Cancel anytime.</p>
              <Button
                className="w-full bg-[#29CA8D] hover:bg-[#24b67d]"
                disabled={paying !== null || paidMonthly === null}
                onClick={() => handlePay("MONTHLY")}
              >
                {paying === "MONTHLY" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Redirecting to Stripe…
                  </>
                ) : (
                  "Pay Monthly"
                )}
              </Button>
            </div>
            <div className="border rounded-lg p-4 space-y-2 relative hover:border-[#29CA8D] transition-colors">
              <div className="absolute -top-2 right-3 bg-[#29CA8D] text-white text-xs px-2 py-0.5 rounded-full font-medium">
                Save 17%
              </div>
              <div className="text-lg font-semibold text-[#172039]">
                Yearly {paidYearly != null ? `— $${paidYearly.toFixed(2)}` : "(pricing unavailable)"}
              </div>
              <p className="text-sm text-slate-600">2 months free when billed yearly.</p>
              <Button
                className="w-full bg-[#29CA8D] hover:bg-[#24b67d]"
                disabled={paying !== null || paidYearly === null}
                onClick={() => handlePay("YEARLY")}
              >
                {paying === "YEARLY" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Redirecting to Stripe…
                  </>
                ) : (
                  "Pay Yearly"
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-3">
            <svg viewBox="0 0 60 25" className="h-4" fill="none">
              <path
                d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a12.9 12.9 0 0 1-4.56.78c-4.01 0-6.83-2.5-6.83-7.14 0-4.34 2.65-7.26 6.48-7.26 3.84 0 5.81 2.95 5.81 7.14 0 .55-.05 1.26-.1 1.56zm-8-2.48h4.38c0-1.73-.73-2.82-2.14-2.82-1.31 0-2.13 1.03-2.24 2.82zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.56 2.58 5.56 7.06 0 5.02-2.7 7.94-5.59 7.94zm-.96-11.02c-.84 0-1.44.28-1.96.76l.03 6.58c.5.44 1.09.72 1.93.72 1.48 0 2.5-1.62 2.5-4.05s-1.04-4.01-2.5-4.01zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7 4.13-.88v3.56h-4.13V.87zm-5.09 3.5c.64 0 1.26.09 1.26.09v3.73s-.61-.05-1.07-.05c-1.17 0-2.07.53-2.07 2.14v9.73h-4.12V5.88l3.71-.31.23 1.36c.79-1 1.86-1.56 3.06-1.56zM11.79 20.3c-2.68 0-4.54-.75-4.54-.75v-3.38s1.83.75 3.94.75c1.14 0 2.04-.24 2.04-1.18 0-2.02-6.15-1.53-6.15-6.35 0-3.32 2.63-4.86 5.58-4.86 1.89 0 3.97.61 3.97.61v3.35s-1.51-.67-3.39-.67c-1.14 0-2.02.33-2.02 1.1 0 2.07 6.15 1.54 6.15 6.27 0 3.4-2.66 5.1-5.58 5.1z"
                fill="#635bff"
              />
            </svg>
            <span className="text-xs text-slate-500">Payments processed securely by Stripe</span>
          </div>

          <Separator />
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">What's included</p>
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
