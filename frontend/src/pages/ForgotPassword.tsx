import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../components/ui/input-otp';
import logo from '../assets/livestockway-logo.svg';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

interface ForgotPasswordProps {
  onBack?: () => void;
}

type Step = 'email' | 'code' | 'reset' | 'success';

export function ForgotPassword({ onBack }: ForgotPasswordProps) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email or phone');
      return;
    }
    // Mock API call
    toast.success('Reset code sent to your email/phone');
    setStep('code');
  };

  const handleVerifyCode = () => {
    if (code.length !== 6) {
      toast.error('Please enter all 6 digits');
      return;
    }
    // Mock verification (accept 123456)
    if (code === '123456') {
      setStep('reset');
    } else {
      toast.error('Invalid code. Please try again.');
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    // Mock API call
    setStep('success');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <img 
            src={logo} 
            alt="LivestockWay" 
            className="h-12 mx-auto mb-2"
          />
        </div>

        {/* Step 1: Enter Email/Phone */}
        {step === 'email' && (
          <Card>
            <CardHeader>
              <CardTitle>Reset Password</CardTitle>
              <CardDescription>
                Enter your email or phone number to receive a reset code
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email or Phone</Label>
                  <Input
                    id="email"
                    type="text"
                    placeholder="you@example.com or +1234567890"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onBack?.()}
                    className="flex-1"
                    disabled={!onBack}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-[#29CA8D] hover:bg-[#24b67d]"
                  >
                    Send Code
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Enter Code */}
        {step === 'code' && (
          <Card>
            <CardHeader>
              <CardTitle>Enter Reset Code</CardTitle>
              <CardDescription>
                Enter the 6-digit code sent to {email}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('email')}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleVerifyCode}
                  disabled={code.length !== 6}
                  className="flex-1 bg-[#29CA8D] hover:bg-[#24b67d]"
                >
                  Verify
                </Button>
              </div>

              <p className="text-xs text-center text-gray-500">
                Demo code: <span className="text-[#29CA8D]">123456</span>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Reset Password */}
        {step === 'reset' && (
          <Card>
            <CardHeader>
              <CardTitle>Create New Password</CardTitle>
              <CardDescription>
                Enter your new password below
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#29CA8D] hover:bg-[#24b67d]"
                >
                  Reset Password
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Success */}
        {step === 'success' && (
          <Card>
            <CardContent className="pt-12 pb-8 text-center">
              <div className="w-16 h-16 bg-[#29CA8D]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-[#29CA8D]" />
              </div>
              <h2 className="text-2xl text-[#172039] mb-2">Password Reset!</h2>
              <p className="text-gray-600 mb-6">
                Your password has been successfully reset.
              </p>
              <Button
                onClick={() => onBack?.()}
                className="w-full bg-[#29CA8D] hover:bg-[#24b67d]"
                disabled={!onBack}
              >
                Back to Login
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
