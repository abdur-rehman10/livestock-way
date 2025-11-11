import { Truck, Home, Wrench } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

interface RoleCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  borderColor: string;
  selected: boolean;
  onClick: () => void;
}

function RoleCard({ icon, title, description, color, borderColor, selected, onClick }: RoleCardProps) {
  return (
    <Card
      className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
        selected ? `ring-2 ${borderColor} shadow-lg` : 'hover:scale-105'
      }`}
      onClick={onClick}
    >
      <div className="flex flex-col items-center text-center gap-4">
        <div className={`w-16 h-16 rounded-full ${color} flex items-center justify-center text-white`}>
          {icon}
        </div>
        <h3 className="text-xl">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </Card>
  );
}

interface LandingPageProps {
  onSelectRole?: (role: 'hauler' | 'shipper' | 'stakeholder') => void;
}

export default function LandingPage({ onSelectRole }: LandingPageProps) {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const navigate = useNavigate();

  const roles = [
    {
      id: 'hauler',
      icon: <Truck className="w-8 h-8" />,
      title: 'Hauler',
      description: 'Truck owners & trucking companies. Manage your fleet, bid on loads, and grow your business.',
      color: 'bg-[#29CA8D]',
      borderColor: 'ring-[#29CA8D]',
    },
    {
      id: 'shipper',
      icon: <Home className="w-8 h-8" />,
      title: 'Shipper',
      description: 'Farm & animal owners. Post loads, find reliable carriers, and track your shipments.',
      color: 'bg-[#F97316]',
      borderColor: 'ring-[#F97316]',
    },
    {
      id: 'stakeholder',
      icon: <Wrench className="w-8 h-8" />,
      title: 'Service Provider',
      description: 'Offer washout, feed, vet, fuel services. Connect with haulers and shippers.',
      color: 'bg-[#6B7280]',
      borderColor: 'ring-[#6B7280]',
    },
  ];

  const handleContinue = () => {
    if (selectedRole) {
      onSelectRole?.(selectedRole as 'hauler' | 'shipper' | 'stakeholder');
      navigate('/login', { state: { role: selectedRole } });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#D1D5DB] to-white flex items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="mb-6">
            <div className="w-20 h-20 bg-[#29CA8D] rounded-full flex items-center justify-center mx-auto mb-4">
              <Truck className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl mb-2">LivestockWay</h1>
          </div>
          <p className="text-xl text-muted-foreground">Revolutionizing Livestock Mobility</p>
        </div>

        {/* Role Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {roles.map((role) => (
            <RoleCard
              key={role.id}
              icon={role.icon}
              title={role.title}
              description={role.description}
              color={role.color}
              borderColor={role.borderColor}
              selected={selectedRole === role.id}
              onClick={() => setSelectedRole(role.id)}
            />
          ))}
        </div>

        {/* Continue Button */}
        <div className="flex flex-col items-center gap-4">
          <Button
            size="lg"
            className="w-full md:w-auto px-12"
            disabled={!selectedRole}
            onClick={handleContinue}
          >
            Continue
          </Button>
          <Button variant="ghost" onClick={() => navigate('/login')}>
            Already have an account? Sign in
          </Button>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>By continuing, you agree to our Terms of Service and Privacy Policy</p>
        </div>
      </div>
    </div>
  );
}
