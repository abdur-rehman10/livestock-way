import { useEffect, useState } from "react";
import {
  fetchHaulerSubscription,
  type HaulerSubscriptionState,
} from "../api/marketplace";
import { toast } from "sonner";
import { storage, STORAGE_KEYS } from "../lib/storage";

export function useHaulerSubscription() {
  const [data, setData] = useState<HaulerSubscriptionState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await fetchHaulerSubscription();
      setData(resp);
    } catch (err: any) {
      const msg = err?.message ?? "Failed to load subscription";
      setError(msg);
      // Only toast for non-auth errors to avoid noise for non-haulers.
      if (!err?.status || ![401, 403].includes(err.status)) {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isIndividualHauler =
    (data?.hauler_type ?? "").toString().toUpperCase() === "INDIVIDUAL";
  const subscriptionStatus = data?.subscription_status ?? "NONE";
  const freeTripUsed = Boolean(data?.free_trip_used);
  const planCode =
    (data?.individual_plan_code ??
      storage.get<string | null>(STORAGE_KEYS.INDIVIDUAL_PLAN_CODE, null) ??
      "") as HaulerSubscriptionState["individual_plan_code"];
  const normalizedPlanCode = (planCode ?? "").toString().toUpperCase();
  const monthlyPrice =
    data?.monthly_price ?? data?.current_individual_monthly_price ?? null;
  const yearlyPrice =
    data?.yearly_price ??
    (monthlyPrice !== null && monthlyPrice !== undefined
      ? Number((monthlyPrice * 10).toFixed(2))
      : null);
  const isPaid = subscriptionStatus.toUpperCase() === "ACTIVE";
  const needsPayment =
    normalizedPlanCode === "PAID" && subscriptionStatus.toUpperCase() !== "ACTIVE";

  return {
    data,
    loading,
    error,
    refresh,
    isIndividualHauler,
    freeTripUsed,
    subscriptionStatus,
    monthlyPrice,
    yearlyPrice,
    isPaid,
    planCode: normalizedPlanCode || null,
    needsPayment,
  };
}
