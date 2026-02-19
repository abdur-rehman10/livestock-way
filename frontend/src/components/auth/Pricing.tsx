import { ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import logo from '../../assets/livestockway-logo.svg';

interface PricingProps {
  onBack: () => void;
  onSelectPlan: (plan: "resource-provider" | "shipper" | "hauler" | "enterprise") => void;
}

type PlanKey = "resource-provider" | "shipper" | "hauler" | "enterprise";

const plans: { key: PlanKey; label: string }[] = [
  { key: "resource-provider", label: "Resource Provider" },
  { key: "shipper", label: "Shipper" },
  { key: "hauler", label: "Independent Hauler" },
  { key: "enterprise", label: "Enterprise" },
];

const features: { name: string; availability: Record<PlanKey, boolean> }[] = [
  {
    name: "Marketplace & Listings",
    availability: { "resource-provider": true, shipper: true, hauler: true, enterprise: true },
  },
  {
    name: "Load & Truck Board Access",
    availability: { "resource-provider": false, shipper: true, hauler: true, enterprise: true },
  },
  {
    name: "Live Tracking & Monitoring",
    availability: { "resource-provider": false, shipper: true, hauler: true, enterprise: true },
  },
  {
    name: "Secure Payments (Escrow)",
    availability: { "resource-provider": false, shipper: true, hauler: true, enterprise: true },
  },
  {
    name: "Compliance & Safety Tools",
    availability: { "resource-provider": false, shipper: true, hauler: true, enterprise: true },
  },
  {
    name: "AI Route Planning (Livestock)",
    availability: { "resource-provider": false, shipper: false, hauler: true, enterprise: true },
  },
  {
    name: "Fleet & Driver Management",
    availability: { "resource-provider": false, shipper: false, hauler: false, enterprise: true },
  },
];

function CheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="11" r="11" fill="#42b883" fillOpacity={0.15} />
      <path d="M6.5 11.5L9.5 14.5L15.5 8" stroke="#42b883" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="11" r="11" fill="#ef4444" fillOpacity={0.12} />
      <path d="M8 8L14 14M14 8L8 14" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Pricing({ onBack, onSelectPlan }: PricingProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-6">
      <div className="w-full max-w-5xl">
        <div className="flex items-center gap-4 mb-10">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 hover:bg-gray-100">
            <ArrowLeft className="size-5" />
          </Button>
          <img src={logo} alt="LivestockWay" className="h-9" />
        </div>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Choose Your Plan</h1>
          <p className="text-gray-500 mt-2 text-base">Compare features across all roles</p>
        </div>

        <Card className="overflow-hidden shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-5 px-6 font-semibold text-gray-700 bg-gray-50/80 min-w-[200px]">
                    Features
                  </th>
                  {plans.map((plan) => (
                    <th
                      key={plan.key}
                      className="py-5 px-6 font-semibold text-gray-700 text-center bg-gray-50/80 min-w-[160px]"
                    >
                      {plan.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {features.map((feature, idx) => (
                  <tr key={feature.name} className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"} border-b border-gray-100 last:border-b-0`}>
                    <td className="py-4 px-6 font-medium text-gray-700">{feature.name}</td>
                    {plans.map((plan) => (
                      <td key={plan.key} className="py-4 px-6 text-center">
                        <span className="inline-flex justify-center">
                          {feature.availability[plan.key] ? <CheckIcon /> : <XIcon />}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}

                <tr className="border-t-2 border-gray-200 bg-white">
                  <td className="py-6 px-6 font-semibold text-gray-800 text-base">Pricing</td>

                  <td className="py-6 px-6 text-center">
                    <span className="text-sm font-semibold text-gray-700">Free Unlimited</span>
                  </td>

                  <td className="py-6 px-6 text-center">
                    <span className="text-sm font-semibold text-gray-700">Free Unlimited</span>
                  </td>

                  <td className="py-6 px-6 text-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <Button
                        className="text-white text-xs px-5 py-2"
                        style={{ backgroundColor: "#42b883" }}
                        onClick={() => onSelectPlan("hauler")}
                      >
                        $50 per Month
                      </Button>
                      <span className="text-[11px] text-gray-500">(2 Free Trips at signup)</span>
                    </div>
                  </td>

                  <td className="py-6 px-6 text-center">
                    <Button
                      className="text-white text-xs px-5 py-2"
                      style={{ backgroundColor: "#42b883" }}
                      onClick={() => onSelectPlan("enterprise")}
                    >
                      Starting from $70 per month
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
