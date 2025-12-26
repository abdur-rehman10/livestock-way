import { useEffect, useMemo, useState } from "react";
import {
  fetchPublicIndividualPackages,
  type IndividualPackage,
  type IndividualPackagesResponse,
} from "../api/marketplace";

export function useIndividualPackages() {
  const [data, setData] = useState<IndividualPackagesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const resp = await fetchPublicIndividualPackages();
        if (mounted) {
          setData(resp);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.message ?? "Failed to load individual packages");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const packagesByCode = useMemo<Record<string, IndividualPackage>>(() => {
    const map: Record<string, IndividualPackage> = {};
    for (const pkg of data?.packages ?? []) {
      const code = (pkg.code ?? "").toString().toUpperCase();
      if (code) {
        map[code] = pkg;
      }
    }
    return map;
  }, [data]);

  const freePackage = packagesByCode["FREE"] ?? null;
  const paidPackage = packagesByCode["PAID"] ?? null;
  const paidMonthlyPrice = data?.paid_monthly_price ?? null;
  const paidYearlyPrice = data?.paid_yearly_price ?? null;
  const currency = data?.currency ?? null;

  return {
    freePackage,
    paidPackage,
    paidMonthlyPrice,
    paidYearlyPrice,
    currency,
    loading,
    error,
  };
}
