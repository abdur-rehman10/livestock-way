import { useState } from "react";
import { Check, Loader2 } from "lucide-react";

type PlanCode = "FREE" | "PAID";
type BillingCycle = "MONTHLY" | "YEARLY";

type IndividualPlanChooseViewProps = {
  defaultSelected?: PlanCode;
  onSelectChange?: (plan: PlanCode) => void;
  onContinue?: (plan: PlanCode) => void;
  onPaidCheckout?: (billingCycle: BillingCycle) => Promise<void>;
  onBack?: () => void;
  onLoginTab?: () => void;
  continueDisabled?: boolean;
  variant?: "auth" | "embedded";
  getCtaConfig?: (plan: PlanCode) => { label?: string; disabled?: boolean };
  checkoutLoading?: boolean;
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

const PLANS: Plan[] = [
  {
    code: "FREE",
    name: "Free Plan",
    description: "Free plan includes one free trip",
    priceMonthly: 0,
    priceYearly: 0,
    note: "No credit card required",
    features: [
      "Access to Loadboard",
      "Access to Truckboard",
      "Finance Module",
      "Trip Tracking",
      "Documents Validation for 1 trip",
      "3 outside Trips",
      "Direct Payment & Escrow Payment Access",
      "Marketplace access",
      "Trip Analytics",
    ],
  },
  {
    code: "PAID",
    name: "Paid Plan",
    description: "Paid plan includes unlimited free trips",
    priceMonthly: 70.0,
    priceYearly: 700.0,
    note: "$700.00/yr (2 months free)",
    features: [
      "Access to Loadboard",
      "Access to Truckboard",
      "Finance Module",
      "Trip Tracking",
      "Documents Validation for 1 trip",
      "Unlimited Trips",
      "Direct Payment & Escrow Payment Access",
      "Marketplace access",
      "Trip Analytics",
    ],
  },
];

export default function IndividualPlanChooseView({
  defaultSelected = "FREE",
  onSelectChange,
  onContinue,
  onPaidCheckout,
  onBack,
  continueDisabled = false,
  variant = "auth",
  getCtaConfig,
  checkoutLoading = false,
}: IndividualPlanChooseViewProps) {
  const [selectedCode, setSelectedCode] = useState<PlanCode>(defaultSelected);
  const [paying, setPaying] = useState<BillingCycle | null>(null);

  const selectedPlan = PLANS.find((p) => p.code === selectedCode) ?? PLANS[0];

  const handleSelect = (code: PlanCode) => {
    setSelectedCode(code);
    onSelectChange?.(code);
  };

  const handleContinue = () => {
    onContinue?.(selectedCode);
  };

  const handlePaidCheckout = async (cycle: BillingCycle) => {
    if (!onPaidCheckout) return;
    setPaying(cycle);
    try {
      await onPaidCheckout(cycle);
    } catch {
      setPaying(null);
    }
  };

  const isEmbedded = variant === "embedded";
  const ctaConfig = getCtaConfig?.(selectedPlan.code) ?? {};
  const ctaLabel =
    ctaConfig.label ?? "Continue with Free Plan";
  const ctaDisabled = continueDisabled || Boolean(ctaConfig.disabled);
  const isLoading = checkoutLoading || paying !== null;

  return (
    <div
      className={
        isEmbedded
          ? "max-w-5xl mx-auto"
          : "min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8"
      }
    >
      <div className="w-full max-w-6xl mx-auto space-y-6">
        {!isEmbedded && (
          <div className="flex flex-col items-center text-center gap-2 mb-2">
            <div className="h-12 w-12 rounded-full text-white flex items-center justify-center shadow-md" style={{ backgroundColor: '#10b981' }}>
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <div>
              <div className="text-xl font-semibold text-gray-900">LivestockWay</div>
              <div className="text-sm text-gray-600">Create your account</div>
            </div>
          </div>
        )}

        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Choose your plan</h1>
          <p className="text-sm text-gray-600">Select a plan to finish signup. You can upgrade later.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {PLANS.map((plan) => {
            const isSelected = plan.code === selectedCode;
            const monthlyDisplay =
              plan.code === "FREE" ? "$0" : `$${plan.priceMonthly.toFixed(2)}`;
            return (
              <button
                key={plan.code}
                type="button"
                onClick={() => handleSelect(plan.code)}
                disabled={isLoading}
                className={`w-full text-left relative cursor-pointer transition-all duration-300 overflow-hidden rounded-2xl bg-white focus:outline-none disabled:opacity-70 ${
                  isSelected
                    ? "shadow-xl border border-transparent"
                    : "hover:shadow-lg border border-gray-200"
                }`}
                style={isSelected ? { boxShadow: '0 0 0 2px #10b981' } : {}}
              >
                {isSelected && (
                  <span className="absolute top-4 right-4 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-sm" style={{ backgroundColor: '#10b981' }}>
                    Selected
                  </span>
                )}
                <div className="p-6 flex flex-col gap-4 h-full">
                  <div className="flex flex-col gap-1">
                    <div className="text-base font-semibold text-gray-900">{plan.name}</div>
                    {plan.description && (
                      <p className="text-xs text-gray-600">{plan.description}</p>
                    )}
                    <div className="flex items-baseline mt-1">
                      <span className="text-4xl font-bold text-gray-900">{monthlyDisplay}</span>
                      <span className="text-gray-600 ml-1 text-sm">/mo</span>
                    </div>
                    {plan.code === "FREE" ? (
                      <div className="text-xs mt-1 font-medium" style={{ color: '#10b981' }}>
                        No credit card required
                      </div>
                    ) : (
                      plan.note && (
                        <div className="text-xs mt-1 font-medium" style={{ color: '#10b981' }}>
                          {plan.note}
                        </div>
                      )
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-gray-900">Features</div>
                    <div className="space-y-2">
                      {plan.features.map((item) => (
                        <div key={item} className="flex items-start gap-2">
                          <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#10b981' }} />
                          <span className="text-gray-700 text-xs leading-relaxed">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-3">
          {selectedCode === "FREE" ? (
            <button
              className="w-full p-3 max-w-2xl text-white h-11 rounded-lg font-semibold shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed text-sm"
              style={{ backgroundColor: ctaDisabled ? '#9ca3af' : '#10b981' }}
              onMouseEnter={(e) => !ctaDisabled && (e.currentTarget.style.backgroundColor = '#059669')}
              onMouseLeave={(e) => !ctaDisabled && (e.currentTarget.style.backgroundColor = '#10b981')}
              onClick={handleContinue}
              disabled={ctaDisabled || isLoading}
            >
              {ctaLabel}
            </button>
          ) : (
            <>
              <p className="text-sm text-gray-600 font-medium">Choose billing cycle to continue:</p>
              <div className="w-full max-w-2xl grid grid-cols-2 gap-3">
                <button
                  className="relative p-4 rounded-xl border-2 text-left transition-all hover:border-emerald-400 hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed bg-white"
                  style={{ borderColor: '#10b981' }}
                  onClick={() => handlePaidCheckout("MONTHLY")}
                  disabled={isLoading}
                >
                  <div className="text-lg font-bold text-gray-900">
                    ${selectedPlan.priceMonthly.toFixed(2)}<span className="text-sm font-normal text-gray-500">/mo</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Billed monthly. Cancel anytime.</div>
                  <div className="mt-3 w-full text-center py-2 rounded-lg text-white text-sm font-semibold" style={{ backgroundColor: '#10b981' }}>
                    {paying === "MONTHLY" ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Redirecting to Stripe…
                      </span>
                    ) : "Pay Monthly"}
                  </div>
                </button>
                <button
                  className="relative p-4 rounded-xl border-2 text-left transition-all hover:border-emerald-400 hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed bg-white"
                  style={{ borderColor: '#d1d5db' }}
                  onClick={() => handlePaidCheckout("YEARLY")}
                  disabled={isLoading}
                >
                  <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-white text-[10px] font-semibold" style={{ backgroundColor: '#10b981' }}>
                    Save 17%
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    ${selectedPlan.priceYearly?.toFixed(2)}<span className="text-sm font-normal text-gray-500">/yr</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">2 months free. Billed yearly.</div>
                  <div className="mt-3 w-full text-center py-2 rounded-lg text-white text-sm font-semibold" style={{ backgroundColor: '#10b981' }}>
                    {paying === "YEARLY" ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Redirecting to Stripe…
                      </span>
                    ) : "Pay Yearly"}
                  </div>
                </button>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <svg viewBox="0 0 60 25" className="h-4" fill="none">
                  <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a12.9 12.9 0 0 1-4.56.78c-4.01 0-6.83-2.5-6.83-7.14 0-4.34 2.65-7.26 6.48-7.26 3.84 0 5.81 2.95 5.81 7.14 0 .55-.05 1.26-.1 1.56zm-8-2.48h4.38c0-1.73-.73-2.82-2.14-2.82-1.31 0-2.13 1.03-2.24 2.82zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.56 2.58 5.56 7.06 0 5.02-2.7 7.94-5.59 7.94zm-.96-11.02c-.84 0-1.44.28-1.96.76l.03 6.58c.5.44 1.09.72 1.93.72 1.48 0 2.5-1.62 2.5-4.05s-1.04-4.01-2.5-4.01zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7 4.13-.88v3.56h-4.13V.87zm-5.09 3.5c.64 0 1.26.09 1.26.09v3.73s-.61-.05-1.07-.05c-1.17 0-2.07.53-2.07 2.14v9.73h-4.12V5.88l3.71-.31.23 1.36c.79-1 1.86-1.56 3.06-1.56zM11.79 20.3c-2.68 0-4.54-.75-4.54-.75v-3.38s1.83.75 3.94.75c1.14 0 2.04-.24 2.04-1.18 0-2.02-6.15-1.53-6.15-6.35 0-3.32 2.63-4.86 5.58-4.86 1.89 0 3.97.61 3.97.61v3.35s-1.51-.67-3.39-.67c-1.14 0-2.02.33-2.02 1.1 0 2.07 6.15 1.54 6.15 6.27 0 3.4-2.66 5.1-5.58 5.1z" fill="#635bff" />
                </svg>
                <span className="text-xs text-gray-400">Secure payment via Stripe</span>
              </div>
            </>
          )}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              disabled={isLoading}
              className="text-gray-600 hover:text-gray-900 text-xs transition-colors disabled:opacity-50"
            >
              ← Back to Info
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
