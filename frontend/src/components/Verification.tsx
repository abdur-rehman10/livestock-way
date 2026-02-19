import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from './ui/input-otp';
import logo from '../assets/livestockway-logo.svg';
import { toast } from '../lib/swal';

interface VerificationProps {
  contact?: string; // Can be email or phone
  email?: string;
  phone?: string;
  role?: string | null;
  onVerified: () => void;
  onBack?: () => void;
  onResend?: () => void;
}

export function Verification({ contact, email, phone, role, onVerified, onBack, onResend: onResendProp }: VerificationProps) {
  const displayContact = contact || email || phone;
  const [code, setCode] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((t) => t - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  const handleVerify = () => {
    // Mock verification - in production, verify with backend
    if (code.length !== 6) {
      toast.error('Please enter all 6 digits');
      return;
    }

    // Mock: Accept code "123456" as valid
    if (code === '123456') {
      toast.success('Verification successful!');
      onVerified();
    } else {
      setAttempts(attempts + 1);
      if (attempts >= 2) {
        toast.error('Too many incorrect attempts. Please request a new code.');
        setCode('');
        setAttempts(0);
      } else {
        toast.error(`Incorrect code. ${3 - attempts - 1} attempts remaining.`);
        setCode('');
      }
    }
  };

  const handleResend = () => {
    setTimer(30);
    setCanResend(false);
    setAttempts(0);
    if (onResendProp) {
      onResendProp();
    } else {
      toast.success('New code sent!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <img 
            src={logo} 
            alt="LivestockWay" 
            className="h-12 mx-auto mb-6"
          />
          <h1 className="text-2xl text-[#172039] mb-2">Verify Your Account</h1>
          <p className="text-gray-600">
            Enter the 6-digit code sent to<br />
            <span className="text-[#29CA8D]">{displayContact}</span>
          </p>
          {role && (
            <p className="text-sm text-gray-500 mt-2">
              Logging in as: <span className="font-semibold capitalize">{role}</span>
            </p>
          )}
        </div>

        {/* OTP Input */}
        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={(value) => setCode(value)}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>

        {/* Timer and Resend */}
        <div className="text-center">
          {!canResend ? (
            <p className="text-sm text-gray-600">
              Resend code in <span className="text-[#29CA8D]">{timer}s</span>
            </p>
          ) : (
            <Button
              variant="ghost"
              onClick={handleResend}
              className="text-[#29CA8D]"
            >
              Resend Code
            </Button>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleVerify}
            disabled={code.length !== 6}
            className="w-full h-12 bg-[#29CA8D] hover:bg-[#24b67d] text-white rounded-xl"
          >
            Verify
          </Button>
          {onBack && (
            <Button
              variant="ghost"
              onClick={onBack}
              className="w-full"
            >
              Back to Sign Up
            </Button>
          )}
        </div>

        {/* Help Text */}
        <p className="text-xs text-center text-gray-500">
          Didn't receive the code? Check your spam folder or try resending.
          <br />
          Demo code: <span className="text-[#29CA8D]">123456</span>
        </p>
      </div>
    </div>
  );
}
