import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Loader2, ExternalLink, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "../lib/swal";
import {
  fetchStripeConnectStatus,
  startStripeConnectOnboarding,
  type StripeConnectStatus,
} from "../api/marketplace";

export default function StripeConnectSetup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<StripeConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(false);

  const isReturn = searchParams.get("return") === "true";
  const isRefresh = searchParams.get("refresh") === "true";

  const loadStatus = async () => {
    try {
      setLoading(true);
      const s = await fetchStripeConnectStatus();
      setStatus(s);
      if (isReturn && s.onboardingComplete) {
        toast.success("Stripe Connect setup complete! You can now receive payments.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load Stripe status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleStartOnboarding = async () => {
    try {
      setOnboarding(true);
      const result = await startStripeConnectOnboarding();
      window.location.href = result.url;
    } catch (err: any) {
      toast.error(err?.message || "Failed to start onboarding");
      setOnboarding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#29CA8D]" />
      </div>
    );
  }

  if (status?.onboardingComplete) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <h2 className="text-xl font-semibold text-green-800">Stripe Setup Complete</h2>
                <p className="text-sm text-green-700">
                  Your Stripe account is verified and ready to receive payments.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-white rounded-lg p-3 border border-green-100">
                <p className="text-xs text-slate-500">Charges</p>
                <p className="text-sm font-semibold text-green-700">Enabled</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-green-100">
                <p className="text-xs text-slate-500">Payouts</p>
                <p className="text-sm font-semibold text-green-700">Enabled</p>
              </div>
            </div>
            <Button
              className="mt-4 bg-[#29CA8D] hover:bg-[#24b67d]"
              onClick={() => navigate("/hauler/dashboard")}
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#172039]">Stripe Connect Setup</h1>
        <p className="text-sm text-slate-600">
          Set up your Stripe account to receive payments from shippers. This is required before you can create trips.
        </p>
      </div>

      {isRefresh && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <p className="text-sm text-amber-800">
                Your onboarding session expired. Please click below to continue.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg viewBox="0 0 60 25" className="h-6" fill="none">
              <path
                d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a12.9 12.9 0 0 1-4.56.78c-4.01 0-6.83-2.5-6.83-7.14 0-4.34 2.65-7.26 6.48-7.26 3.84 0 5.81 2.95 5.81 7.14 0 .55-.05 1.26-.1 1.56zm-8-2.48h4.38c0-1.73-.73-2.82-2.14-2.82-1.31 0-2.13 1.03-2.24 2.82zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.56 2.58 5.56 7.06 0 5.02-2.7 7.94-5.59 7.94zm-.96-11.02c-.84 0-1.44.28-1.96.76l.03 6.58c.5.44 1.09.72 1.93.72 1.48 0 2.5-1.62 2.5-4.05s-1.04-4.01-2.5-4.01zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7 4.13-.88v3.56h-4.13V.87zm-5.09 3.5c.64 0 1.26.09 1.26.09v3.73s-.61-.05-1.07-.05c-1.17 0-2.07.53-2.07 2.14v9.73h-4.12V5.88l3.71-.31.23 1.36c.79-1 1.86-1.56 3.06-1.56zM11.79 20.3c-2.68 0-4.54-.75-4.54-.75v-3.38s1.83.75 3.94.75c1.14 0 2.04-.24 2.04-1.18 0-2.02-6.15-1.53-6.15-6.35 0-3.32 2.63-4.86 5.58-4.86 1.89 0 3.97.61 3.97.61v3.35s-1.51-.67-3.39-.67c-1.14 0-2.02.33-2.02 1.1 0 2.07 6.15 1.54 6.15 6.27 0 3.4-2.66 5.1-5.58 5.1z"
                fill="#635bff"
              />
            </svg>
            Connect Your Account
          </CardTitle>
          <CardDescription>
            Stripe securely handles your payment processing. You'll be redirected to Stripe to complete verification.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-sm text-slate-800">What you'll need:</h3>
            <ul className="text-sm text-slate-600 space-y-2">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-[#29CA8D]/10 text-[#29CA8D] flex items-center justify-center text-xs font-bold">1</span>
                Bank account or debit card details
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-[#29CA8D]/10 text-[#29CA8D] flex items-center justify-center text-xs font-bold">2</span>
                Business or personal identification (SSN/EIN)
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-[#29CA8D]/10 text-[#29CA8D] flex items-center justify-center text-xs font-bold">3</span>
                Business address and contact details
              </li>
            </ul>
          </div>

          {status?.connected && !status.onboardingComplete && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <p className="text-sm text-amber-800">
                  Your account is connected but verification is incomplete. Continue below.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              className="bg-[#635bff] hover:bg-[#4b44e0] text-white"
              onClick={handleStartOnboarding}
              disabled={onboarding}
            >
              {onboarding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Redirecting to Stripe…
                </>
              ) : status?.connected ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Continue Setup
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Set Up Stripe Account
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
