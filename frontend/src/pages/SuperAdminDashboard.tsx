import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { 
  Shield,
  Bell,
  User,
  Users,
  Building2,
  DollarSign,
  TrendingUp,
  Search,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Activity,
  CreditCard,
  FileText,
  Settings
} from 'lucide-react';
import logo from '../assets/livestockway-logo.svg';

interface SuperAdminDashboardProps {
  onLogout?: () => void;
}

const platformStats = {
  activeUsers: 1842,
  activeTrips: 156,
  monthlyRevenue: 284500,
  platformUptime: 99.8,
};

const recentUsers = [
  {
    id: 1,
    name: 'Swift Livestock Transport',
    type: 'Hauler',
    status: 'Active',
    subscription: 'Fleet Plan',
    joined: 'Oct 15, 2025',
    revenue: '$12,400',
  },
  {
    id: 2,
    name: 'John Smith',
    type: 'Driver',
    status: 'Pending KYC',
    subscription: 'Free',
    joined: 'Oct 20, 2025',
    revenue: '$0',
  },
  {
    id: 3,
    name: 'Green Valley Ranch',
    type: 'Shipper',
    status: 'Active',
    subscription: 'Herd Plan',
    joined: 'Oct 12, 2025',
    revenue: '$8,900',
  },
  {
    id: 4,
    name: 'Clean Wash Services',
    type: 'Provider',
    status: 'Active',
    subscription: 'Basic',
    joined: 'Sep 28, 2025',
    revenue: '$3,200',
  },
];

const subscriptionPlans = [
  { name: 'Herd Plan', users: 342, revenue: '$68,400', growth: '+12%' },
  { name: 'Precision Plan', users: 156, revenue: '$93,600', growth: '+8%' },
  { name: 'Fleet Plan', users: 89, revenue: '$106,800', growth: '+15%' },
  { name: 'Free', users: 1255, revenue: '$0', growth: '+25%' },
];

const supportTickets = [
  {
    id: 1,
    title: 'Payment not processed',
    user: 'Swift Livestock Transport',
    priority: 'High',
    status: 'Open',
    created: '2 hours ago',
  },
  {
    id: 2,
    title: 'Driver verification issue',
    user: 'John Smith',
    priority: 'Medium',
    status: 'In Progress',
    created: '5 hours ago',
  },
  {
    id: 3,
    title: 'Trip tracking error',
    user: 'Green Valley Ranch',
    priority: 'Low',
    status: 'Open',
    created: '1 day ago',
  },
];

const complianceAlerts = [
  {
    id: 1,
    type: 'License Expiry',
    description: 'Driver license expiring in 15 days',
    user: 'Sarah Williams',
    severity: 'Warning',
  },
  {
    id: 2,
    type: 'Document Missing',
    description: 'Insurance certificate not uploaded',
    user: 'Premium Cattle Carriers',
    severity: 'Critical',
  },
  {
    id: 3,
    type: 'Route Compliance',
    description: 'Rest stop requirement violation',
    user: 'Robert Johnson',
    severity: 'Warning',
  },
];

export function SuperAdminDashboard({ onLogout }: SuperAdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#172039] text-white sticky top-0 z-50">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={logo} 
              alt="LivestockWay" 
              className="h-8"
            />
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#29CA8D]" />
              <span className="text-lg">Super Admin</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 active:bg-white/20 focus-visible:ring-white/40"
            >
              <Bell className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 active:bg-white/20 focus-visible:ring-white/40"
              onClick={() => onLogout?.()}
            >
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-t border-white/10">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start bg-transparent h-auto p-0 border-b-0">
              <TabsTrigger 
                value="overview" 
                className="text-white/70 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-[#29CA8D] rounded-none bg-transparent"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="users" 
                className="text-white/70 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-[#29CA8D] rounded-none bg-transparent"
              >
                Users & Companies
              </TabsTrigger>
              <TabsTrigger 
                value="billing" 
                className="text-white/70 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-[#29CA8D] rounded-none bg-transparent"
              >
                Billing
              </TabsTrigger>
              <TabsTrigger 
                value="support" 
                className="text-white/70 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-[#29CA8D] rounded-none bg-transparent"
              >
                Support
              </TabsTrigger>
              <TabsTrigger 
                value="compliance" 
                className="text-white/70 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-[#29CA8D] rounded-none bg-transparent"
              >
                Compliance
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                className="text-white/70 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-[#29CA8D] rounded-none bg-transparent"
              >
                Analytics
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 max-w-7xl mx-auto">
        <Tabs value={activeTab} className="w-full">
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-0">
            <div>
              <h1 className="text-2xl text-[#172039] mb-1">Platform Overview</h1>
              <p className="text-gray-600">Real-time platform metrics and system health</p>
            </div>

            {/* Platform Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-gray-600">Active Users</CardTitle>
                    <Users className="w-5 h-5 text-[#29CA8D]" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl text-[#172039] mb-1">{platformStats.activeUsers.toLocaleString()}</div>
                  <div className="text-sm text-[#29CA8D]">↑ 142 this week</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-gray-600">Active Trips</CardTitle>
                    <Activity className="w-5 h-5 text-[#F97316]" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl text-[#172039] mb-1">{platformStats.activeTrips}</div>
                  <div className="text-sm text-gray-600">Across platform</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-gray-600">Monthly Revenue</CardTitle>
                    <DollarSign className="w-5 h-5 text-[#29CA8D]" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl text-[#172039] mb-1">${(platformStats.monthlyRevenue / 1000).toFixed(0)}K</div>
                  <div className="text-sm text-[#29CA8D]">↑ 23% vs last month</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-gray-600">Platform Uptime</CardTitle>
                    <TrendingUp className="w-5 h-5 text-[#29CA8D]" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl text-[#172039] mb-1">{platformStats.platformUptime}%</div>
                  <div className="text-sm text-gray-600">Last 30 days</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Users */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent User Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentUsers.slice(0, 4).map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="text-base text-gray-900 mb-1">{user.name}</div>
                          <div className="text-sm text-gray-600">{user.type} • {user.subscription}</div>
                        </div>
                        <Badge 
                          variant={user.status === 'Active' ? 'default' : 'secondary'}
                          className={user.status === 'Active' ? 'bg-[#29CA8D]' : ''}
                        >
                          {user.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Compliance Alerts */}
              <Card>
                <CardHeader>
                  <CardTitle>Compliance Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {complianceAlerts.map((alert) => (
                      <div key={alert.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                          alert.severity === 'Critical' ? 'text-red-500' : 'text-[#F97316]'
                        }`} />
                        <div className="flex-1">
                          <div className="text-base text-gray-900 mb-1">{alert.type}</div>
                          <div className="text-sm text-gray-600 mb-1">{alert.description}</div>
                          <div className="text-xs text-gray-500">{alert.user}</div>
                        </div>
                        <Badge variant={alert.severity === 'Critical' ? 'destructive' : 'secondary'}>
                          {alert.severity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users & Companies Tab */}
          <TabsContent value="users" className="space-y-6 mt-0">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl text-[#172039] mb-1">User Management</h1>
                <p className="text-gray-600">Manage all platform users and companies</p>
              </div>
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Button className="bg-[#29CA8D] hover:bg-[#24b67d]">
                  <Users className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              </div>
            </div>

            <div className="grid gap-3">
              {recentUsers.map((user) => (
                <Card key={user.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#29CA8D]/10 rounded-full flex items-center justify-center">
                          {user.type === 'Hauler' ? (
                            <Building2 className="w-6 h-6 text-[#29CA8D]" />
                          ) : (
                            <User className="w-6 h-6 text-[#29CA8D]" />
                          )}
                        </div>
                        <div>
                          <div className="text-base text-gray-900 mb-1">{user.name}</div>
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            <span>{user.type}</span>
                            <span>•</span>
                            <span>{user.subscription}</span>
                            <span>•</span>
                            <span>Joined {user.joined}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-base text-gray-900 mb-1">{user.revenue}</div>
                          <Badge 
                            variant={user.status === 'Active' ? 'default' : 'secondary'}
                            className={user.status === 'Active' ? 'bg-[#29CA8D]' : 'bg-[#F97316]'}
                          >
                            {user.status}
                          </Badge>
                        </div>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6 mt-0">
            <div>
              <h1 className="text-2xl text-[#172039] mb-1">Billing & Revenue</h1>
              <p className="text-gray-600">Subscription plans and revenue tracking</p>
            </div>

            <div className="grid gap-4">
              {subscriptionPlans.map((plan) => (
                <Card key={plan.name}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg text-gray-900 mb-2">{plan.name}</h3>
                        <div className="text-sm text-gray-600">
                          {plan.users.toLocaleString()} active subscriptions
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl text-[#29CA8D] mb-1">{plan.revenue}</div>
                        <div className="text-sm text-gray-600">
                          <span className="text-[#29CA8D]">{plan.growth}</span> this month
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Support Tab */}
          <TabsContent value="support" className="space-y-6 mt-0">
            <div>
              <h1 className="text-2xl text-[#172039] mb-1">Support Tickets</h1>
              <p className="text-gray-600">Manage customer support requests</p>
            </div>

            <div className="grid gap-3">
              {supportTickets.map((ticket) => (
                <Card key={ticket.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-base text-gray-900 mb-1">{ticket.title}</h3>
                        <div className="text-sm text-gray-600 mb-2">{ticket.user}</div>
                        <div className="flex items-center gap-3">
                          <Badge 
                            variant={
                              ticket.priority === 'High' ? 'destructive' :
                              ticket.priority === 'Medium' ? 'default' :
                              'secondary'
                            }
                            className={ticket.priority === 'Medium' ? 'bg-[#F97316]' : ''}
                          >
                            {ticket.priority}
                          </Badge>
                          <Badge variant="outline">{ticket.status}</Badge>
                          <span className="text-xs text-gray-500">{ticket.created}</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        View Ticket
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="mt-0">
            <Card>
              <CardContent className="p-12 text-center">
                <Activity className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <h3 className="text-lg mb-2">Analytics Dashboard</h3>
                <p className="text-sm text-gray-600">Platform usage metrics and trends</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance" className="mt-0">
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <h3 className="text-lg mb-2">Compliance Management</h3>
                <p className="text-sm text-gray-600">Monitor platform-wide compliance and regulations</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
