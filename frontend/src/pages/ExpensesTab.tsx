import { useState, useRef } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Fuel, Receipt, Sandwich, Plus, Camera, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface Expense {
  id: string;
  tripId: string;
  type: string;
  amount: string;
  date: string;
  hasReceipt: boolean;
  note?: string;
}

const mockExpenses: Expense[] = [
  {
    id: 'E001',
    tripId: 'T001',
    type: 'Fuel',
    amount: '$85.50',
    date: 'Oct 28, 2025',
    hasReceipt: true,
  },
  {
    id: 'E002',
    tripId: 'T001',
    type: 'Toll',
    amount: '$12.00',
    date: 'Oct 28, 2025',
    hasReceipt: false,
  },
  {
    id: 'E003',
    tripId: 'T004',
    type: 'Feed',
    amount: '$45.00',
    date: 'Oct 27, 2025',
    hasReceipt: true,
    note: 'Hay for livestock',
  },
  {
    id: 'E004',
    tripId: 'T004',
    type: 'Fuel',
    amount: '$92.30',
    date: 'Oct 27, 2025',
    hasReceipt: true,
  },
];

export function ExpensesTab() {
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState('');
  const [expenseType, setExpenseType] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [receipt, setReceipt] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceipt(reader.result as string);
        toast.success('Receipt uploaded');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTrip || !expenseType || !amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    toast.success('Expense added successfully');
    setIsAddExpenseOpen(false);
    // Reset form
    setSelectedTrip('');
    setExpenseType('');
    setAmount('');
    setNote('');
    setReceipt(null);
  };

  const getExpenseIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'fuel':
        return <Fuel className="w-5 h-5 text-blue-600" />;
      case 'toll':
        return <Receipt className="w-5 h-5 text-green-600" />;
      case 'feed':
        return <Sandwich className="w-5 h-5 text-orange-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  // Group expenses by trip
  const expensesByTrip = mockExpenses.reduce((acc, expense) => {
    if (!acc[expense.tripId]) {
      acc[expense.tripId] = [];
    }
    acc[expense.tripId].push(expense);
    return acc;
  }, {} as Record<string, Expense[]>);

  return (
    <div className="p-4 space-y-4">
      {/* Add Expense Button */}
      <Button
        onClick={() => setIsAddExpenseOpen(true)}
        className="w-full bg-[#29CA8D] hover:bg-[#24b67d]"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Expense
      </Button>

      {/* Expenses by Trip */}
      {Object.entries(expensesByTrip).map(([tripId, expenses]) => {
        const total = expenses.reduce((sum, e) => {
          const value = parseFloat(e.amount.replace('$', '').replace(',', ''));
          return sum + value;
        }, 0);

        return (
          <Card key={tripId}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Trip #{tripId}</CardTitle>
                <div className="text-sm text-gray-600">
                  Total: <span className="text-[#29CA8D]">${total.toFixed(2)}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {expenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                      {getExpenseIcon(expense.type)}
                    </div>
                    <div>
                      <div className="text-base text-gray-900">{expense.type}</div>
                      <div className="text-sm text-gray-600">{expense.date}</div>
                      {expense.note && (
                        <div className="text-xs text-gray-500 mt-1">{expense.note}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base text-gray-900">{expense.amount}</div>
                    {expense.hasReceipt && (
                      <div className="text-xs text-green-600 flex items-center gap-1">
                        <Receipt className="w-3 h-3" />
                        Receipt
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}

      {/* Add Expense Dialog */}
      <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription>
              Record a trip-related expense
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="trip">Trip</Label>
              <Select value={selectedTrip} onValueChange={setSelectedTrip} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select trip" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="T001">Trip #T001 - In Transit</SelectItem>
                  <SelectItem value="T004">Trip #T004 - Completed</SelectItem>
                  <SelectItem value="T005">Trip #T005 - Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Expense Type</Label>
              <Select value={expenseType} onValueChange={setExpenseType} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fuel">Fuel</SelectItem>
                  <SelectItem value="toll">Toll</SelectItem>
                  <SelectItem value="feed">Feed/Hay</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-7"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Note (Optional)</Label>
              <Textarea
                id="note"
                placeholder="Add any additional details"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Receipt</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {receipt ? 'Receipt Uploaded ✓' : 'Upload Receipt'}
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                capture="environment"
              />
              {receipt && (
                <img src={receipt} alt="Receipt" className="w-full h-32 object-cover rounded border mt-2" />
              )}
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddExpenseOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-[#29CA8D] hover:bg-[#24b67d]"
              >
                Save Expense
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
