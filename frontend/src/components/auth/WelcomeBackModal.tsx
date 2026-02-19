import { X, Bell } from 'lucide-react';
import { Button } from '../ui/button';

interface WelcomeBackModalProps {
  userName: string;
  onClose: () => void;
  onViewNotifications: () => void;
}

export function WelcomeBackModal({ userName, onClose, onViewNotifications }: WelcomeBackModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-300">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#e8f7f0' }}>
            <Bell className="w-8 h-8" style={{ color: '#42b883' }} />
          </div>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-2xl mb-2">Welcome Back, {userName}!</h2>
          <p className="text-gray-600">Don't miss your notifications</p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={onViewNotifications}
            className="w-full py-3 text-white rounded-lg transition-all"
            style={{ backgroundColor: '#42b883' }}
          >
            View Notifications
          </Button>
          <Button onClick={onClose} variant="outline" className="w-full py-3">
            Continue to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
