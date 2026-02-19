import { ArrowLeft, Truck, Building2, Package, Wrench } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import type { AuthUserRole } from './AuthWrapper';
import logo from '../../assets/livestockway-logo.svg';

interface SocialSignUpRoleSelectionProps {
  onSelectRole: (role: AuthUserRole) => void;
  onViewPricing: () => void;
  onShowEnterprisePricing: () => void;
  onBack: () => void;
}

export function SocialSignUpRoleSelection({ onSelectRole, onViewPricing, onShowEnterprisePricing, onBack }: SocialSignUpRoleSelectionProps) {
  const roles = [
    {
      id: 'hauler' as AuthUserRole,
      title: 'Independent Haulers',
      description: 'Owner-operators and independent livestock & pets drivers.',
      icon: Truck,
      pricing: 'First 3 trips free',
      showPricing: false
    },
    {
      id: 'enterprise' as AuthUserRole,
      title: 'Livestock Logistics Enterprise',
      description: 'Companies & Individual managing trucks, drivers, and routes.',
      icon: Building2,
      pricing: 'Starting from $70/month',
      showPricing: true
    },
    {
      id: 'shipper' as AuthUserRole,
      title: 'Shipper',
      description: 'Anyone shipping livestock or pets, Farm Managers, Pet Owners',
      icon: Package,
      pricing: 'Free Unlimited',
      showPricing: false
    },
    {
      id: 'resource-provider' as AuthUserRole,
      title: 'Resource Providers',
      description: 'Services and facilities supporting livestock transport',
      icon: Wrench,
      pricing: 'Free Unlimited',
      showPricing: false
    }
  ];

  const colorSchemes = {
    'hauler': {
      border: 'border-2 border-blue-200 hover:border-blue-400',
      bg: 'bg-gradient-to-br from-blue-50/50 to-white',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      badgeBg: 'bg-blue-100',
      badgeText: 'text-blue-700'
    },
    'enterprise': {
      border: 'border border-purple-200 hover:border-purple-400',
      bg: 'bg-gradient-to-br from-purple-50/50 to-white',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      badgeBg: 'bg-purple-100',
      badgeText: 'text-purple-700'
    },
    'shipper': {
      border: 'border border-orange-200 hover:border-orange-400',
      bg: 'bg-gradient-to-br from-orange-50/50 to-white',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      badgeBg: 'bg-orange-100',
      badgeText: 'text-orange-700'
    },
    'resource-provider': {
      border: 'border border-teal-200 hover:border-teal-400',
      bg: 'bg-gradient-to-br from-teal-50/50 to-white',
      iconBg: 'bg-teal-100',
      iconColor: 'text-teal-600',
      badgeBg: 'bg-teal-100',
      badgeText: 'text-teal-700'
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-3xl p-5">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[#42b883] hover:text-[#379e6f] mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to Sign In</span>
        </button>

        <div className="flex justify-center mb-4">
          <img src={logo} alt="Livestockway" className="h-24 w-auto" />
        </div>

        <div className="text-center mb-5">
          <h2 className="text-xl mb-1">Welcome! Select Your Role</h2>
          <p className="text-gray-600 text-sm">Choose how you'd like to use Livestockway</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {roles.map((role) => {
            const Icon = role.icon;
            const scheme = colorSchemes[role.id as keyof typeof colorSchemes];

            return (
              <Card
                key={role.id}
                className={`p-4 hover:shadow-md transition-all ${scheme.border} ${scheme.bg}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg ${scheme.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${scheme.iconColor}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-base mb-1">{role.title}</h3>
                    <div className={`inline-block px-2 py-0.5 rounded ${scheme.badgeBg} ${scheme.badgeText} text-xs mb-2`}>
                      {role.pricing}
                    </div>
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                      {role.description}
                    </p>
                    <Button
                      onClick={() => {
                        if (role.showPricing) {
                          onShowEnterprisePricing();
                        } else {
                          onSelectRole(role.id);
                        }
                      }}
                      size="sm"
                      style={{ backgroundColor: '#42b883' }}
                      className="w-full text-white hover:opacity-90 transition-all h-8 text-xs"
                    >
                      Select Role
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="text-center">
          <Button
            onClick={onViewPricing}
            variant="outline"
            size="sm"
            className="border-2 border-[#42b883] text-[#42b883] hover:bg-[#42b883]/10 text-xs h-8"
          >
            View Detailed Pricing & Features
          </Button>
        </div>
      </Card>
    </div>
  );
}
