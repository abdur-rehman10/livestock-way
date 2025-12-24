import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Truck, Home, Wrench, Eye, EyeOff, Check, X, User, Shield, ArrowLeft } from 'lucide-react';
import { Progress } from '../components/ui/progress';
import { storage, STORAGE_KEYS } from '../lib/storage';

interface SignupLoginProps {
  preselectedRole?: 'hauler' | 'shipper' | 'stakeholder' | 'driver' | 'super-admin';
  onAuth?: (role: 'hauler' | 'shipper' | 'stakeholder' | 'driver' | 'super-admin') => void;
  onForgotPassword?: () => void;
  onNeedVerification?: (contact: string, role: 'hauler' | 'shipper' | 'stakeholder' | 'driver' | 'super-admin') => void;
  onBackToLanding?: () => void;
}

export default function SignupLogin({ preselectedRole, onAuth, onForgotPassword, onNeedVerification, onBackToLanding }: SignupLoginProps) {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get role from navigation state if available
  const stateRole = (location.state as any)?.role;
  const initialRole = preselectedRole || stateRole || 'hauler';

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  
  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Signup fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'hauler' | 'shipper' | 'stakeholder' | 'driver' | 'super-admin'>(initialRole);
  const [isCompany, setIsCompany] = useState(false);
  
  // Company fields
  const [companyName, setCompanyName] = useState('');
  const [businessId, setBusinessId] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupLoading, setSignupLoading] = useState(false);

  const roleRedirects: Record<string, string> = {
    hauler: '/hauler/dashboard',
    shipper: '/shipper/dashboard',
    stakeholder: '/stakeholder/dashboard',
  };

  const navigateToRole = (userRole: string) => {
    const normalizedRole = userRole.toLowerCase();
    onAuth?.(normalizedRole as any);
    const target = roleRedirects[normalizedRole] || '/';
    navigate(target, { replace: true });
  };
  
  // Password strength
  const getPasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength += 25;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength += 25;
    if (/[0-9]/.test(pwd)) strength += 25;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength += 25;
    return strength;
  };

  const passwordStrength = getPasswordStrength(password);
  const getStrengthLabel = () => {
    if (passwordStrength <= 25) return 'Weak';
    if (passwordStrength <= 50) return 'Fair';
    if (passwordStrength <= 75) return 'Good';
    return 'Strong';
  };

  const getStrengthColor = () => {
    if (passwordStrength <= 25) return 'bg-red-500';
    if (passwordStrength <= 50) return 'bg-orange-500';
    if (passwordStrength <= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authMethod === 'phone' && onNeedVerification) {
      onNeedVerification?.(loginPhone, role);
      return;
    }

    try {
      setLoginError(null);
      setLoginLoading(true);

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });

      if (!res.ok) {
        let message = 'Login failed';
        try {
          const data = await res.json();
          if (data?.message) message = data.message;
        } catch (err) {
          // ignore
        }
        throw new Error(message);
      }

      const data = await res.json();
      const token: string = data?.token;
      const userRole: string = data?.user?.user_type;
      const userId: string | number | undefined = data?.user?.id;
      const accountMode: string = data?.user?.account_mode || 'COMPANY';

      if (!token || !userRole) {
        throw new Error('Invalid response from server');
      }

      localStorage.setItem('token', token);
      localStorage.setItem('role', userRole);
      storage.set(STORAGE_KEYS.ACCOUNT_MODE, accountMode);
      if (userId !== undefined && userId !== null) {
        storage.set(STORAGE_KEYS.USER_ID, String(userId));
      }

      navigateToRole(userRole);
    } catch (err: any) {
      setLoginError(err?.message || 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    if (passwordStrength < 50) {
      alert('Please use a stronger password');
      return;
    }

    try {
      setSignupError(null);
      setSignupLoading(true);

      const payload = {
        full_name: name,
        email,
        password,
        phone,
        user_type: role,
        account_mode: isCompany ? 'COMPANY' : 'INDIVIDUAL',
        company_name: isCompany ? companyName : undefined,
      };

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let message = 'Signup failed';
        try {
          const data = await res.json();
          if (data?.message) message = data.message;
        } catch (err) {
          // ignore parsing errors
        }
        throw new Error(message);
      }

      const data = await res.json();
      const token: string = data?.token;
      const userRole: string = data?.user?.user_type;
      const userId: string | number | undefined = data?.user?.id;
      const accountMode: string = data?.user?.account_mode || payload.account_mode || 'COMPANY';

      if (!token || !userRole) {
        throw new Error('Invalid response from server');
      }

      localStorage.setItem('token', token);
      localStorage.setItem('role', userRole);
      storage.set(STORAGE_KEYS.ACCOUNT_MODE, accountMode);
      if (userId !== undefined && userId !== null) {
        storage.set(STORAGE_KEYS.USER_ID, String(userId));
      }

      navigateToRole(userRole);
    } catch (err: any) {
      setSignupError(err?.message || 'Signup failed');
    } finally {
      setSignupLoading(false);
    }
  };

  const roles = [
    { id: 'hauler', label: 'Hauler', icon: Truck, color: '#29CA8D' },
    { id: 'shipper', label: 'Shipper', icon: Home, color: '#F97316' },
    { id: 'stakeholder', label: 'Service Provider', icon: Wrench, color: '#6B7280' },
    { id: 'driver', label: 'Driver', icon: User, color: '#29CA8D' },
    { id: 'super-admin', label: 'Super Admin', icon: Shield, color: '#172039' },
  ];

  const getRoleColor = (roleId: string) => {
    const roleData = roles.find(r => r.id === roleId);
    return roleData?.color || '#29CA8D';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#D1D5DB] to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-[#29CA8D] rounded-full flex items-center justify-center mx-auto mb-3">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl mb-1">LivestockWay</h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </p>
        </div>

        {/* Main Card */}
        <Card>
          <CardHeader>
            <Tabs value={mode} onValueChange={(v) => setMode(v as 'login' | 'signup')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent>
            {mode === 'login' ? (
              /* LOGIN FORM */
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Role Selection for Login */}
                <div className="space-y-2">
                  <Label>Select Your Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => {
                        const Icon = r.icon;
                        return (
                          <SelectItem key={r.id} value={r.id}>
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" style={{ color: r.color }} />
                              {r.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose the role you want to test (Demo mode)
                  </p>
                </div>

                {/* Auth Method Tabs */}
                <Tabs value={authMethod} onValueChange={(v) => setAuthMethod(v as 'email' | 'phone')}>
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="email">Email</TabsTrigger>
                    <TabsTrigger value="phone">Phone</TabsTrigger>
                  </TabsList>

                  <TabsContent value="email" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email Address</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@example.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-password">Password</Label>
                        {onForgotPassword && (
                          <button
                            type="button"
                            onClick={onForgotPassword}
                            className="text-xs text-[#29CA8D] hover:underline"
                          >
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="phone" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-phone">Phone Number</Label>
                      <Input
                        id="login-phone"
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        value={loginPhone}
                        onChange={(e) => setLoginPhone(e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        We'll send you an OTP to verify
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>

                {loginError && authMethod === 'email' && (
                  <p className="text-sm text-red-600">{loginError}</p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={loginLoading}
                >
                  {authMethod === 'phone'
                    ? 'Send OTP'
                    : loginLoading
                      ? 'Signing in...'
                      : 'Sign In'}
                </Button>
              </form>
            ) : (
              /* SIGNUP FORM */
              <form onSubmit={handleSignupSubmit} className="space-y-4">
                {/* Role Selection */}
                <div className="space-y-2">
                  <Label>I am a...</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => {
                        const Icon = r.icon;
                        return (
                          <SelectItem key={r.id} value={r.id}>
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" style={{ color: r.color }} />
                              {r.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Company Toggle */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <Label htmlFor="company-toggle" className="cursor-pointer">
                      Register as company
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      For businesses and organizations
                    </p>
                  </div>
                  <Switch
                    id="company-toggle"
                    checked={isCompany}
                    onCheckedChange={setIsCompany}
                  />
                </div>

                {/* Company Fields */}
                {isCompany && (
                  <div className="space-y-3 p-3 bg-muted/50 rounded-lg border">
                    <div className="space-y-2">
                      <Label htmlFor="company-name">Company Name *</Label>
                      <Input
                        id="company-name"
                        placeholder="Acme Livestock Transport"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        required={isCompany}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="business-id">Business ID / Tax ID *</Label>
                      <Input
                        id="business-id"
                        placeholder="XX-XXXXXXX"
                        value={businessId}
                        onChange={(e) => setBusinessId(e.target.value)}
                        required={isCompany}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="company-address">Business Address *</Label>
                      <Input
                        id="company-address"
                        placeholder="123 Main St, City, State ZIP"
                        value={companyAddress}
                        onChange={(e) => setCompanyAddress(e.target.value)}
                        required={isCompany}
                      />
                    </div>
                  </div>
                )}

                {/* Personal Info */}
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                {/* Contact Method */}
                <Tabs value={authMethod} onValueChange={(v) => setAuthMethod(v as 'email' | 'phone')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="email">Email</TabsTrigger>
                    <TabsTrigger value="phone">Phone</TabsTrigger>
                  </TabsList>

                  <TabsContent value="email" className="space-y-2 mt-3">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </TabsContent>

                  <TabsContent value="phone" className="space-y-2 mt-3">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </TabsContent>
                </Tabs>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a strong password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  {/* Password Strength Indicator */}
                  {password && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Password strength:</span>
                        <span className={passwordStrength >= 75 ? 'text-green-600' : passwordStrength >= 50 ? 'text-yellow-600' : 'text-red-600'}>
                          {getStrengthLabel()}
                        </span>
                      </div>
                      <Progress value={passwordStrength} className="h-1" />
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="flex items-center gap-1">
                          {password.length >= 8 ? <Check className="w-3 h-3 text-green-600" /> : <X className="w-3 h-3 text-gray-400" />}
                          <span>At least 8 characters</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {/[A-Z]/.test(password) && /[a-z]/.test(password) ? <Check className="w-3 h-3 text-green-600" /> : <X className="w-3 h-3 text-gray-400" />}
                          <span>Upper & lowercase letters</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {/[0-9]/.test(password) ? <Check className="w-3 h-3 text-green-600" /> : <X className="w-3 h-3 text-gray-400" />}
                          <span>At least one number</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password *</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  {confirmPassword && (
                    <p className={`text-xs ${password === confirmPassword ? 'text-green-600' : 'text-red-600'}`}>
                      {password === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                    </p>
                  )}
                </div>

                {signupError && (
                  <p className="text-sm text-red-600">{signupError}</p>
                )}

                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={signupLoading}
                  style={{ backgroundColor: getRoleColor(role) }}
                >
                  {signupLoading ? 'Creating account...' : 'Create Account'}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  By signing up, you agree to our{' '}
                  <button className="text-[#29CA8D] hover:underline">Terms</button>
                  {' '}and{' '}
                  <button className="text-[#29CA8D] hover:underline">Privacy Policy</button>
                </p>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Back to Landing */}
        {onBackToLanding && (
          <div className="text-center mt-4">
            <Button variant="ghost" onClick={onBackToLanding}>
              ← Back to role selection
            </Button>
          </div>
        )}

        <div className="text-center mt-6 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => navigate('/admin/login')}
            className="inline-flex items-center gap-1 text-[#172039] hover:text-[#0b1530]"
          >
            <Shield className="w-3 h-3" /> Administrator Access
          </button>
        </div>
      </div>
    </div>
  );
}
