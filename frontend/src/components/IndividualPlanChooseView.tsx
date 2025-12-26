import { useEffect, useState } from "react";
import { Check, ArrowLeft } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { useIndividualPackages } from "../hooks/useIndividualPackages";

type PlanCode = "FREE" | "PAID";

type IndividualPlanChooseViewProps = {
  defaultSelected?: PlanCode;
  onSelectChange?: (plan: PlanCode) => void;
  onContinue?: (plan: PlanCode) => void;
  onBack?: () => void;
  continueDisabled?: boolean;
  variant?: "auth" | "embedded";
  getCtaConfig?: (plan: PlanCode) => { label?: string; disabled?: boolean };
};

type Plan = {
  code: PlanCode;
  name: string;
  description?: string | null;
  priceMonthly: number;
  priceYearly: number | null;
  note: string | null;
  features: string[];
};

const FALLBACK_FEATURES: Record<PlanCode, string[]> = {
  FREE: [
    "Access to Loadboard",
    "Access to Truckboard",
    "Finance Module",
    "Trip Tracking for 1 Trip",
    "Documents Validation for 1 trip",
    "3 outside Trips",
    "Direct Payment & Escrow Payment Access",
    "Marketplace access",
    "Trip Analytics",
  ],
  PAID: [
    "Unlimited Trips",
    "Unlimited Loadboard Access",
    "Unlimited Truckboard Access",
    "Finance Module",
    "Marketplace Access",
    "Direct & Escrow Payment Access",
  ],
};

export default function IndividualPlanChooseView({
  defaultSelected = "FREE",
  onSelectChange,
  onContinue,
  onBack,
  continueDisabled = false,
  variant = "auth",
  getCtaConfig,
}: IndividualPlanChooseViewProps) {
  const {
    freePackage,
    paidPackage,
    paidMonthlyPrice,
    paidYearlyPrice,
    currency,
    loading,
    error,
  } = useIndividualPackages();
  const [selectedCode, setSelectedCode] = useState<PlanCode>(defaultSelected);

  useEffect(() => {
    setSelectedCode(defaultSelected);
  }, [defaultSelected]);

  const currencyLabel = currency === "USD" || !currency ? "$" : currency;
  const paidMonthly = paidMonthlyPrice ?? 0;
  const paidYearly =
    paidYearlyPrice ??
    (paidMonthlyPrice != null ? Number((paidMonthlyPrice * 10).toFixed(2)) : null);

  const formatPaid = (amount: number | null) =>
    currencyLabel === "$"
      ? `$${(amount ?? 0).toFixed(2)}`
      : `${currencyLabel} ${(amount ?? 0).toFixed(2)}`;

  const freeFeatures =
    freePackage?.features?.feature_list &&
    Array.isArray(freePackage.features.feature_list) &&
    freePackage.features.feature_list.length
      ? freePackage.features.feature_list
      : FALLBACK_FEATURES.FREE;
  const paidFeatures =
    paidPackage?.features?.feature_list &&
    Array.isArray(paidPackage.features.feature_list) &&
    paidPackage.features.feature_list.length
      ? paidPackage.features.feature_list
      : FALLBACK_FEATURES.PAID;

  const plans: Plan[] = [
    {
      code: "FREE",
      name: freePackage?.name ?? "Free Plan",
      description: freePackage?.description ?? null,
      priceMonthly: 0,
      priceYearly: 0,
      note: "No credit card required",
      features: freeFeatures,
    },
    {
      code: "PAID",
      name: paidPackage?.name ?? "Paid Plan",
      description: paidPackage?.description ?? null,
      priceMonthly: paidMonthly,
      priceYearly: paidYearly,
      note: `${formatPaid(paidYearly ?? paidMonthly * 10)}/yr (2 months free)`,
      features: paidFeatures,
    },
  ];

  const selectedPlan = plans.find((p) => p.code === selectedCode) ?? plans[0];

  const handleSelect = (code: PlanCode) => {
    setSelectedCode(code);
    onSelectChange?.(code);
  };

  const handleContinue = () => {
    onContinue?.(selectedCode);
  };

  const isEmbedded = variant === "embedded";
  const ctaConfig = getCtaConfig?.(selectedPlan.code) ?? {};
  const ctaLabel =
    ctaConfig.label ??
    (selectedPlan.code === "FREE" ? "Continue with Free Plan" : "Continue with Paid Plan");
  const ctaDisabled = continueDisabled || loading || Boolean(ctaConfig.disabled);

  return (
    <div
      className={
        isEmbedded
          ? "max-w-5xl mx-auto"
          : "min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8"
      }
    >
      <div className={isEmbedded ? "max-w-5xl mx-auto space-y-6" : "max-w-5xl mx-auto space-y-8"}>
        {!isEmbedded && (
          <>
            <div className="flex flex-col items-center text-center gap-2">
              <div className="h-12 w-12 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xl font-semibold">
                LW
              </div>
              <div>
                <div className="text-xl font-semibold text-gray-900">LivestockWay</div>
                <div className="text-sm text-gray-600">Create your account</div>
              </div>
            </div>

            <Tabs defaultValue="signup" className="w-full">
              <TabsList className="bg-white shadow-sm border w-full max-w-sm grid grid-cols-2 rounded-full p-1 mx-auto">
                <TabsTrigger
                  value="signin"
                  className="rounded-full data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="rounded-full data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </>
        )}

        {/* LW_PLAN_UI_START */}
        <div className="space-y-2 text-center">
          <h1 className={isEmbedded ? "text-2xl font-bold text-gray-900" : "text-3xl font-bold text-gray-900"}>
            Choose your plan
          </h1>
          <p className="text-gray-600">Select a plan to finish signup. You can upgrade later.</p>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {[0, 1].map((key) => (
              <div
                key={key}
                className="h-80 rounded-2xl bg-white border border-gray-200 animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {plans.map((plan) => {
              const isSelected = plan.code === selectedCode;
              const monthlyDisplay =
                plan.code === "FREE" ? "$0" : `${formatPaid(plan.priceMonthly)}`;
              return (
                <button
                  key={plan.code}
                  type="button"
                  onClick={() => handleSelect(plan.code)}
                  className={`w-full text-left relative cursor-pointer transition-all duration-300 overflow-hidden rounded-2xl bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
                    isSelected
                      ? "ring-2 ring-emerald-500 shadow-xl border border-transparent"
                      : "hover:shadow-lg border border-gray-200"
                  }`}
                >
                  {isSelected && (
                    <span className="absolute top-4 right-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Selected
                    </span>
                  )}
                  <div className="p-6 sm:p-8 flex flex-col gap-4 h-full">
                    <div className="flex flex-col gap-2">
                      <div className="text-lg font-semibold text-gray-900">{plan.name}</div>
                      {plan.description && (
                        <p className="text-sm text-gray-600">{plan.description}</p>
                      )}
                      <div className="flex items-baseline">
                        <span className="text-5xl font-bold text-gray-900">{monthlyDisplay}</span>
                        <span className="text-gray-600 ml-1">/mo</span>
                      </div>
                      {plan.code === "FREE" ? (
                        <div className="text-emerald-600 text-sm mt-2 font-medium">
                          No credit card required
                        </div>
                      ) : (
                        plan.note && (
                          <div className="text-emerald-600 text-sm mt-2 font-medium">
                            {plan.note}
                          </div>
                        )
                      )}
                    </div>
                    <div className="space-y-3">
                      <div className="text-sm font-semibold text-gray-900 mb-4">Features</div>
                      <div className="space-y-3">
                        {plan.features.map((item) => (
                          <div key={item} className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-700 text-sm">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-col items-center gap-4">
          <button
            className="w-full max-w-2xl bg-emerald-500 hover:bg-emerald-600 text-white h-12 rounded-lg font-semibold shadow-lg transition disabled:opacity-60"
            onClick={handleContinue}
            disabled={ctaDisabled}
          >
            {ctaLabel}
          </button>
            {(onBack || !isEmbedded) && (
              <button
                type="button"
                onClick={onBack}
                className="text-gray-600 hover:text-gray-900 text-sm transition-colors"
              >
                ← Back to Info
              </button>
            )}
          </div>
        {/* LW_PLAN_UI_END */}
      </div>
    </div>
  );
}
