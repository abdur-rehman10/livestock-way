import { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { toast } from '../../lib/swal';

interface EmailConfirmationProps {
  email: string;
  onContinue: () => void;
  onBack: () => void;
}

export function EmailConfirmation({ email, onContinue, onBack }: EmailConfirmationProps) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(30);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = pastedData.split('');
    setCode([...newCode, ...Array(6 - newCode.length).fill('')]);
    if (newCode.length > 0) {
      const focusIdx = Math.min(newCode.length, 5);
      inputRefs.current[focusIdx]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      toast.error('Please enter the full 6-digit code');
      return;
    }

    try {
      setVerifying(true);
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: fullCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || 'Verification failed');
      }

      toast.success('Email verified successfully!');
      onContinue();
    } catch (err: any) {
      toast.error(err?.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    try {
      setResending(true);
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to resend');

      toast.success('New verification code sent!');
      setResendTimer(30);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-[420px] p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="text-sm">Back</span>
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#53ca97]/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#53ca97]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold mb-2">Verify your email</h1>
          <p className="text-gray-500 text-sm mb-1">We sent a 6-digit code to</p>
          <p className="text-gray-900 font-medium">{email}</p>
        </div>

        <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-12 h-14 text-center text-2xl border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#53ca97] focus:border-[#53ca97] transition-all"
              placeholder="•"
            />
          ))}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm">
          <div className="flex gap-2">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-blue-800">
              <p className="mb-1">Enter the code from your email</p>
              <p className="text-xs">Check your spam folder if you don't see it</p>
            </div>
          </div>
        </div>

        <div className="text-center mb-6">
          {resendTimer > 0 ? (
            <p className="text-sm text-gray-500">
              Resend code in <span className="text-[#53ca97] font-medium">{resendTimer}s</span>
            </p>
          ) : (
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-sm text-[#53ca97] hover:underline disabled:opacity-50"
            >
              {resending ? 'Sending...' : 'Resend verification code'}
            </button>
          )}
        </div>

        <Button
          onClick={handleVerify}
          disabled={verifying || code.join('').length !== 6}
          className="w-full h-12 disabled:opacity-50"
          style={{ backgroundColor: '#53ca97', color: 'white' }}
        >
          {verifying ? 'Verifying...' : 'Verify Email'}
        </Button>
      </Card>
    </div>
  );
}
