import { useEffect, useState, useCallback, useMemo, Fragment } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { 
  Shield,
  Bell,
  User,
  Users,
  Truck,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  FileText
} from 'lucide-react';
import logo from '../assets/livestockway-logo.svg';
import {
  listKycRequests,
  reviewKycRequest,
  type KycRequestRecord,
} from '../api/kyc';
import {
  fetchAdminStats,
  fetchAdminUsers,
  updateAdminUserStatus,
  fetchSupportTickets,
  updateSupportTicketStatus,
  fetchSupportTicketMessages,
  postSupportTicketMessage,
  fetchAdminDisputes,
  fetchAdminEarnings,
  type AdminStats,
  type AdminUserRecord,
  type SupportTicketRecord,
  type AdminDisputeRecord,
  type AdminEarningRecord,
  type AdminEarningsResponse,
} from '../api/admin';
import {
  fetchDisputeMessages,
  sendDisputeMessage,
  startDisputeReview,
  resolveDisputeReleaseToHauler,
  resolveDisputeRefundToShipper,
  resolveDisputeSplit,
  type DisputeMessage,
} from '../api/disputes';
import type { SupportTicketMessage } from '../lib/types';

type DisputeChatTarget = 'shipper' | 'hauler';

function normalizeRoleSlug(value?: string | null) {
  return (value ?? '').toLowerCase().replace(/_/g, '-');
}

function formatRoleLabel(value?: string | null) {
  if (!value) return 'User';
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function messageBelongsToChannel(message: DisputeMessage, channel: DisputeChatTarget) {
  const sender = normalizeRoleSlug(message.sender_role);
  const recipient = normalizeRoleSlug(message.recipient_role) || 'all';
  if (channel === 'shipper') {
    if (sender.startsWith('shipper')) return true;
  } else {
    if (sender.startsWith('hauler') || sender.startsWith('driver')) return true;
  }
  if (sender.startsWith('super-admin')) {
    if (channel === 'shipper') {
      return recipient === 'shipper' || recipient === 'all' || recipient === '';
    }
    return recipient === 'hauler' || recipient === 'all' || recipient === '';
  }
  return false;
}

interface SuperAdminDashboardProps {
  onLogout?: () => void;
}

const subscriptionPlans = [
  { name: 'Herd Plan', users: 342, revenue: '$68,400', growth: '+12%' },
  { name: 'Precision Plan', users: 156, revenue: '$93,600', growth: '+8%' },
  { name: 'Fleet Plan', users: 89, revenue: '$106,800', growth: '+15%' },
  { name: 'Free', users: 1255, revenue: '$0', growth: '+25%' },
];

export function SuperAdminDashboard({ onLogout }: SuperAdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'hauler' | 'shipper' | 'stakeholder'>('all');
  const [supportTickets, setSupportTickets] = useState<SupportTicketRecord[]>([]);
  const [supportFilter, setSupportFilter] = useState<'all' | 'open' | 'closed'>('open');
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportError, setSupportError] = useState<string | null>(null);
  const [activeSupportTicket, setActiveSupportTicket] = useState<SupportTicketRecord | null>(null);
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);
  const [supportMessages, setSupportMessages] = useState<SupportTicketMessage[]>([]);
  const [supportMessagesLoading, setSupportMessagesLoading] = useState(false);
  const [supportMessageError, setSupportMessageError] = useState<string | null>(null);
  const [supportMessageInput, setSupportMessageInput] = useState("");
  const [kycRequests, setKycRequests] = useState<KycRequestRecord[]>([]);
  const [kycFilter, setKycFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [kycLoading, setKycLoading] = useState(false);
  const [kycError, setKycError] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [disputes, setDisputes] = useState<AdminDisputeRecord[]>([]);
  const [disputesLoading, setDisputesLoading] = useState(false);
  const [disputesError, setDisputesError] = useState<string | null>(null);
  const [disputeFilter, setDisputeFilter] = useState<'open' | 'under_review' | 'all'>('open');
  const [activeDispute, setActiveDispute] = useState<AdminDisputeRecord | null>(null);
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [disputeMessages, setDisputeMessages] = useState<DisputeMessage[]>([]);
  const [earningsData, setEarningsData] = useState<AdminEarningsResponse | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [earningsError, setEarningsError] = useState<string | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [splitHauler, setSplitHauler] = useState("");
  const [splitShipper, setSplitShipper] = useState("");
  const [disputeChatTarget, setDisputeChatTarget] = useState<DisputeChatTarget>('shipper');

  useEffect(() => {
    setStatsLoading(true);
    setStatsError(null);
    fetchAdminStats()
      .then((data) => setStats(data))
      .catch((err) => setStatsError(err?.message || 'Failed to load stats'))
      .finally(() => setStatsLoading(false));
  }, []);

  useEffect(() => {
    setEarningsLoading(true);
    setEarningsError(null);
    fetchAdminEarnings()
      .then((data) => setEarningsData(data))
      .catch((err) => setEarningsError(err?.message || 'Failed to load platform earnings'))
      .finally(() => setEarningsLoading(false));
  }, []);

  useEffect(() => {
    let ignore = false;
    if (activeTab !== 'users' && users.length > 0) {
      return;
    }
    setUsersLoading(true);
    setUsersError(null);
    fetchAdminUsers({
      status: userStatusFilter,
      role: userRoleFilter,
    })
      .then((data) => {
        if (!ignore) {
          setUsers(data.items);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setUsersError(err?.message || 'Failed to load users');
        }
      })
      .finally(() => {
        if (!ignore) {
          setUsersLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [activeTab, userStatusFilter, userRoleFilter, users.length]);

  useEffect(() => {
    let ignore = false;
    if (activeTab !== 'support' && supportTickets.length > 0) {
      return;
    }
    setSupportLoading(true);
    setSupportError(null);
    fetchSupportTickets({ status: supportFilter })
      .then((data) => {
        if (!ignore) {
          setSupportTickets(data.items);
        }
      })
      .catch((err) => {
        if (!ignore) setSupportError(err?.message || 'Failed to load tickets');
      })
      .finally(() => {
        if (!ignore) setSupportLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [activeTab, supportFilter, supportTickets.length]);

  const loadSupportMessages = useCallback(async (ticketId: number) => {
    setSupportMessagesLoading(true);
    setSupportMessageError(null);
    try {
      const data = await fetchSupportTicketMessages(ticketId);
      setSupportMessages(data.items ?? []);
    } catch (err: any) {
      setSupportMessageError(err?.message || 'Failed to load ticket conversation');
      setSupportMessages([]);
    } finally {
      setSupportMessagesLoading(false);
    }
  }, []);

  const handleOpenSupportTicket = useCallback(
    (ticket: SupportTicketRecord) => {
      setActiveSupportTicket(ticket);
      setSupportDialogOpen(true);
      setSupportMessageInput("");
      loadSupportMessages(ticket.id);
    },
    [loadSupportMessages]
  );

  useEffect(() => {
    if (!supportDialogOpen) {
      setActiveSupportTicket(null);
      setSupportMessages([]);
      setSupportMessageInput("");
      setSupportMessageError(null);
    }
  }, [supportDialogOpen]);

  useEffect(() => {
    if (activeTab !== 'compliance') return;
    setKycLoading(true);
    setKycError(null);
    listKycRequests(kycFilter === 'all' ? undefined : kycFilter)
      .then((data) => setKycRequests(data))
      .catch((err) => {
        setKycError(err?.message || 'Failed to load KYC requests');
      })
      .finally(() => setKycLoading(false));
  }, [activeTab, kycFilter]);

  const loadDisputes = useCallback(() => {
    setDisputesLoading(true);
    setDisputesError(null);
    fetchAdminDisputes({ status: disputeFilter })
      .then((data) => setDisputes(data.items))
      .catch((err) => setDisputesError(err?.message || 'Failed to load disputes'))
      .finally(() => setDisputesLoading(false));
  }, [disputeFilter]);

  useEffect(() => {
    loadDisputes();
  }, [loadDisputes]);

  const loadDisputeMessages = useCallback(async (disputeId: string) => {
    setMessagesLoading(true);
    setMessageError(null);
    try {
      const data = await fetchDisputeMessages(disputeId);
      setDisputeMessages(data.items ?? []);
    } catch (err: any) {
      setMessageError(err?.message || 'Failed to load messages');
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const filteredDisputeMessages = useMemo(
    () => disputeMessages.filter((msg) => messageBelongsToChannel(msg, disputeChatTarget)),
    [disputeMessages, disputeChatTarget]
  );

  const handleOpenDispute = useCallback(
    (dispute: AdminDisputeRecord) => {
      setActiveDispute(dispute);
      setMessageInput("");
      setSplitHauler("");
      setSplitShipper("");
       setDisputeChatTarget('shipper');
      setDisputeDialogOpen(true);
      loadDisputeMessages(dispute.id);
    },
    [loadDisputeMessages]
  );

  useEffect(() => {
    if (!disputeDialogOpen) {
      setActiveDispute(null);
      setDisputeMessages([]);
      setMessageError(null);
      setMessageInput("");
      setDisputeChatTarget('shipper');
    }
  }, [disputeDialogOpen]);

  const handleSendDisputeMessage = async () => {
    if (!activeDispute || !messageInput.trim()) return;
    try {
      setActionLoading(true);
      await sendDisputeMessage(activeDispute.id, {
        text: messageInput.trim(),
        recipientRole: disputeChatTarget,
      });
      setMessageInput("");
      await loadDisputeMessages(activeDispute.id);
    } catch (err: any) {
      setMessageError(err?.message || 'Failed to send message');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendSupportMessage = async () => {
    if (!activeSupportTicket || !supportMessageInput.trim()) return;
    try {
      setActionLoading(true);
      await postSupportTicketMessage(activeSupportTicket.id, { message: supportMessageInput.trim() });
      setSupportMessageInput("");
      await loadSupportMessages(activeSupportTicket.id);
    } catch (err: any) {
      setSupportMessageError(err?.message || 'Failed to send message');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartReview = async () => {
    if (!activeDispute) return;
    try {
      setActionLoading(true);
      await startDisputeReview(activeDispute.id);
      await loadDisputes();
      setActiveDispute((prev) => (prev ? { ...prev, status: "under_review" } : prev));
    } catch (err: any) {
      setMessageError(err?.message || 'Failed to start review');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async (mode: "release" | "refund") => {
    if (!activeDispute) return;
    try {
      setActionLoading(true);
      if (mode === "release") {
        await resolveDisputeReleaseToHauler(activeDispute.id);
      } else {
        await resolveDisputeRefundToShipper(activeDispute.id);
      }
      await loadDisputes();
      setDisputeDialogOpen(false);
    } catch (err: any) {
      setMessageError(err?.message || 'Failed to resolve dispute');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSplitPayout = async () => {
    if (!activeDispute) return;
    const hauler = Number(splitHauler);
    const shipper = Number(splitShipper);
    if (Number.isNaN(hauler) || Number.isNaN(shipper) || hauler < 0 || shipper < 0) {
      setMessageError("Enter valid amounts for both parties.");
      return;
    }
    try {
      setActionLoading(true);
      await resolveDisputeSplit(activeDispute.id, hauler, shipper);
      await loadDisputes();
      setDisputeDialogOpen(false);
    } catch (err: any) {
      setMessageError(err?.message || 'Failed to submit split decision');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReview = async (id: number, status: 'approved' | 'rejected') => {
    const notes =
      status === 'rejected'
        ? window.prompt('Add a note for this rejection (optional)') ?? undefined
        : undefined;
    setReviewingId(id);
    setReviewError(null);
    try {
      const updated = await reviewKycRequest(id, status, notes);
      setKycRequests((prev) => prev.map((req) => (req.id === updated.id ? updated : req)));
    } catch (err: any) {
      setReviewError(err?.message || 'Failed to update request');
    } finally {
      setReviewingId(null);
    }
  };

  const handleUserStatusChange = async (userId: number, status: string) => {
    try {
      await updateAdminUserStatus(userId, status);
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, account_status: status } : user
        )
      );
    } catch (err: any) {
      alert(err?.message || 'Failed to update user status');
    }
  };

  const handleTicketStatusChange = async (
    ticketId: number,
    status: 'open' | 'closed'
  ) => {
    const notes =
      status === 'closed'
        ? window.prompt('Add a resolution note (optional)') ?? undefined
        : undefined;
    try {
      const resp = await updateSupportTicketStatus(ticketId, status, notes);
      const updated = resp.ticket as SupportTicketRecord;
      setSupportTickets((prev) =>
        prev.map((ticket) => (ticket.id === ticketId ? updated : ticket))
      );
      setActiveSupportTicket((prev) => (prev && prev.id === ticketId ? updated : prev));
    } catch (err: any) {
      alert(err?.message || 'Failed to update ticket');
    }
  };

  const normalizedSearch = searchQuery.toLowerCase();
  const filteredUsers = users.filter((user) => {
    if (!normalizedSearch) return true;
    return (
      user.full_name?.toLowerCase().includes(normalizedSearch) ||
      user.email?.toLowerCase().includes(normalizedSearch) ||
      String(user.id).includes(normalizedSearch)
    );
  });
  const overviewUsers = users.slice(0, 4);
  const overviewCards = [
    {
      title: 'Verified Users',
      value: stats?.users?.verified_users ?? 0,
      icon: Users,
      caption: 'Accounts cleared',
    },
    {
      title: 'Active Trips',
      value: stats?.trips?.active_trips ?? 0,
      icon: Activity,
      caption: 'In-progress journeys',
    },
    {
      title: 'Open Loads',
      value: stats?.loads?.open_loads ?? 0,
      icon: Truck,
      caption: 'Waiting for haulers',
    },
    {
      title: 'Pending KYC',
      value: stats?.kyc?.pending_kyc ?? 0,
      icon: FileText,
      caption: 'Require review',
    },
  ];

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
            {statsError ? (
              <p className="text-sm text-red-600">{statsError}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {overviewCards.map((card) => (
                  <Card key={card.title}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm text-gray-600">{card.title}</CardTitle>
                        <card.icon className="w-5 h-5 text-[#29CA8D]" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl text-[#172039] mb-1">
                        {statsLoading ? '…' : card.value.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">{card.caption}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Card className="border border-gray-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Platform Earnings</CardTitle>
                    <p className="text-sm text-gray-500">Commission captured from escrow trips</p>
                  </div>
                  {earningsLoading && <span className="text-xs text-gray-500">Updating…</span>}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {earningsError ? (
                  <p className="text-sm text-rose-600">{earningsError}</p>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Total fees to date</p>
                        <p className="text-2xl text-[#172039]">
                          $
                          {Number(earningsData?.stats.total_commission ?? 0).toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                      <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Last 30 days</p>
                        <p className="text-2xl text-[#172039]">
                          $
                          {Number(earningsData?.stats.last_30_days ?? 0).toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                      <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Avg fee per trip</p>
                        <p className="text-2xl text-[#172039]">
                          $
                          {Number(earningsData?.stats.avg_commission ?? 0).toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                      <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Trips with fees</p>
                        <p className="text-2xl text-[#172039]">
                          {earningsData?.stats.fee_payments ?? 0}
                        </p>
                      </div>
                    </div>

                    {earningsData?.items && earningsData.items.length > 0 ? (
                      <div className="-mx-4 sm:mx-0 overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                            <tr>
                              <th className="px-4 py-2 text-left">Trip</th>
                              <th className="px-4 py-2 text-left">Route</th>
                              <th className="px-4 py-2 text-left">Gross</th>
                              <th className="px-4 py-2 text-left">Platform fee</th>
                              <th className="px-4 py-2 text-left">Hauler</th>
                              <th className="px-4 py-2 text-left">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {earningsData.items.slice(0, 10).map((earning) => (
                              <tr key={earning.payment_id} className="border-t border-gray-100 text-gray-700">
                                <td className="px-4 py-2">
                                  #{earning.trip_id ?? earning.load_id ?? earning.payment_id}
                                  <div className="text-[11px] text-gray-500 capitalize">{earning.status?.replace(/_/g, ' ').toLowerCase()}</div>
                                </td>
                                <td className="px-4 py-2 text-gray-600">
                                  {earning.route || earning.species || '—'}
                                </td>
                                <td className="px-4 py-2 font-medium">
                                  ${Number(earning.amount ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </td>
                                <td className="px-4 py-2 font-semibold text-emerald-700">
                                  ${Number(earning.commission_amount ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                  {earning.commission_bps ? (
                                    <span className="ml-1 text-xs text-gray-500">
                                      ({(Number(earning.commission_bps) / 100).toFixed(2)}%)
                                    </span>
                                  ) : null}
                                </td>
                                <td className="px-4 py-2 text-gray-600">
                                  {earning.hauler_name || '—'}
                                  <div className="text-[11px] text-gray-500">{earning.shipper_name || ''}</div>
                                </td>
                                <td className="px-4 py-2 text-gray-600">
                                  {new Date(earning.created_at).toLocaleDateString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {earningsData.items.length > 10 && (
                          <p className="text-[11px] text-gray-500 px-4 py-1">
                            Showing last 10 commission events (of {earningsData.items.length})
                          </p>
                        )}
                      </div>
                    ) : earningsLoading ? (
                      <p className="text-sm text-gray-500">Loading earnings…</p>
                    ) : (
                      <p className="text-sm text-gray-500">No fee-bearing trips yet.</p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent User Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  {usersLoading && overviewUsers.length === 0 ? (
                    <p className="text-sm text-gray-500">Loading users…</p>
                  ) : overviewUsers.length === 0 ? (
                    <p className="text-sm text-gray-500">No activity yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {overviewUsers.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="text-base text-gray-900 mb-1">{user.full_name || 'Unknown user'}</div>
                            <div className="text-sm text-gray-600">{user.user_type || 'role'} • Joined {new Date(user.created_at).toLocaleDateString()}</div>
                          </div>
                          <Badge
                            variant={user.account_status === 'verified' ? 'default' : 'secondary'}
                            className={user.account_status === 'verified' ? 'bg-[#29CA8D]' : ''}
                          >
                            {user.account_status || 'pending'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Escrow & Compliance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <div className="text-sm text-gray-600">Payments in escrow</div>
                    <div className="text-2xl text-[#172039]">{stats?.payments?.escrow_payments ?? 0}</div>
                    <p className="text-xs text-gray-500">Total volume ${stats?.payments?.total_volume ?? '0'}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <div className="text-sm text-gray-600">Open disputes</div>
                    <div className="text-2xl text-[#172039]">{stats?.disputes?.open_disputes ?? 0}</div>
                    <p className="text-xs text-gray-500">{stats?.support?.open_tickets ?? 0} support tickets in queue</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          {/* Users & Companies Tab */}
          <TabsContent value="users" className="space-y-6 mt-0">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-2xl text-[#172039] mb-1">User Management</h1>
                <p className="text-gray-600">Approve accounts and monitor marketplace activity</p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search name or email"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={userStatusFilter} onValueChange={(value) => setUserStatusFilter(value as any)}>
                  <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={userRoleFilter} onValueChange={(value) => setUserRoleFilter(value as any)}>
                  <SelectTrigger><SelectValue placeholder="All roles" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="hauler">Hauler</SelectItem>
                    <SelectItem value="shipper">Shipper</SelectItem>
                    <SelectItem value="stakeholder">Stakeholder</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {usersError && <p className="text-sm text-red-600">{usersError}</p>}
            {usersLoading && filteredUsers.length === 0 ? (
              <Card><CardContent className="p-6 text-gray-500">Loading users…</CardContent></Card>
            ) : filteredUsers.length === 0 ? (
              <Card><CardContent className="p-6 text-gray-500">No users match your filters.</CardContent></Card>
            ) : (
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <Card key={user.id}>
                    <CardContent className="p-5 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-base text-gray-900">{user.full_name || `User #${user.id}`}</h3>
                          <p className="text-sm text-gray-500">{user.email || 'No email'} • {user.user_type}</p>
                        </div>
                        <Badge variant={user.account_status === 'verified' ? 'default' : 'secondary'} className={user.account_status === 'verified' ? 'bg-[#29CA8D]' : ''}>
                          {user.account_status || 'pending'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm text-gray-600">
                        <div><span className="text-xs uppercase text-gray-400">Loads</span><div className="text-lg text-[#172039]">{user.loads_posted}</div></div>
                        <div><span className="text-xs uppercase text-gray-400">Trips</span><div className="text-lg text-[#172039]">{user.trips_managed}</div></div>
                        <div><span className="text-xs uppercase text-gray-400">Payments</span><div className="text-lg text-[#172039]">{user.payments_touching}</div></div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={user.account_status === 'verified'}
                          onClick={() => handleUserStatusChange(user.id, 'verified')}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={user.account_status === 'rejected'}
                          onClick={() => handleUserStatusChange(user.id, 'rejected')}
                        >
                          <XCircle className="w-4 h-4 mr-2" /> Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

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
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-2xl text-[#172039] mb-1">Support Tickets</h1>
                <p className="text-gray-600">Manage customer support requests</p>
              </div>
              <div className="flex gap-2">
                {['open', 'closed', 'all'].map((filter) => (
                  <Button
                    key={filter}
                    size="sm"
                    variant={supportFilter === filter ? 'default' : 'outline'}
                    onClick={() => setSupportFilter(filter as any)}
                  >
                    {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            {supportError && <p className="text-sm text-red-600">{supportError}</p>}
            {supportLoading && supportTickets.length === 0 ? (
              <Card><CardContent className="p-6 text-gray-500">Loading tickets…</CardContent></Card>
            ) : supportTickets.length === 0 ? (
              <Card><CardContent className="p-6 text-gray-500">No tickets for this filter.</CardContent></Card>
            ) : (
              <div className="grid gap-3">
                {supportTickets.map((ticket) => (
                  <Card key={ticket.id}>
                    <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-base text-gray-900 mb-1">{ticket.subject}</h3>
                        <div className="text-sm text-gray-600 mb-2">{ticket.user_role} #{ticket.user_id}</div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          <Badge variant={ticket.priority === 'high' ? 'destructive' : 'secondary'} className={ticket.priority === 'high' ? 'bg-red-500 text-white' : ''}>
                            {ticket.priority || 'normal'}
                          </Badge>
                          <Badge variant="outline">{ticket.status}</Badge>
                          <span>{new Date(ticket.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 min-w-[180px]">
                        {ticket.resolution_notes && (
                          <p className="text-xs text-gray-500 border p-2 rounded">{ticket.resolution_notes}</p>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenSupportTicket(ticket)}
                        >
                          View & Reply
                        </Button>
                        <Button
                          size="sm"
                          variant={ticket.status === 'closed' ? 'outline' : 'default'}
                          onClick={() => handleTicketStatusChange(ticket.id, ticket.status === 'closed' ? 'open' : 'closed')}
                        >
                          {ticket.status === 'closed' ? 'Reopen' : 'Close Ticket'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg text-[#172039]">Dispute Cases</h2>
                  <p className="text-sm text-gray-500">Monitor ongoing disputes and pending reviews</p>
                </div>
                <div className="flex gap-2">
                  {['open', 'under_review', 'all'].map((filter) => (
                    <Button
                      key={filter}
                      size="sm"
                      variant={disputeFilter === filter ? 'default' : 'outline'}
                      onClick={() => setDisputeFilter(filter as 'open' | 'under_review' | 'all')}
                    >
                      {filter === 'all' ? 'All' : filter.replace('_', ' ')}
                    </Button>
                  ))}
                </div>
              </div>

              {disputesError && <p className="text-sm text-red-600">{disputesError}</p>}
              {disputesLoading ? (
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>Loading disputes…</span>
                </div>
              ) : disputes.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-gray-500">
                    No disputes found for this filter.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {disputes.map((dispute) => (
                    <Card key={dispute.id}>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm text-gray-500">{dispute.load_title || ('Trip #' + dispute.trip_id)}</p>
                            <h3 className="text-base text-gray-900">{dispute.reason_code || 'Dispute'}</h3>
                          </div>
                          <Badge
                            variant={dispute.status === 'open' ? 'secondary' : dispute.status === 'under_review' ? 'default' : 'outline'}
                            className="uppercase tracking-wide text-[11px]"
                          >
                            {dispute.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <div className="grid gap-2 text-sm text-gray-600 md:grid-cols-3">
                          <div>
                            <span className="text-xs uppercase text-gray-400">Amount</span>
                            <div className="text-[#172039] text-base">
                              {dispute.amount ? `${dispute.currency || 'USD'} ${Number(dispute.amount).toLocaleString()}` : 'N/A'}
                            </div>
                          </div>
                          <div>
                            <span className="text-xs uppercase text-gray-400">Opened</span>
                            <div>{new Date(dispute.created_at).toLocaleDateString()}</div>
                          </div>
                          <div>
                            <span className="text-xs uppercase text-gray-400">Requested Action</span>
                            <div>{dispute.requested_action || 'Review'}</div>
                          </div>
                        </div>
                        {dispute.description && (
                          <p className="text-sm text-gray-500 border rounded p-2 bg-gray-50">
                            {dispute.description}
                          </p>
                        )}
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenDispute(dispute)}
                          >
                            View & Manage
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
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
          <TabsContent value="compliance" className="space-y-4 mt-0">
            <div>
              <h1 className="text-2xl text-[#172039] mb-1">KYC & Compliance</h1>
              <p className="text-gray-600">Review user submissions and approve or reject their access</p>
            </div>

            <div className="flex flex-wrap gap-3">
              {['pending', 'approved', 'rejected', 'all'].map((filter) => (
                <Button
                  key={filter}
                  variant={kycFilter === filter ? 'default' : 'outline'}
                  size="sm"
                  onClick={() =>
                    setKycFilter(filter as 'pending' | 'approved' | 'rejected' | 'all')
                  }
                >
                  {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Button>
              ))}
            </div>

            {kycError && <p className="text-sm text-red-600">{kycError}</p>}
            {reviewError && <p className="text-sm text-red-600">{reviewError}</p>}

            {kycLoading ? (
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="w-4 h-4" />
                <span>Loading requests…</span>
              </div>
            ) : kycRequests.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  No KYC requests found for this filter.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {kycRequests.map((request) => (
                  <Card key={request.id}>
                    <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <CardTitle className="text-base text-gray-900">
                          {request.full_name || `User #${request.user_id}`}
                        </CardTitle>
                        <p className="text-sm text-gray-600">{request.email}</p>
                        <p className="text-xs text-gray-500">
                          Role: {request.user_type ?? 'N/A'}
                        </p>
                      </div>
                      <Badge
                        variant={
                          request.status === 'approved'
                            ? 'default'
                            : request.status === 'rejected'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {request.status.toUpperCase()}
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-sm text-gray-600">
                        Submitted {new Date(request.submitted_at).toLocaleString()}
                        {request.reviewed_at && (
                          <span className="text-xs text-gray-500">
                            {' '}
                            · Reviewed {new Date(request.reviewed_at).toLocaleString()}
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-gray-500 uppercase tracking-wide">
                          Documents
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {request.documents.map((doc) => (
                            <a
                              key={doc.id}
                              href={doc.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-[#172039] underline decoration-dotted hover:text-[#29CA8D]"
                            >
                              {doc.doc_type} ({new Date(doc.uploaded_at).toLocaleDateString()})
                            </a>
                          ))}
                          {request.documents.length === 0 && (
                            <span className="text-sm text-gray-500">No documents uploaded.</span>
                          )}
                        </div>
                      </div>

                      {request.review_notes && (
                        <div className="rounded bg-gray-50 border border-gray-200 p-3 text-sm">
                          <strong>Notes:</strong> {request.review_notes}
                        </div>
                      )}

                      {request.status === 'pending' && (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleReview(request.id, 'approved')}
                            disabled={reviewingId === request.id}
                          >
                            {reviewingId === request.id ? 'Approving…' : 'Approve'}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReview(request.id, 'rejected')}
                            disabled={reviewingId === request.id}
                          >
                            {reviewingId === request.id ? 'Submitting…' : 'Reject'}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg text-[#172039]">Dispute Cases</h2>
                  <p className="text-sm text-gray-500">Monitor ongoing disputes and pending reviews</p>
                </div>
                <div className="flex gap-2">
                  {['open', 'under_review', 'all'].map((filter) => (
                    <Button
                      key={filter}
                      size="sm"
                      variant={disputeFilter === filter ? 'default' : 'outline'}
                      onClick={() => setDisputeFilter(filter as 'open' | 'under_review' | 'all')}
                    >
                      {filter === 'all' ? 'All' : filter.replace('_', ' ')}
                    </Button>
                  ))}
                </div>
              </div>

              {disputesError && <p className="text-sm text-red-600">{disputesError}</p>}
              {disputesLoading ? (
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>Loading disputes…</span>
                </div>
              ) : disputes.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-gray-500">
                    No disputes found for this filter.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {disputes.map((dispute) => (
                    <Card key={dispute.id}>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm text-gray-500">{dispute.load_title || (`Trip #${dispute.trip_id}`)}</p>
                            <h3 className="text-base text-gray-900">{dispute.reason_code || "Dispute"}</h3>
                          </div>
                          <Badge
                            variant={dispute.status === 'open' ? 'secondary' : dispute.status === 'under_review' ? 'default' : 'outline'}
                            className="uppercase tracking-wide text-[11px]"
                          >
                            {dispute.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <div className="grid gap-2 text-sm text-gray-600 md:grid-cols-3">
                          <div>
                            <span className="text-xs uppercase text-gray-400">Amount</span>
                            <div className="text-[#172039] text-base">
                              {dispute.amount ? `${dispute.currency || 'USD'} ${Number(dispute.amount).toLocaleString()}` : 'N/A'}
                            </div>
                          </div>
                          <div>
                            <span className="text-xs uppercase text-gray-400">Opened</span>
                            <div>{new Date(dispute.created_at).toLocaleDateString()}</div>
                          </div>
                          <div>
                            <span className="text-xs uppercase text-gray-400">Requested Action</span>
                            <div>{dispute.requested_action || 'Review'}</div>
                          </div>
                        </div>
                        {dispute.description && (
                          <p className="text-sm text-gray-500 border rounded p-2 bg-gray-50">
                            {dispute.description}
                          </p>
                        )}
                        <div className="flex justify-end">
                          <Button size="sm" variant="outline" onClick={() => handleOpenDispute(dispute)}>
                            View & Manage
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={supportDialogOpen} onOpenChange={setSupportDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {activeSupportTicket ? (
            <>
              <DialogHeader>
                <DialogTitle>Support Ticket #{activeSupportTicket.id}</DialogTitle>
                <DialogDescription>
                  {activeSupportTicket.subject} • {activeSupportTicket.user_role} #{activeSupportTicket.user_id}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)]">
                <Card className="h-full">
                  <CardContent className="space-y-3 p-4">
                    <div className="space-y-1 text-sm text-gray-600">
                      <p><span className="font-semibold text-gray-900">Priority:</span> {activeSupportTicket.priority}</p>
                      <p><span className="font-semibold text-gray-900">Status:</span> {activeSupportTicket.status}</p>
                      <p><span className="font-semibold text-gray-900">Opened:</span> {new Date(activeSupportTicket.created_at).toLocaleString()}</p>
                    </div>
                    <div className="border rounded p-3 text-sm text-gray-700 bg-gray-50">
                      {activeSupportTicket.message}
                    </div>
                    {activeSupportTicket.resolution_notes && (
                      <div className="text-sm text-gray-600 border rounded p-3">
                        <p className="font-semibold text-gray-900 mb-1">Resolution notes</p>
                        {activeSupportTicket.resolution_notes}
                      </div>
                    )}
                    <div className="text-sm text-gray-500">
                      To close/reopen this ticket use the actions on the Support tab list.
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Conversation</p>
                        <p className="text-xs text-gray-500">Chat with the user linked to this ticket</p>
                      </div>
                    </div>
                    {supportMessageError && (
                      <p className="text-sm text-red-600">{supportMessageError}</p>
                    )}
                    <div className="h-64 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
                      {supportMessagesLoading ? (
                        <p className="text-sm text-gray-500">Loading conversation…</p>
                      ) : supportMessages.length === 0 ? (
                        <p className="text-sm text-gray-500">No messages yet.</p>
                      ) : (
                        supportMessages.map((msg) => (
                          <div key={msg.id} className="rounded border border-gray-100 bg-white p-2 shadow-sm text-sm text-gray-700">
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span className="font-semibold text-[#172039]">
                                {formatRoleLabel(msg.sender_role) || 'User'}
                              </span>
                              <span>{new Date(msg.created_at).toLocaleString()}</span>
                            </div>
                            <p className="mt-1 text-gray-700">{msg.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                    <Textarea
                      rows={3}
                      value={supportMessageInput}
                      onChange={(e) => setSupportMessageInput(e.target.value)}
                      placeholder="Write a reply…"
                    />
                    <DialogFooter>
                      <Button onClick={handleSendSupportMessage} disabled={!supportMessageInput.trim() || actionLoading}>
                        {actionLoading ? 'Sending…' : 'Send Reply'}
                      </Button>
                    </DialogFooter>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">Select a ticket to view its details.</p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={disputeDialogOpen} onOpenChange={setDisputeDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {activeDispute ? (
            <>
              <DialogHeader>
                <DialogTitle>Dispute #{activeDispute.id}</DialogTitle>
                <DialogDescription>
                  Trip #{activeDispute.trip_id} • {activeDispute.reason_code || 'Dispute reason'}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Current status</p>
                        <Badge variant="secondary" className="uppercase tracking-wide text-[11px]">
                          {activeDispute.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Amount in escrow</p>
                        <p className="text-xl text-[#172039]">
                          {activeDispute.amount
                            ? `${activeDispute.currency || 'USD'} ${Number(activeDispute.amount).toLocaleString()}`
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                    {activeDispute.description && (
                      <p className="text-sm text-gray-600 border rounded p-3 bg-gray-50">
                        {activeDispute.description}
                      </p>
                    )}
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-gray-500">Resolution actions</Label>
                      {activeDispute.status === 'open' && (
                        <Button
                          size="sm"
                          onClick={handleStartReview}
                          disabled={actionLoading}
                        >
                          {actionLoading ? 'Starting…' : 'Start Review'}
                        </Button>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResolve('release')}
                          disabled={actionLoading}
                        >
                          Release to Hauler
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleResolve('refund')}
                          disabled={actionLoading}
                        >
                          Refund Shipper
                        </Button>
                      </div>
                      <div className="border rounded-lg p-3 space-y-2">
                        <Label className="text-xs uppercase text-gray-500">Split decision</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-gray-500">Hauler amount</Label>
                            <Input
                              type="number"
                              value={splitHauler}
                              onChange={(e) => setSplitHauler(e.target.value)}
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Shipper amount</Label>
                            <Input
                              type="number"
                              value={splitShipper}
                              onChange={(e) => setSplitShipper(e.target.value)}
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <Button size="sm" onClick={handleSplitPayout} disabled={actionLoading}>
                          {actionLoading ? 'Submitting…' : 'Submit Split'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-sm text-gray-500">Messages</p>
                        <p className="text-xs text-gray-400">Chat with shipper and hauler</p>
                      </div>
                      <div className="inline-flex rounded-2xl border border-gray-200 bg-white p-1">
                        {(['shipper', 'hauler'] as DisputeChatTarget[]).map((target) => {
                          const isActive = disputeChatTarget === target;
                          return (
                            <button
                              key={target}
                              type="button"
                              onClick={() => setDisputeChatTarget(target)}
                              className={`px-3 py-1.5 text-sm font-medium rounded-xl transition ${
                                isActive
                                  ? 'bg-[#172039] text-white shadow'
                                  : 'text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              {target === 'shipper' ? 'Shipper' : 'Hauler'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      Messages you send are shared only with the selected {disputeChatTarget === 'shipper' ? 'shipper' : 'hauler'} party.
                    </p>
                    {messageError && <p className="text-sm text-red-600">{messageError}</p>}
                    <div className="h-64 overflow-y-auto border rounded-lg p-3 bg-gray-50 space-y-2">
                      {messagesLoading ? (
                        <p className="text-sm text-gray-500">Loading conversation…</p>
                      ) : filteredDisputeMessages.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          No messages with this {disputeChatTarget === 'shipper' ? 'shipper' : 'hauler'} yet.
                        </p>
                      ) : (
                        filteredDisputeMessages.map((msg) => {
                          const senderSlug = normalizeRoleSlug(msg.sender_role);
                          return (
                            <div key={msg.id} className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm text-sm text-gray-700">
                              <div className="flex items-center flex-wrap gap-2 text-xs text-gray-500">
                                <span className="font-semibold text-[#172039] text-sm">
                                  {formatRoleLabel(msg.sender_role)}
                                </span>
                                <span>· {new Date(msg.created_at).toLocaleString()}</span>
                                {senderSlug.startsWith('super-admin') && (
                                  <span className="text-xs text-gray-500">
                                    → {formatRoleLabel(msg.recipient_role || 'all')}
                                  </span>
                                )}
                              </div>
                              {msg.text ? <p className="text-gray-700 mt-1">{msg.text}</p> : null}
                            </div>
                          );
                        })
                      )}
                    </div>
                    <Textarea
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder={
                        disputeChatTarget === 'shipper'
                          ? 'Write an update to the shipper…'
                          : 'Write an update to the hauler…'
                      }
                      rows={3}
                    />
                    <DialogFooter>
                      <Button onClick={handleSendDisputeMessage} disabled={actionLoading || !messageInput.trim()}>
                        {disputeChatTarget === 'shipper' ? 'Send to Shipper' : 'Send to Hauler'}
                      </Button>
                    </DialogFooter>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">Select a dispute to view its details.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
