import { useState, useRef, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';

interface OTPVerificationProps {
  mobile: string;
  onBack: () => void;
  onVerified: () => void;
}

export function OTPVerification({ mobile, onBack, onVerified }: OTPVerificationProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(30);
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
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    const newOtp = pastedData.split('');
    setOtp([...newOtp, ...Array(6 - newOtp.length).fill('')]);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-[400px] p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#53ca97]/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#53ca97]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl mb-2">Verify your number</h1>
          <p className="text-gray-500 text-sm">
            Enter the code sent to <span className="text-gray-900">{mobile}</span>
          </p>
        </div>

        <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
          {otp.map((digit, index) => (
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

        <div className="text-center mb-6">
          {resendTimer > 0 ? (
            <p className="text-sm text-gray-500">
              Resend code in <span className="text-[#53ca97]">{resendTimer}s</span>
            </p>
          ) : (
            <button className="text-sm text-[#53ca97] hover:underline">
              Resend verification code
            </button>
          )}
        </div>

        <Button
          onClick={onVerified}
          disabled={otp.join('').length !== 6}
          className="w-full h-12 mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#53ca97', color: 'white' }}
        >
          Verify Code
        </Button>

        <button
          onClick={onBack}
          className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 mx-auto transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
      </Card>
    </div>
  );
}
