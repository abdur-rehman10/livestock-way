import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { toast } from '../lib/swal';
import { useHaulerSubscription } from "../hooks/useHaulerSubscription";
import { useNavigate } from "react-router-dom";
import IndividualPlanChooseView from "../components/IndividualPlanChooseView";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

export default function HaulerSubscription() {
  const { data: state, loading, planCode, needsPayment } = useHaulerSubscription();
  const navigate = useNavigate();

  const isActive = useMemo(() => {
    if (!state) return false;
    if ((state.subscription_status ?? "").toUpperCase() !== "ACTIVE") return false;
    if (!state.subscription_current_period_end) return true;
    const end = new Date(state.subscription_current_period_end);
    return Number.isFinite(end.getTime()) && end.getTime() > Date.now();
  }, [state]);

  const defaultSelected = (planCode ?? "FREE") as "FREE" | "PAID";

  const getCtaConfig = (selected: "FREE" | "PAID") => {
    if (isActive) {
      return { label: "You're subscribed", disabled: true };
    }
    if (needsPayment && selected === "PAID") {
      return { label: "Complete payment" };
    }
    if ((planCode ?? "").toUpperCase() === "FREE" && selected === "FREE") {
      return { label: "You're on Free Plan", disabled: true };
    }
    if ((planCode ?? "").toUpperCase() === "PAID" && selected === "FREE") {
      return { label: "You can downgrade later", disabled: true };
    }
    return {};
  };

  const handleContinue = (selected: "FREE" | "PAID") => {
    if (isActive) return;
    if ((planCode ?? "").toUpperCase() === "PAID" && selected === "FREE") {
      toast.info("You can downgrade later");
      return;
    }
    if (selected === "PAID") {
      navigate("/hauler/payment");
      return;
    }
    toast.success("You’re on the Free plan.");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#172039]">Subscription</h1>
        <p className="text-sm text-gray-600">Manage your individual hauler plan.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Status</CardTitle>
          <CardDescription>
            {state ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge
                  className={
                    isActive
                      ? "bg-primary-100 text-emerald-800"
                      : "bg-slate-100 text-slate-700"
                  }
                >
                  {state.subscription_status ?? "NONE"}
                </Badge>
                <span className="text-gray-600">
                  Period ends: {formatDate(state.subscription_current_period_end)}
                </span>
                <Separator orientation="vertical" className="h-4" />
                <span className="text-gray-600">
                  Free trip used: {state.free_trip_used ? "Yes" : "No"}
                </span>
                {state.billing_cycle ? (
                  <>
                    <Separator orientation="vertical" className="h-4" />
                    <span className="text-gray-600">
                      Billing cycle: {state.billing_cycle}
                    </span>
                  </>
                ) : null}
              </div>
            ) : (
              <span>Loading…</span>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      <IndividualPlanChooseView
        variant="embedded"
        defaultSelected={defaultSelected}
        onContinue={handleContinue}
        continueDisabled={loading}
        getCtaConfig={getCtaConfig}
      />
    </div>
  );
}
