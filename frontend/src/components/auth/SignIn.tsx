import { useState } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { toast } from '../../lib/swal';
import { storage, STORAGE_KEYS } from '../../lib/storage';
import logo from '../../assets/livestockway-logo.svg';

interface SignInProps {
  onContinueOtherWays: () => void;
  onSignUp: () => void;
  onSignInSuccess: (token: string, userData: any) => void;
  onForgotPassword: () => void;
  showPasswordResetSuccess: boolean;
  onPasswordResetSuccessSeen: () => void;
}

export function SignIn({
  onContinueOtherWays,
  onSignUp,
  onSignInSuccess,
  onForgotPassword,
  showPasswordResetSuccess,
  onPasswordResetSuccessSeen
}: SignInProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const detectInputType = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (emailRegex.test(value)) return 'email';
    if (phoneRegex.test(value.trim()) && value.trim().length > 3) return 'mobile';
    return 'unknown';
  };

  const inputType = detectInputType(identifier);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      const payload: Record<string, string> = { password };

      if (inputType === 'email') {
        payload.email = identifier;
      } else if (inputType === 'mobile') {
        payload.phone = identifier;
      } else {
        payload.email = identifier;
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let message = 'Login failed';
        try {
          const data = await res.json();
          if (data?.message) message = data.message;
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      const data = await res.json();
      const token: string = data?.token;
      const userRole: string = data?.user?.user_type;
      const userId: string | number | undefined = data?.user?.id;
      const accountMode: string = data?.user?.account_mode || 'COMPANY';
      const planCode: string | null = data?.user?.individual_plan_code ?? null;

      if (!token || !userRole) {
        throw new Error('Invalid response from server');
      }

      localStorage.setItem('token', token);
      localStorage.setItem('role', userRole);
      storage.set(STORAGE_KEYS.ACCOUNT_MODE, accountMode);
      storage.set(STORAGE_KEYS.INDIVIDUAL_PLAN_CODE, planCode);
      if (userId !== undefined && userId !== null) {
        storage.set(STORAGE_KEYS.USER_ID, String(userId));
      }

      toast.success('Welcome back!');
      onSignInSuccess(token, { ...data?.user, token });
    } catch (err: any) {
      toast.error(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
<Card className="max-w-[500px] w-full px-6 py-6 shadow-sm">
  <div>

<div className="text-center mb-5">
          <div className="flex justify-center mb-3">
            <img src={logo} alt="Livestockway" className="h-16 w-auto" />
          </div>
          <h2 className="text-xl font-semibold">Welcome Back</h2>
          <p className="text-gray-500 text-xs mt-0.5">Sign in to continue</p>
        </div>

        {showPasswordResetSuccess && (
          <div className="mb-4 p-2.5 bg-green-50 border border-green-300 text-green-700 rounded-lg text-xs flex items-start gap-2">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p>Password reset successful!</p>
              <button
                onClick={onPasswordResetSuccessSeen}
                className="underline text-xs mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5 text-gray-600">Email or Mobile Number</label>
            <div className="relative">
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#42b883] focus:border-transparent transition-all text-sm"
                placeholder="you@example.com or +1 (555) 000-0000"
                required
              />
              {inputType !== 'unknown' && identifier && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <span className="text-[10px] bg-[#42b883]/10 text-[#42b883] px-1.5 py-0.5 rounded font-medium">
                    {inputType === 'email' ? 'Email' : 'Mobile'}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 text-gray-600">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#42b883] focus:border-transparent transition-all text-sm"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onForgotPassword}
            className="text-xs text-[#42b883] hover:underline"
          >
            Forgot password?
          </button>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-10 text-sm font-medium"
            style={{ backgroundColor: '#42b883', color: 'white' }}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-white text-gray-400">or</span>
          </div>
        </div>

        <button
          onClick={onContinueOtherWays}
          className="w-full py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-600"
        >
          Continue with other ways
        </button>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Don't have an account?{' '}
            <button onClick={onSignUp} className="text-[#42b883] font-medium hover:underline">
              Sign Up
            </button>
          </p>
        </div>
  </div>

      </Card>
    </div>
  );
}
