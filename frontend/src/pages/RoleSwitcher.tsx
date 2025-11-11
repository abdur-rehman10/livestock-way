import { Truck, Package } from 'lucide-react';
import { Button } from '../components/ui/button';

interface RoleSwitcherProps {
  currentRole?: 'shipper' | 'driver';
  onRoleSwitch?: (role: 'shipper' | 'driver') => void;
}

export function RoleSwitcher({ currentRole = 'driver', onRoleSwitch }: RoleSwitcherProps) {
  return (
    <div className="inline-flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
      <Button
        variant={currentRole === 'driver' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onRoleSwitch?.('driver')}
        className={`gap-2 ${
          currentRole === 'driver'
            ? 'bg-[#29CA8D] hover:bg-[#24b67d] text-white'
            : 'hover:bg-gray-200'
        }`}
      >
        <Truck className="w-4 h-4" />
        Driver
      </Button>
      <Button
        variant={currentRole === 'shipper' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onRoleSwitch?.('shipper')}
        className={`gap-2 ${
          currentRole === 'shipper'
            ? 'bg-[#F97316] hover:bg-[#ea580c] text-white'
            : 'hover:bg-gray-200'
        }`}
      >
        <Package className="w-4 h-4" />
        Shipper
      </Button>
    </div>
  );
}
