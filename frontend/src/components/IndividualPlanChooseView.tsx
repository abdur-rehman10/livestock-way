import { useState } from "react";
import { Check } from "lucide-react";

type PlanCode = "FREE" | "PAID";

type IndividualPlanChooseViewProps = {
  defaultSelected?: PlanCode;
  onSelectChange?: (plan: PlanCode) => void;
  onContinue?: (plan: PlanCode) => void;
  onBack?: () => void;
  onLoginTab?: () => void;
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
    priceMonthly: 10.0,
    priceYearly: 100.0,
    note: "$100.00/yr (2 months free)",
    features: [
      "Access to Loadboard",
      "Access to Truckboard",
      "Finance Module",
      "Trip Tracking",
      "Documents Validation for 1 trip",
      "outside Trips",
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
  onBack,
  onLoginTab,
  continueDisabled = false,
  variant = "auth",
  getCtaConfig,
}: IndividualPlanChooseViewProps) {
  const [selectedCode, setSelectedCode] = useState<PlanCode>(defaultSelected);

  const selectedPlan = PLANS.find((p) => p.code === selectedCode) ?? PLANS[0];

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
  const ctaDisabled = continueDisabled || Boolean(ctaConfig.disabled);

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
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
            </div>
            <div>
              <div className="text-xl font-semibold text-gray-900">LivestockWay</div>
              <div className="text-sm text-gray-600">Create your account</div>
            </div>
          </div>
        )}

        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Choose your plan
          </h1>
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
                className={`w-full text-left relative cursor-pointer transition-all duration-300 overflow-hidden rounded-2xl bg-white focus:outline-none ${
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
          <button
            className="w-full p-3 max-w-2xl text-white h-11 rounded-lg font-semibold shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed text-sm"
            style={{ backgroundColor: ctaDisabled ? '#9ca3af' : '#10b981' }}
            onMouseEnter={(e) => !ctaDisabled && (e.currentTarget.style.backgroundColor = '#059669')}
            onMouseLeave={(e) => !ctaDisabled && (e.currentTarget.style.backgroundColor = '#10b981')}
            onClick={handleContinue}
            disabled={ctaDisabled}
          >
            {ctaLabel}
          </button>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-gray-600 hover:text-gray-900 text-xs transition-colors"
            >
              ← Back to Info
            </button>
          )}
        </div>
      </div>
    </div>
  );
}