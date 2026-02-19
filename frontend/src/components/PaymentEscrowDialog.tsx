import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { 
  DollarSign,
  CreditCard,
  Shield,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Eye
} from 'lucide-react';
import { toast } from '../lib/swal';

interface PaymentEscrowDialogProps {
  isOpen: boolean;
  onClose: () => void;
  loadId: string;
  haulerName: string;
  bidAmount: number;
  onPaymentComplete: () => void;
}

export function PaymentEscrowDialog({ 
  isOpen, 
  onClose, 
  loadId,
  haulerName,
  bidAmount,
  onPaymentComplete 
}: PaymentEscrowDialogProps) {
  const [step, setStep] = useState<'review' | 'payment' | 'complete'>('review');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [processing, setProcessing] = useState(false);

  const platformFee = bidAmount * 0.05; // 5% commission
  const totalAmount = bidAmount + platformFee;

  const handlePayment = () => {
    setProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setProcessing(false);
      setStep('complete');
      toast.success('Payment successful! Funds are held in escrow.');
      
      setTimeout(() => {
        onPaymentComplete();
        onClose();
        resetForm();
      }, 3000);
    }, 2000);
  };

  const resetForm = () => {
    setStep('review');
    setCardNumber('');
    setExpiryDate('');
    setCvv('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && !processing) {
        onClose();
        resetForm();
      }
    }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === 'review' && 'Review & Pay'}
            {step === 'payment' && 'Enter Payment Details'}
            {step === 'complete' && 'Payment Complete'}
          </DialogTitle>
          <DialogDescription>
            {step === 'review' && 'Review the bid details and proceed to payment'}
            {step === 'payment' && 'Funds will be held securely in escrow'}
            {step === 'complete' && 'Your payment has been processed successfully'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className={step === 'review' ? 'text-[#F97316]' : 'text-gray-400'}>Review</span>
            <span className={step === 'payment' ? 'text-[#F97316]' : 'text-gray-400'}>Payment</span>
            <span className={step === 'complete' ? 'text-[#29CA8D]' : 'text-gray-400'}>Complete</span>
          </div>
          <Progress 
            value={
              step === 'review' ? 33 : 
              step === 'payment' ? 66 : 
              100
            } 
          />
        </div>

        {/* Review Step */}
        {step === 'review' && (
          <div className="space-y-6">
            {/* Bid Summary */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg text-gray-900 dark:text-gray-100">Load #{loadId}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Hauler: {haulerName}</p>
                  </div>
                  <Badge className="bg-[#29CA8D]">Accepted Bid</Badge>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Bid Amount</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      ${bidAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Platform Fee (5%)</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      ${platformFee.toFixed(2)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg">
                    <span className="text-gray-900 dark:text-gray-100">Total Amount</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      ${totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Escrow Information */}
            <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <CardContent className="p-6">
                <div className="flex gap-3">
                  <Shield className="w-6 h-6 text-blue-600 flex-shrink-0" />
                  <div className="space-y-2">
                    <h4 className="text-blue-900 dark:text-blue-100">Secure Escrow Protection</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Your funds will be held securely in escrow until delivery is confirmed. 
                      The hauler will only receive payment after you mark the shipment as delivered.
                    </p>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 mt-2">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Funds released automatically upon delivery confirmation
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Full refund if shipment is cancelled
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Dispute resolution available
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button 
                onClick={() => setStep('payment')}
                className="flex-1 bg-[#F97316] hover:bg-[#ea6c0d]"
              >
                Proceed to Payment
              </Button>
              <Button 
                onClick={onClose}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Payment Step */}
        {step === 'payment' && (
          <div className="space-y-6">
            {/* Amount Summary */}
            <Card className="bg-gray-50 dark:bg-gray-900">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Total to Pay:</span>
                  <span className="text-2xl text-gray-900 dark:text-gray-100">
                    ${totalAmount.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Payment Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Card Number</Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
                      setCardNumber(value);
                    }}
                    maxLength={19}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Expiry Date</Label>
                  <Input 
                    placeholder="MM/YY"
                    value={expiryDate}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, '');
                      if (value.length >= 2) {
                        value = value.slice(0, 2) + '/' + value.slice(2, 4);
                      }
                      setExpiryDate(value);
                    }}
                    maxLength={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CVV</Label>
                  <Input 
                    placeholder="123"
                    type="password"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                    maxLength={4}
                  />
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <CardContent className="p-4">
                <div className="flex gap-2 items-start">
                  <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-700 dark:text-green-300">
                    <p className="mb-1">Your payment information is encrypted and secure.</p>
                    <p className="text-xs">We never store your full card details.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button 
                onClick={handlePayment}
                disabled={!cardNumber || !expiryDate || !cvv || processing}
                className="flex-1 bg-[#F97316] hover:bg-[#ea6c0d]"
              >
                {processing ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <DollarSign className="w-4 h-4 mr-2" />
                    Pay ${totalAmount.toFixed(2)}
                  </>
                )}
              </Button>
              <Button 
                onClick={() => setStep('review')}
                variant="outline"
                disabled={processing}
              >
                Back
              </Button>
            </div>
          </div>
        )}

        {/* Complete Step */}
        {step === 'complete' && (
          <div className="space-y-6 text-center py-6">
            <div className="flex justify-center">
              <div className="p-4 bg-green-100 dark:bg-green-900 rounded-full">
                <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-300" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl text-gray-900 dark:text-gray-100">Payment Successful!</h3>
              <p className="text-gray-600 dark:text-gray-400">
                ${totalAmount.toFixed(2)} has been deposited into escrow
              </p>
            </div>

            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3 justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <div className="text-left">
                    <p className="text-sm text-gray-900 dark:text-gray-100">Escrow Status</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Funds Held</p>
                  </div>
                </div>

                <Separator />

                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                  <p className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                    Payment will be released to hauler after delivery confirmation
                  </p>
                  <p className="flex items-start gap-2">
                    <Eye className="w-4 h-4 text-blue-600 mt-0.5" />
                    Track your shipment status in real-time
                  </p>
                  <p className="flex items-start gap-2">
                    <Download className="w-4 h-4 text-purple-600 mt-0.5" />
                    Receipt has been sent to your email
                  </p>
                </div>
              </CardContent>
            </Card>

            <p className="text-sm text-gray-500">
              This window will close automatically...
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Escrow Status Badge Component
export function EscrowStatusBadge({ status }: { status: 'funded' | 'held' | 'released' | 'refunded' }) {
  const config = {
    funded: { label: 'Escrow Funded', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
    held: { label: 'Funds Held', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
    released: { label: 'Payment Released', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    refunded: { label: 'Refunded', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' },
  };

  return (
    <Badge className={config[status].color}>
      <Shield className="w-3 h-3 mr-1" />
      {config[status].label}
    </Badge>
  );
}
