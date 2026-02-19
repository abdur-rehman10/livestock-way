import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  UserPlus, 
  Users, 
  Mail, 
  Shield, 
  MoreVertical,
  CheckCircle,
  Clock,
  XCircle,
  Trash2,
  Edit,
  Send
} from 'lucide-react';
import { toast, swalConfirm } from '../lib/swal';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'driver' | 'dispatcher' | 'viewer';
  status: 'active' | 'pending' | 'suspended';
  invitedDate: string;
  lastActive?: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  sentDate: string;
  status: 'pending' | 'accepted' | 'expired';
  expiresDate: string;
}

const mockTeamMembers: TeamMember[] = [
  {
    id: 'U001',
    name: 'John Smith',
    email: 'john@example.com',
    role: 'driver',
    status: 'active',
    invitedDate: 'Oct 1, 2025',
    lastActive: '2 hours ago',
  },
  {
    id: 'U002',
    name: 'Maria Garcia',
    email: 'maria@example.com',
    role: 'manager',
    status: 'active',
    invitedDate: 'Sep 15, 2025',
    lastActive: '1 day ago',
  },
  {
    id: 'U003',
    name: 'Robert Johnson',
    email: 'robert@example.com',
    role: 'driver',
    status: 'active',
    invitedDate: 'Oct 10, 2025',
    lastActive: '5 hours ago',
  },
];

const mockInvitations: Invitation[] = [
  {
    id: 'INV001',
    email: 'sarah@example.com',
    role: 'driver',
    sentDate: 'Oct 27, 2025',
    status: 'pending',
    expiresDate: 'Nov 3, 2025',
  },
  {
    id: 'INV002',
    email: 'mike@example.com',
    role: 'dispatcher',
    sentDate: 'Oct 20, 2025',
    status: 'expired',
    expiresDate: 'Oct 27, 2025',
  },
];

const roleOptions = [
  { value: 'admin', label: 'Admin', description: 'Full access to all features' },
  { value: 'manager', label: 'Manager', description: 'Manage trips, drivers, and fleet' },
  { value: 'dispatcher', label: 'Dispatcher', description: 'Assign trips and track deliveries' },
  { value: 'driver', label: 'Driver', description: 'Accept and complete trips' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access' },
];

export function TeamManagement() {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState(mockTeamMembers);
  const [invitations, setInvitations] = useState(mockInvitations);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('driver');
  const [inviteMessage, setInviteMessage] = useState('');

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteEmail) {
      toast.error('Please enter an email address');
      return;
    }

    // Check if email already exists
    const emailExists = teamMembers.some(m => m.email === inviteEmail) || 
                        invitations.some(i => i.email === inviteEmail && i.status === 'pending');
    
    if (emailExists) {
      toast.error('This email has already been invited or is an existing team member');
      return;
    }

    // Create new invitation
    const newInvitation: Invitation = {
      id: `INV${Date.now()}`,
      email: inviteEmail,
      role: inviteRole,
      sentDate: new Date().toLocaleDateString(),
      status: 'pending',
      expiresDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    };

    setInvitations([newInvitation, ...invitations]);
    toast.success(`Invitation sent to ${inviteEmail}`);
    
    // Reset form
    setInviteEmail('');
    setInviteRole('driver');
    setInviteMessage('');
    setIsInviteOpen(false);
  };

  const handleResendInvite = (invitationId: string) => {
    setInvitations(invitations.map(inv => 
      inv.id === invitationId 
        ? { ...inv, sentDate: new Date().toLocaleDateString(), status: 'pending' as const }
        : inv
    ));
    toast.success('Invitation resent');
  };

  const handleCancelInvite = (invitationId: string) => {
    setInvitations(invitations.filter(inv => inv.id !== invitationId));
    toast.success('Invitation cancelled');
  };

  const handleUpdateRole = (userId: string, newRole: string) => {
    setTeamMembers(teamMembers.map(member =>
      member.id === userId ? { ...member, role: newRole as any } : member
    ));
    toast.success('User role updated');
  };

  const handleSuspendUser = (userId: string) => {
    setTeamMembers(teamMembers.map(member =>
      member.id === userId ? { ...member, status: 'suspended' as const } : member
    ));
    toast.success('User suspended');
  };

  const handleRemoveUser = async (userId: string) => {
    const confirmed = await swalConfirm({
      title: 'Remove Member',
      text: 'Are you sure you want to remove this team member?',
      confirmText: 'Yes, remove',
    });
    if (confirmed) {
      setTeamMembers(teamMembers.filter(member => member.id !== userId));
      toast.success('Team member removed');
    }
  };

  const filteredMembers = teamMembers.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-500',
      pending: 'bg-yellow-500',
      suspended: 'bg-red-500',
      expired: 'bg-gray-500',
    };
    return <Badge className={`${colors[status as keyof typeof colors]} text-white`}>{status}</Badge>;
  };

  const getRoleIcon = (role: string) => {
    if (role === 'admin') return <Shield className="w-4 h-4" />;
    return <Users className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl text-[#172039]">Team Management</h2>
          <p className="text-gray-600">Invite and manage your team members</p>
        </div>
        <Button
          onClick={() => setIsInviteOpen(true)}
          className="bg-[#29CA8D] hover:bg-[#24b67d]"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Member
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Members</p>
                <p className="text-2xl">{teamMembers.length}</p>
              </div>
              <Users className="w-8 h-8 text-[#29CA8D]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl">{teamMembers.filter(m => m.status === 'active').length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Invites</p>
                <p className="text-2xl">{invitations.filter(i => i.status === 'pending').length}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Suspended</p>
                <p className="text-2xl">{teamMembers.filter(m => m.status === 'suspended').length}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="members" className="w-full">
        <TabsList>
          <TabsTrigger value="members">
            Team Members ({teamMembers.length})
          </TabsTrigger>
          <TabsTrigger value="invitations">
            Pending Invitations ({invitations.filter(i => i.status === 'pending').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          {/* Search */}
          <Input
            placeholder="Search team members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />

          {/* Team Members List */}
          <div className="space-y-3">
            {filteredMembers.map((member) => (
              <Card key={member.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#29CA8D]/10 flex items-center justify-center">
                        <span className="text-[#29CA8D]">{member.name.charAt(0)}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p>{member.name}</p>
                          {getStatusBadge(member.status)}
                        </div>
                        <p className="text-sm text-gray-600">{member.email}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                          <span>Joined: {member.invitedDate}</span>
                          {member.lastActive && <span>Last active: {member.lastActive}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Select
                        value={member.role}
                        onValueChange={(value) => handleUpdateRole(member.id, value)}
                        disabled={member.status === 'suspended'}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roleOptions.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSuspendUser(member.id)}
                        disabled={member.status === 'suspended'}
                      >
                        Suspend
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveUser(member.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="invitations" className="space-y-4">
          {/* Invitations List */}
          {invitations.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Mail className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">No pending invitations</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <Card key={invitation.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Mail className="w-8 h-8 text-gray-400" />
                        <div>
                          <div className="flex items-center gap-2">
                            <p>{invitation.email}</p>
                            {getStatusBadge(invitation.status)}
                          </div>
                          <p className="text-sm text-gray-600 capitalize">{invitation.role}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                            <span>Sent: {invitation.sentDate}</span>
                            <span>Expires: {invitation.expiresDate}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {invitation.status === 'pending' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResendInvite(invitation.id)}
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Resend
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelInvite(invitation.id)}
                            >
                              Cancel
                            </Button>
                          </>
                        )}
                        {invitation.status === 'expired' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResendInvite(invitation.id)}
                          >
                            Resend
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Invite Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your team. The invite will expire in 7 days.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="member@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div>
                        <div>{role.label}</div>
                        <div className="text-xs text-gray-500">{role.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Personal Message (Optional)</Label>
              <textarea
                id="message"
                className="w-full min-h-[80px] px-3 py-2 border border-gray-200 rounded-lg resize-none"
                placeholder="Add a personal message to the invitation..."
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setIsInviteOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-[#29CA8D] hover:bg-[#24b67d]"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Invitation
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
