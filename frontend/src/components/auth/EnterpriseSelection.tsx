import { X, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

interface EnterpriseSelectionProps {
  onClose: () => void;
  onSelectTier: (tier: "tier1" | "tier2" | "tier3" | "consultation") => void;
}

const tiers = [
  {
    id: 'tier1' as const,
    name: 'Starter',
    price: '$70',
    period: '/month',
    description: 'For small operations getting started',
    features: [
      'Up to 5 trucks',
      'Up to 10 drivers',
      'Basic route management',
      'Email support',
      'Standard reporting',
    ],
    highlighted: false,
  },
  {
    id: 'tier2' as const,
    name: 'Professional',
    price: '$150',
    period: '/month',
    description: 'For growing logistics businesses',
    features: [
      'Up to 20 trucks',
      'Up to 50 drivers',
      'Advanced route optimization',
      'Priority support',
      'Advanced analytics & reporting',
      'API access',
    ],
    highlighted: true,
  },
  {
    id: 'tier3' as const,
    name: 'Business',
    price: '$250',
    period: '/month',
    description: 'For large-scale enterprises',
    features: [
      'Unlimited trucks',
      'Unlimited drivers',
      'Full route optimization suite',
      'Dedicated account manager',
      'Custom integrations',
      'White-label options',
      'SLA guarantees',
    ],
    highlighted: false,
  },
];

export function EnterpriseSelection({ onClose, onSelectTier }: EnterpriseSelectionProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold">Enterprise Plans</h2>
            <p className="text-gray-600 text-sm mt-1">Choose the plan that fits your operation</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {tiers.map((tier) => (
            <Card
              key={tier.id}
              className={`p-5 flex flex-col transition-all ${
                tier.highlighted
                  ? 'border-2 border-[#42b883] shadow-lg ring-1 ring-[#42b883]/20'
                  : 'border border-gray-200 hover:border-gray-300'
              }`}
            >
              {tier.highlighted && (
                <div className="text-xs font-medium text-[#42b883] mb-2 uppercase tracking-wide">
                  Most Popular
                </div>
              )}
              <h3 className="text-lg font-semibold">{tier.name}</h3>
              <div className="mt-2 mb-1">
                <span className="text-3xl font-bold">{tier.price}</span>
                <span className="text-gray-500 text-sm">{tier.period}</span>
              </div>
              <p className="text-gray-500 text-sm mb-4">{tier.description}</p>

              <ul className="space-y-2 mb-6 flex-1">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-[#42b883] flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => onSelectTier(tier.id)}
                className={`w-full ${
                  tier.highlighted
                    ? 'text-white hover:opacity-90'
                    : 'text-white hover:opacity-90'
                }`}
                style={{ backgroundColor: tier.highlighted ? '#42b883' : '#6b7280' }}
              >
                Select {tier.name}
              </Button>
            </Card>
          ))}
        </div>

        <div className="text-center border-t pt-5">
          <p className="text-gray-600 text-sm mb-3">
            Need a custom solution for your large-scale operation?
          </p>
          <Button
            onClick={() => onSelectTier('consultation')}
            variant="outline"
            className="border-2 border-[#42b883] text-[#42b883] hover:bg-[#42b883]/10"
          >
            Book a Consultation
          </Button>
        </div>
      </Card>
    </div>
  );
}
