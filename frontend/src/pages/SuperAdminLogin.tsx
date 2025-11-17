import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Checkbox } from '../components/ui/checkbox';
import { Shield, Lock, Mail, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface SuperAdminLoginProps {
  onLoginSuccess?: () => void;
}

export function SuperAdminLogin({ onLoginSuccess }: SuperAdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [require2FA, setRequire2FA] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      if (email === 'admin@livestockway.com' && password === 'admin123') {
        if (!require2FA) {
          setRequire2FA(true);
          setIsLoading(false);
          toast.info('2FA code sent to your email');
          return;
        }

        if (otpCode === '123456' || otpCode === '') {
          toast.success('Login successful!');
          setIsLoading(false);
          onLoginSuccess?.();
        } else {
          setError('Invalid 2FA code. Please try again.');
          setIsLoading(false);
        }
      } else {
        setError('Invalid credentials. Please check your email and password.');
        setIsLoading(false);
      }
    }, 1500);
  };

  const handleResend2FA = () => {
    toast.success('2FA code resent to your email');
  };

  const handleBackToLogin = () => {
    setRequire2FA(false);
    setOtpCode('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#172039] via-[#1f2a47] to-[#172039] flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      <Card className="w-full max-w-md relative z-10 shadow-2xl border-gray-700">
        <CardHeader className="space-y-3 pb-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-[#172039] to-[#2a3f5f] rounded-2xl flex items-center justify-center shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>

          <div className="text-center space-y-2">
            <CardTitle className="text-2xl">SuperAdmin Access</CardTitle>
            <CardDescription className="text-gray-500">
              {require2FA ? 'Enter your verification code' : 'Secure login to LivestockWay TMS'}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!require2FA ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700">Admin Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@livestockway.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-11"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-11"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    />
                    <label
                      htmlFor="remember"
                      className="text-sm text-gray-600 cursor-pointer select-none"
                    >
                      Remember me
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => toast.info('Please contact system administrator')}
                    className="text-sm text-[#172039] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-[#172039] hover:bg-[#1f2a47] text-white"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Authenticating...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Sign In
                    </div>
                  )}
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-gray-700">Verification Code</Label>
                  <div className="relative">
                    <CheckCircle2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="otp"
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="pl-10 h-11 text-center tracking-widest text-xl"
                      maxLength={6}
                      required
                      autoComplete="one-time-code"
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    A 6-digit code has been sent to {email}
                  </p>
                </div>

                <Alert className="bg-blue-50 border-blue-200">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 text-sm">
                    <strong>Demo Mode:</strong> Use code <code className="bg-blue-100 px-2 py-0.5 rounded">123456</code> or leave empty
                  </AlertDescription>
                </Alert>

                <Button
                  type="submit"
                  className="w-full h-11 bg-[#172039] hover:bg-[#1f2a47] text-white"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Verifying...
                    </div>
                  ) : (
                    'Verify & Sign In'
                  )}
                </Button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="text-gray-600 hover:text-gray-900 hover:underline"
                  >
                    ← Back to login
                  </button>
                  <button
                    type="button"
                    onClick={handleResend2FA}
                    className="text-[#172039] hover:underline"
                  >
                    Resend code
                  </button>
                </div>
              </>
            )}
          </form>

          {!require2FA && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <Alert className="bg-gray-50 border-gray-200">
                <AlertCircle className="h-4 w-4 text-gray-600" />
                <AlertDescription className="text-gray-700 text-sm">
                  <strong>Demo Credentials:</strong>
                  <br />
                  Email: <code className="bg-gray-200 px-2 py-0.5 rounded">admin@livestockway.com</code>
                  <br />
                  Password: <code className="bg-gray-200 px-2 py-0.5 rounded">admin123</code>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>

        <div className="px-6 pb-6">
          <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
            <Lock className="w-3 h-3" />
            <span>Secured with enterprise-grade encryption</span>
          </div>
        </div>
      </Card>

      <div className="absolute bottom-4 left-0 right-0 text-center">
        <p className="text-white/60 text-sm">
          LivestockWay TMS © 2025 • Administrator Portal
        </p>
      </div>
    </div>
  );
}

export default SuperAdminLogin;
