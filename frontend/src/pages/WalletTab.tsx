import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { DollarSign, TrendingUp, Clock, ArrowUpRight, ArrowDownRight, CreditCard, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  type: 'payment' | 'withdrawal' | 'refund';
  tripId?: string;
  amount: string;
  status: 'pending' | 'completed' | 'failed';
  date: string;
}

const transactions: Transaction[] = [
  {
    id: 'TXN001',
    type: 'payment',
    tripId: 'T004',
    amount: '$720',
    status: 'completed',
    date: 'Oct 27, 2025',
  },
  {
    id: 'TXN002',
    type: 'payment',
    tripId: 'T005',
    amount: '$450',
    status: 'completed',
    date: 'Oct 26, 2025',
  },
  {
    id: 'TXN003',
    type: 'payment',
    tripId: 'T001',
    amount: '$850',
    status: 'pending',
    date: 'Oct 28, 2025',
  },
  {
    id: 'TXN004',
    type: 'withdrawal',
    amount: '$1,000',
    status: 'completed',
    date: 'Oct 25, 2025',
  },
];

export function WalletTab() {
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isBankDetailsOpen, setIsBankDetailsOpen] = useState(false);
  const [hasBankDetails, setHasBankDetails] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  // Mock wallet data
  const totalEarnings = 2450;
  const escrow = 850;
  const withdrawable = totalEarnings - escrow;

  const handleWithdraw = () => {
    if (!hasBankDetails) {
      setIsWithdrawOpen(false);
      setIsBankDetailsOpen(true);
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount > withdrawable) {
      toast.error('Insufficient withdrawable balance');
      return;
    }

    toast.success(`Withdrawal of $${amount} initiated. Funds will arrive in 2-3 business days.`);
    setIsWithdrawOpen(false);
    setWithdrawAmount('');
  };

  const handleSaveBankDetails = (e: React.FormEvent) => {
    e.preventDefault();
    setHasBankDetails(true);
    setIsBankDetailsOpen(false);
    toast.success('Bank details saved successfully');
  };

  return (
    <div className="p-4 space-y-4">
      {/* Balance Summary */}
      <Card className="bg-gradient-to-r from-[#29CA8D] to-[#24b67d] text-white">
        <CardContent className="p-6">
          <div className="text-sm text-white/80 mb-1">Total Earnings</div>
          <div className="text-3xl mb-4">${totalEarnings.toLocaleString()}</div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-white/80">In Escrow</div>
              <div className="text-xl">${escrow}</div>
            </div>
            <div>
              <div className="text-xs text-white/80">Withdrawable</div>
              <div className="text-xl">${withdrawable.toLocaleString()}</div>
            </div>
          </div>

          <Button
            onClick={() => setIsWithdrawOpen(true)}
            className="w-full mt-4 bg-white text-[#29CA8D] hover:bg-gray-100"
          >
            <ArrowUpRight className="w-4 h-4 mr-2" />
            Withdraw Funds
          </Button>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 mx-auto mb-2 text-[#29CA8D]" />
            <div className="text-sm text-gray-600 mb-1">This Week</div>
            <div className="text-xl text-gray-900">$1,270</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 mx-auto mb-2 text-[#F97316]" />
            <div className="text-sm text-gray-600 mb-1">Pending</div>
            <div className="text-xl text-gray-900">$850</div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {transactions.map((txn) => (
            <div key={txn.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  txn.type === 'payment' ? 'bg-green-100' : 
                  txn.type === 'withdrawal' ? 'bg-blue-100' : 
                  'bg-orange-100'
                }`}>
                  {txn.type === 'payment' ? (
                    <ArrowDownRight className="w-5 h-5 text-green-600" />
                  ) : (
                    <ArrowUpRight className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div>
                  <div className="text-base text-gray-900">
                    {txn.type === 'payment' ? 'Trip Payment' : 
                     txn.type === 'withdrawal' ? 'Withdrawal' : 
                     'Refund'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {txn.tripId ? `Trip #${txn.tripId}` : txn.date}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-base ${
                  txn.type === 'payment' ? 'text-green-600' : 
                  txn.type === 'withdrawal' ? 'text-blue-600' : 
                  'text-orange-600'
                }`}>
                  {txn.type === 'withdrawal' ? '-' : '+'}{txn.amount}
                </div>
                <Badge 
                  variant={txn.status === 'completed' ? 'default' : txn.status === 'pending' ? 'secondary' : 'destructive'}
                  className={`text-xs ${txn.status === 'completed' ? 'bg-green-500' : ''}`}
                >
                  {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Withdraw Dialog */}
      <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw Funds</DialogTitle>
            <DialogDescription>
              Enter the amount you wish to withdraw
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Available Balance</div>
              <div className="text-2xl text-gray-900">${withdrawable.toLocaleString()}</div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="text-xs text-gray-600">
              Funds will be transferred to your linked bank account within 2-3 business days.
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setIsWithdrawOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleWithdraw}
                className="flex-1 bg-[#29CA8D] hover:bg-[#24b67d]"
              >
                Confirm Withdrawal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bank Details Dialog */}
      <Dialog open={isBankDetailsOpen} onOpenChange={setIsBankDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bank Details</DialogTitle>
            <DialogDescription>
              Please add your bank account to receive withdrawals
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveBankDetails} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input id="bankName" placeholder="e.g., Chase Bank" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input id="accountNumber" placeholder="1234567890" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="routingNumber">Routing Number</Label>
              <Input id="routingNumber" placeholder="021000021" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountHolder">Account Holder Name</Label>
              <Input id="accountHolder" placeholder="John Smith" required />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsBankDetailsOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-[#29CA8D] hover:bg-[#24b67d]"
              >
                Save Details
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
