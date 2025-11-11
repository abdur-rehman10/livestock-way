import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { Badge } from '../components/ui/badge';
import { Search, MessageCircle, HelpCircle, FileQuestion, DollarSign, Truck as TruckIcon, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const faqs = [
  {
    category: 'Payments',
    icon: DollarSign,
    questions: [
      {
        q: 'When will I receive my payment?',
        a: 'Payments are released 24-48 hours after trip completion and ePOD submission. Funds will be available in your wallet immediately and can be withdrawn to your bank account.',
      },
      {
        q: 'Why is my payment still in escrow?',
        a: 'Payments remain in escrow until the shipper confirms delivery. This typically happens within 24 hours of trip completion. If delayed, contact support.',
      },
      {
        q: 'How do I add my bank account?',
        a: 'Go to Wallet > Withdraw > Add Bank Details. Enter your account number, routing number, and account holder name. We use secure encryption to protect your information.',
      },
    ],
  },
  {
    category: 'Trips',
    icon: TruckIcon,
    questions: [
      {
        q: 'How do I start a trip?',
        a: 'Accept a load from the Home screen, complete the pre-trip checklist (including vehicle inspection and livestock check), then tap "Start Trip" to begin navigation.',
      },
      {
        q: 'What if I encounter an issue during the trip?',
        a: 'Use the "Report Issue" button in the trip controls panel. This will create a support ticket and notify the operations team immediately.',
      },
      {
        q: 'Can I cancel a trip after accepting?',
        a: 'Yes, but cancellations may affect your rating. Go to the trip details and tap "Cancel Trip". You\'ll be asked to provide a reason.',
      },
    ],
  },
  {
    category: 'App Issues',
    icon: AlertCircle,
    questions: [
      {
        q: 'The app is not loading',
        a: 'Check your internet connection. If the issue persists, try closing and reopening the app. You can also enable offline mode for limited functionality.',
      },
      {
        q: 'I can\'t upload photos',
        a: 'Ensure the app has camera and storage permissions. Go to your device Settings > Apps > LivestockWay > Permissions and enable Camera and Storage.',
      },
    ],
  },
];

const tickets = [
  {
    id: 'TKT001',
    title: 'Payment not received for Trip #T004',
    status: 'open',
    priority: 'high',
    date: 'Oct 28, 2025',
    response: null,
  },
  {
    id: 'TKT002',
    title: 'GPS not working during trip',
    status: 'resolved',
    priority: 'medium',
    date: 'Oct 25, 2025',
    response: 'Issue resolved. Please update to the latest app version.',
  },
];

export function SupportTab() {
  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [ticketType, setTicketType] = useState('');
  const [ticketPriority, setTicketPriority] = useState('medium');
  const [ticketDescription, setTicketDescription] = useState('');

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!ticketType || !ticketDescription) {
      toast.error('Please fill in all required fields');
      return;
    }

    const ticketId = 'TKT' + String(Date.now()).slice(-3);
    toast.success(`Ticket ${ticketId} created! We'll respond within 24 hours.`);
    setIsTicketOpen(false);
    
    // Reset form
    setTicketType('');
    setTicketDescription('');
    setTicketPriority('medium');
  };

  const filteredFaqs = faqs.map(category => ({
    ...category,
    questions: category.questions.filter(q =>
      searchQuery === '' ||
      q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.a.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(category => category.questions.length > 0);

  return (
    <div className="p-4 space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search help articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={() => setIsTicketOpen(true)}
          className="h-20 flex-col gap-2 bg-[#29CA8D] hover:bg-[#24b67d]"
        >
          <FileQuestion className="w-6 h-6" />
          <span className="text-sm">Submit Ticket</span>
        </Button>
        <Button variant="outline" className="h-20 flex-col gap-2">
          <MessageCircle className="w-6 h-6" />
          <span className="text-sm">Live Chat</span>
          <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
        </Button>
      </div>

      {/* My Tickets */}
      {tickets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My Tickets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-sm text-gray-600">#{ticket.id}</div>
                    <div className="text-base text-gray-900">{ticket.title}</div>
                  </div>
                  <Badge 
                    variant={ticket.status === 'resolved' ? 'default' : 'secondary'}
                    className={ticket.status === 'resolved' ? 'bg-green-500' : 'bg-orange-500 text-white'}
                  >
                    {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500">{ticket.date}</div>
                {ticket.response && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-900">
                    <strong>Support:</strong> {ticket.response}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* FAQs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No results found for "{searchQuery}"
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {filteredFaqs.map((category) => {
                const Icon = category.icon;
                return (
                  <div key={category.category} className="mb-4">
                    <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                      <Icon className="w-4 h-4" />
                      {category.category}
                    </div>
                    {category.questions.map((faq, idx) => (
                      <AccordionItem key={idx} value={`${category.category}-${idx}`}>
                        <AccordionTrigger className="text-left text-sm">
                          {faq.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-gray-600">
                          {faq.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </div>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Submit Ticket Dialog */}
      <Dialog open={isTicketOpen} onOpenChange={setIsTicketOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit a Support Ticket</DialogTitle>
            <DialogDescription>
              Describe your issue and we'll get back to you within 24 hours
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitTicket} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type">Issue Type</Label>
              <Select value={ticketType} onValueChange={setTicketType} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select issue type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="payment">Payment Issue</SelectItem>
                  <SelectItem value="trip">Trip Problem</SelectItem>
                  <SelectItem value="app">App Technical Issue</SelectItem>
                  <SelectItem value="account">Account & Profile</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={ticketPriority} onValueChange={setTicketPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High - Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your issue in detail..."
                value={ticketDescription}
                onChange={(e) => setTicketDescription(e.target.value)}
                rows={4}
                required
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTicketOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-[#29CA8D] hover:bg-[#24b67d]"
              >
                Submit Ticket
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
