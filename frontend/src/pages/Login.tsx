import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Truck, Package, Building2, Shield } from 'lucide-react';
import logo from '../assets/livestockway-logo.svg';

interface LoginProps {
  onLogin?: (role: 'shipper' | 'driver' | 'hauler' | 'super-admin') => void;
  onForgotPassword?: () => void;
  onNeedVerification?: (email: string) => void;
}

export function Login({ onLogin, onForgotPassword, onNeedVerification }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRole, setSelectedRole] = useState<'shipper' | 'driver' | 'hauler' | 'super-admin'>('driver');
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginMethod === 'phone') {
      onNeedVerification?.(phone);
    } else {
      onLogin?.(selectedRole);
    }
  };

  const roles = [
    { id: 'driver', label: 'Driver', icon: Truck, color: '#29CA8D' },
    { id: 'shipper', label: 'Shipper', icon: Package, color: '#F97316' },
    { id: 'hauler', label: 'Hauler', icon: Building2, color: '#172039' },
    { id: 'super-admin', label: 'Admin', icon: Shield, color: '#172039' },
  ];

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
          <p className="text-gray-600">Sign in to continue</p>
        </div>

        {/* Role Selection */}
        <div className="grid grid-cols-2 gap-3">
          {roles.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.id;
            return (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id as any)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-[#29CA8D] bg-[#29CA8D]/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon
                  className={`w-8 h-8 mx-auto mb-2 ${
                    isSelected ? 'text-[#29CA8D]' : 'text-gray-400'
                  }`}
                />
                <div className={isSelected ? 'text-[#29CA8D]' : 'text-gray-600'}>
                  {role.label}
                </div>
              </button>
            );
          })}
        </div>

        {/* Login Form */}
        <Card>
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="email" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="phone">Phone</TabsTrigger>
              </TabsList>
              
              <TabsContent value="email">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      {onForgotPassword && (
                        <button
                          type="button"
                          onClick={onForgotPassword}
                          className="text-xs text-[#29CA8D] hover:underline"
                        >
                          Forgot?
                        </button>
                      )}
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-[#29CA8D] hover:bg-[#24b67d] text-white rounded-xl"
                  >
                    Sign In
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="phone">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full h-12 bg-[#29CA8D] hover:bg-[#24b67d] text-white rounded-xl"
                  >
                    Send OTP
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-4 text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <button className="text-[#29CA8D] hover:underline">
                Sign up
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Demo Credentials Card */}
        <Card className="bg-gradient-to-r from-[#29CA8D]/10 to-[#F97316]/10 border-[#29CA8D]/20">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-gray-900 mb-2">
                🎭 <strong>Interactive Prototype</strong> - Use any credentials!
              </p>
              <div className="text-xs text-gray-600 space-y-1">
                <p>📧 Email: <span className="text-[#29CA8D]">demo@driver.com</span> (or any email)</p>
                <p>🔑 Password: <span className="text-[#29CA8D]">anything works</span></p>
                <p>📱 OTP Code: <span className="text-[#29CA8D]">123456</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
