import { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Checkbox } from "../components/ui/checkbox";
import { Shield, Lock, Mail, Eye, EyeOff, AlertCircle } from "lucide-react";
import { toast } from '../lib/swal';
import { storage, STORAGE_KEYS } from "../lib/storage";
import { API_BASE_URL } from "../lib/api";

interface SuperAdminLoginProps {
  onLoginSuccess?: () => void;
}

export default function SuperAdminLogin({ onLoginSuccess }: SuperAdminLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || "Login failed");
      }
      const payload = await response.json();
      const token: string | undefined = payload?.token;
      const user = payload?.user;
      if (!token || !user) {
        throw new Error("Invalid response from server");
      }
      if ((user.user_type ?? "").toLowerCase() !== "super_admin") {
        throw new Error("This account is not authorized for super admin access");
      }
      localStorage.setItem("token", token);
      storage.set(STORAGE_KEYS.USER_ROLE, "super-admin");
      if (user.id !== undefined && user.id !== null) {
        storage.set(STORAGE_KEYS.USER_ID, String(user.id));
      }
      if (rememberMe) {
        storage.set(STORAGE_KEYS.USER_EMAIL, email);
      }
      toast.success("Welcome back, Super Admin!");
      onLoginSuccess?.();
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#172039] via-[#1f2a47] to-[#172039] flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <Card className="w-full max-w-md relative z-10 shadow-2xl border-gray-700">
        <CardHeader className="space-y-3 pb-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-[#172039] to-[#2a3f5f] rounded-2xl flex items-center justify-center shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>

          <div className="text-center space-y-2">
            <CardTitle className="text-2xl">Super Admin Access</CardTitle>
            <CardDescription className="text-gray-500">Secure login to LivestockWay TMS</CardDescription>
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

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">
                Admin Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="email"
                  type="email"
                  placeholder="superadmin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
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
                <label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer select-none">
                  Remember me
                </label>
              </div>
              <button
                type="button"
                onClick={() => toast.info("Please contact system administrator")}
                className="text-sm text-[#172039] hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <Button type="submit" className="w-full h-11 bg-[#172039] hover:bg-[#1f2a47] text-white" disabled={isLoading}>
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
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
