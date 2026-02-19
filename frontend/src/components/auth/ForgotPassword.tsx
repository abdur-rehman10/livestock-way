import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { toast } from '../../lib/swal';

interface ForgotPasswordProps {
  onBack: () => void;
  onCodeSent: (email: string) => void;
}

export function ForgotPassword({ onBack, onCodeSent }: ForgotPasswordProps) {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);

  const detectInputType = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (emailRegex.test(value)) return 'email';
    if (phoneRegex.test(value.trim()) && value.trim().length > 3) return 'phone';
    return 'unknown';
  };

  const inputType = detectInputType(identifier);

  const handleSubmit = async () => {
    if (!identifier || inputType === 'unknown') {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: identifier }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to send reset code');

      toast.success('Reset code sent! Check your email.');
      onCodeSent(identifier);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#53ca97]/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#53ca97]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Reset Password</h2>
          <p className="text-gray-600 text-sm">Enter your email to receive a reset code</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm mb-2 text-gray-700">Email Address</label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#53ca97]"
            placeholder="you@example.com"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          {identifier && inputType !== 'unknown' && (
            <p className="text-xs text-[#53ca97] mt-2">
              {inputType === 'email' ? 'Email detected' : 'Phone number detected'}
            </p>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={inputType === 'unknown' || !identifier || loading}
          className="w-full h-11 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#53ca97', color: 'white' }}
        >
          {loading ? 'Sending...' : 'Send Reset Code'}
        </Button>

        <button
          onClick={onBack}
          className="mt-4 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 mx-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Sign In
        </button>
      </Card>
    </div>
  );
}
