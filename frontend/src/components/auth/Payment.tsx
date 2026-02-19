import { useState, type FormEvent } from 'react';
import { ArrowLeft, CreditCard, Lock } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import logo from '../../assets/livestockway-logo.svg';

interface PaymentProps {
  onBack: () => void;
  planName: string;
  price: string;
  onPaymentSuccess: () => void;
  onSkip: () => void;
  userRole: string | null;
}

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return digits;
}

export function Payment({ onBack, planName, price, onPaymentSuccess, onSkip, userRole }: PaymentProps) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [processing, setProcessing] = useState(false);

  const isValid =
    cardNumber.replace(/\s/g, '').length === 16 &&
    expiry.length === 5 &&
    cvc.length >= 3;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      onPaymentSuccess();
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-8 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="size-5" />
          </Button>
          <img src={logo} alt="LivestockWay" className="h-8" />
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl text-center">Payment Details</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Plan summary */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Selected Plan</p>
                <p className="font-semibold text-gray-900">{planName}</p>
              </div>
              <span
                className="text-lg font-bold"
                style={{ color: '#42b883' }}
              >
                {price}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Card Number */}
              <div className="space-y-1.5">
                <label htmlFor="card-number" className="text-sm font-medium text-gray-700">
                  Card Number
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <input
                    id="card-number"
                    type="text"
                    inputMode="numeric"
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    className="w-full rounded-md border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm placeholder:text-gray-400 focus:border-[#42b883] focus:outline-none focus:ring-2 focus:ring-[#42b883]/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Expiry */}
                <div className="space-y-1.5">
                  <label htmlFor="expiry" className="text-sm font-medium text-gray-700">
                    Expiry Date
                  </label>
                  <input
                    id="expiry"
                    type="text"
                    inputMode="numeric"
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    className="w-full rounded-md border border-gray-300 bg-white py-2.5 px-3 text-sm placeholder:text-gray-400 focus:border-[#42b883] focus:outline-none focus:ring-2 focus:ring-[#42b883]/20"
                  />
                </div>

                {/* CVC */}
                <div className="space-y-1.5">
                  <label htmlFor="cvc" className="text-sm font-medium text-gray-700">
                    CVC
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
                    <input
                      id="cvc"
                      type="text"
                      inputMode="numeric"
                      placeholder="123"
                      maxLength={4}
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full rounded-md border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-[#42b883] focus:outline-none focus:ring-2 focus:ring-[#42b883]/20"
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={!isValid || processing}
                className="w-full text-white"
                style={{ backgroundColor: '#42b883' }}
              >
                {processing ? 'Processing…' : 'Complete Payment'}
              </Button>
            </form>

            {userRole !== 'enterprise' && (
              <button
                type="button"
                onClick={onSkip}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2 transition-colors"
              >
                Skip and Complete Profile
              </button>
            )}

            <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
              <Lock className="size-3" />
              Payments are secure and encrypted
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
