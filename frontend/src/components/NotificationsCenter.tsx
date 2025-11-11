import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Bell, 
  X, 
  ArrowLeft,
  Check,
  CheckCheck,
  DollarSign,
  Truck,
  AlertTriangle,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

interface Notification {
  id: string;
  type: 'trip' | 'payment' | 'system' | 'alert';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionLabel?: string;
  actionUrl?: string;
}

const mockNotifications: Notification[] = [
  {
    id: 'N001',
    type: 'trip',
    title: 'Trip Started',
    message: 'Trip #T001 has been started by John Smith. Austin, TX → Dallas, TX',
    timestamp: '5 minutes ago',
    read: false,
    actionLabel: 'Track Trip',
  },
  {
    id: 'N002',
    type: 'payment',
    title: 'Payment Received',
    message: 'Payment of $850 has been credited to your wallet for Trip #T004',
    timestamp: '1 hour ago',
    read: false,
    actionLabel: 'View Wallet',
  },
  {
    id: 'N003',
    type: 'alert',
    title: 'Document Expiring Soon',
    message: 'Your vehicle insurance for TX-1234 expires in 30 days. Please renew.',
    timestamp: '2 hours ago',
    read: false,
    actionLabel: 'Update Document',
  },
  {
    id: 'N004',
    type: 'trip',
    title: 'Trip Completed',
    message: 'Trip #T005 completed successfully. Please rate your experience.',
    timestamp: '1 day ago',
    read: true,
    actionLabel: 'Rate Trip',
  },
  {
    id: 'N005',
    type: 'system',
    title: 'New Feature Available',
    message: 'Auto-match feature is now available! Find the best carriers automatically.',
    timestamp: '2 days ago',
    read: true,
    actionLabel: 'Learn More',
  },
  {
    id: 'N006',
    type: 'payment',
    title: 'Withdrawal Processed',
    message: 'Your withdrawal of $1,000 has been processed. Funds will arrive in 2-3 business days.',
    timestamp: '3 days ago',
    read: true,
  },
];

interface NotificationsCenterProps {
  onBack: () => void;
}

export function NotificationsCenter({ onBack }: NotificationsCenterProps) {
  const [notifications, setNotifications] = useState(mockNotifications);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    toast.success('All notifications marked as read');
  };

  const handleArchive = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
    toast.success('Notification archived');
  };

  const handleAction = (notification: Notification) => {
    toast.info(`Opening: ${notification.actionLabel}`);
    handleMarkAsRead(notification.id);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'trip':
        return <Truck className="w-5 h-5 text-blue-600" />;
      case 'payment':
        return <DollarSign className="w-5 h-5 text-green-600" />;
      case 'alert':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'system':
        return <Info className="w-5 h-5 text-purple-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'trip':
        return 'bg-blue-50';
      case 'payment':
        return 'bg-green-50';
      case 'alert':
        return 'bg-orange-50';
      case 'system':
        return 'bg-purple-50';
      default:
        return 'bg-gray-50';
    }
  };

  const filteredNotifications = activeTab === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl text-[#172039]">Notifications</h1>
              <p className="text-sm text-gray-600">
                {unreadCount} unread
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b px-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="w-full justify-start bg-transparent">
            <TabsTrigger value="all" className="data-[state=active]:border-b-2 data-[state=active]:border-[#29CA8D] rounded-none">
              All
              <Badge variant="secondary" className="ml-2">
                {notifications.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="unread" className="data-[state=active]:border-b-2 data-[state=active]:border-[#29CA8D] rounded-none">
              Unread
              {unreadCount > 0 && (
                <Badge className="ml-2 bg-[#29CA8D] text-white">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Notifications List */}
      <div className="p-4 space-y-2">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <h3 className="text-lg text-gray-900 mb-2">No notifications</h3>
            <p className="text-sm text-gray-600">
              {activeTab === 'unread' 
                ? 'You have read all notifications' 
                : 'You will see notifications here when you have them'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`${!notification.read ? 'border-l-4 border-l-[#29CA8D]' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getBgColor(notification.type)}`}>
                    {getIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className={`text-base ${!notification.read ? 'text-gray-900' : 'text-gray-600'}`}>
                        {notification.title}
                      </h4>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-[#29CA8D] rounded-full flex-shrink-0 mt-2" />
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {notification.timestamp}
                      </span>
                      
                      <div className="flex gap-2">
                        {notification.actionLabel && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAction(notification)}
                          >
                            {notification.actionLabel}
                          </Button>
                        )}
                        {!notification.read && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMarkAsRead(notification.id)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleArchive(notification.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
