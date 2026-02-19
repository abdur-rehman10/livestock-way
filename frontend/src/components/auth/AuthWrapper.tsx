import { useState } from 'react';
import { updatePreferences } from '../../lib/storage';
import { SignIn } from './SignIn';
import { ContinueOtherWays } from './ContinueOtherWays';
import { SignUp } from './SignUp';
import { WelcomeBackModal } from './WelcomeBackModal';
import { SignUpForm } from './SignUpForm';
import { EmailConfirmation } from './EmailConfirmation';
import { OTPVerification } from './OTPVerification';
import { ForgotPassword } from './ForgotPassword';
import { ResetPassword } from './ResetPassword';
import { Pricing } from './Pricing';
import { Payment } from './Payment';
import { EnterpriseSelection } from './EnterpriseSelection';
import { BookConsultation } from './BookConsultation';
import { SocialSignUpRoleSelection } from './SocialSignUpRoleSelection';
import { ProfileSetupModal } from './ProfileSetupModal';

export type AuthScreen =
  | "sign-in"
  | "continue-other-ways"
  | "sign-up"
  | "social-role-selection"
  | "sign-up-form"
  | "email-confirmation"
  | "otp-verification"
  | "profile-setup"
  | "forgot-password"
  | "reset-password"
  | "pricing"
  | "payment"
  | "book-consultation";

export type AuthUserRole = "hauler" | "enterprise" | "shipper" | "resource-provider" | null;

export type BackendRole = "hauler" | "shipper" | "stakeholder" | "driver" | "super-admin";

export function mapAuthRoleToBackend(role: AuthUserRole): BackendRole {
  switch (role) {
    case 'hauler':
    case 'enterprise':
      return 'hauler';
    case 'shipper':
      return 'shipper';
    case 'resource-provider':
      return 'stakeholder';
    default:
      return 'hauler';
  }
}

export function getAccountMode(role: AuthUserRole): 'COMPANY' | 'INDIVIDUAL' {
  return role === 'enterprise' ? 'COMPANY' : 'INDIVIDUAL';
}

interface AuthWrapperProps {
  onAuthComplete: (backendRole: BackendRole, token: string, userData: any) => void;
  onForgotPassword?: () => void;
}

export function AuthWrapper({ onAuthComplete }: AuthWrapperProps) {
  const [currentScreen, setCurrentScreen] = useState<AuthScreen>("sign-in");
  const [selectedRole, setSelectedRole] = useState<AuthUserRole>(null);
  const [resetEmail, setResetEmail] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupMobile, setSignupMobile] = useState("");
  const [showPasswordResetSuccess, setShowPasswordResetSuccess] = useState(false);
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState({ planName: "", price: "" });
  const [comingFromPricing, setComingFromPricing] = useState(false);
  const [fromSocialAuth, setFromSocialAuth] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);

  const handlePricingSelect = (plan: "resource-provider" | "shipper" | "hauler" | "enterprise") => {
    setSelectedRole(plan === "enterprise" ? "enterprise" : plan);
    setComingFromPricing(true);

    if (fromSocialAuth) {
      if (plan === "resource-provider" || plan === "shipper") {
        setShowProfileSetup(true);
        setCurrentScreen("profile-setup");
      } else if (plan === "hauler") {
        setShowProfileSetup(true);
        setCurrentScreen("profile-setup");
      } else if (plan === "enterprise") {
        setShowEnterpriseModal(true);
      }
    } else {
      if (plan === "resource-provider" || plan === "shipper") {
        setCurrentScreen("sign-up-form");
      } else if (plan === "hauler") {
        setCurrentScreen("sign-up-form");
      } else if (plan === "enterprise") {
        setShowEnterpriseModal(true);
      }
    }
  };

  const handleEnterpriseSelect = (tier: "tier1" | "tier2" | "tier3" | "consultation") => {
    setShowEnterpriseModal(false);

    if (tier === "consultation") {
      setCurrentScreen("book-consultation");
    } else {
      const prices = {
        tier1: "$70/month",
        tier2: "$150/month",
        tier3: "$250/month",
      };
      setPaymentInfo({ planName: "Enterprise", price: prices[tier] });

      if (fromSocialAuth) {
        setCurrentScreen("payment");
      } else {
        setCurrentScreen("sign-up-form");
      }
    }
  };

  const handleProfileComplete = (profileData: any) => {
    setShowProfileSetup(false);
    updatePreferences({ showOnboarding: false });
    onAuthComplete(mapAuthRoleToBackend(selectedRole), '', profileData);
  };

  const handleSignInSuccess = (token: string, userData: any) => {
    const backendRole = userData?.user_type as BackendRole;
    onAuthComplete(backendRole, token, userData);
  };

  const handleSignUpSuccess = (token: string, userData: any) => {
    const backendRole = userData?.user_type as BackendRole;
    onAuthComplete(backendRole, token, userData);
  };

  return (
    <div className="min-h-screen bg-background">
      {currentScreen === "sign-in" && (
        <SignIn
          onContinueOtherWays={() => setCurrentScreen("continue-other-ways")}
          onSignUp={() => setCurrentScreen("sign-up")}
          onSignInSuccess={handleSignInSuccess}
          onForgotPassword={() => setCurrentScreen("forgot-password")}
          showPasswordResetSuccess={showPasswordResetSuccess}
          onPasswordResetSuccessSeen={() => setShowPasswordResetSuccess(false)}
        />
      )}

      {currentScreen === "continue-other-ways" && (
        <ContinueOtherWays
          onBack={() => setCurrentScreen("sign-in")}
          onSuccess={() => setCurrentScreen("social-role-selection")}
        />
      )}

      {currentScreen === "sign-up" && (
        <SignUp
          onBack={() => setCurrentScreen("sign-in")}
          onSelectRole={(role) => {
            setSelectedRole(role);
            setComingFromPricing(false);
            setCurrentScreen("sign-up-form");
          }}
          onViewPricing={() => setCurrentScreen("pricing")}
          onShowEnterprisePricing={() => {
            setSelectedRole("enterprise");
            setShowEnterpriseModal(true);
          }}
        />
      )}

      {currentScreen === "social-role-selection" && (
        <SocialSignUpRoleSelection
          onSelectRole={(role) => {
            setSelectedRole(role);
            setComingFromPricing(false);
            setFromSocialAuth(false);
            setShowProfileSetup(true);
            setCurrentScreen("profile-setup");
          }}
          onViewPricing={() => {
            setFromSocialAuth(true);
            setCurrentScreen("pricing");
          }}
          onShowEnterprisePricing={() => {
            setSelectedRole("enterprise");
            setFromSocialAuth(true);
            setShowEnterpriseModal(true);
          }}
          onBack={() => setCurrentScreen("sign-in")}
        />
      )}

      {currentScreen === "sign-up-form" && selectedRole && (
        <SignUpForm
          onBack={() => setCurrentScreen(comingFromPricing ? "pricing" : "sign-up")}
          onSignUpComplete={(signupMethod, email, mobile) => {
            setSignupEmail(email);
            setSignupMobile(mobile);
            if (signupMethod === "email") {
              setCurrentScreen("email-confirmation");
            } else {
              setCurrentScreen("otp-verification");
            }
          }}
          onSignUpSuccess={handleSignUpSuccess}
          selectedRole={selectedRole}
        />
      )}

      {currentScreen === "email-confirmation" && (
        <EmailConfirmation
          email={signupEmail}
          onContinue={() => {
            if (selectedRole === "enterprise" && paymentInfo.planName) {
              setCurrentScreen("payment");
            } else {
              setShowProfileSetup(true);
              setCurrentScreen("profile-setup");
            }
          }}
          onBack={() => setCurrentScreen("sign-up-form")}
        />
      )}

      {currentScreen === "otp-verification" && (
        <OTPVerification
          mobile={signupMobile}
          onBack={() => setCurrentScreen("sign-up-form")}
          onVerified={() => {
            if (selectedRole === "enterprise" && paymentInfo.planName) {
              setCurrentScreen("payment");
            } else {
              setShowProfileSetup(true);
              setCurrentScreen("profile-setup");
            }
          }}
        />
      )}

      {currentScreen === "profile-setup" && (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
          <ProfileSetupModal
            isOpen={showProfileSetup}
            onClose={() => setShowProfileSetup(false)}
            userRole={selectedRole}
            verifiedEmail={signupEmail}
            verifiedPhone={signupMobile}
            onComplete={handleProfileComplete}
          />
        </div>
      )}

      {currentScreen === "forgot-password" && (
        <ForgotPassword
          onBack={() => setCurrentScreen("sign-in")}
          onCodeSent={(email) => {
            setResetEmail(email);
            setCurrentScreen("reset-password");
          }}
        />
      )}

      {currentScreen === "reset-password" && (
        <ResetPassword
          email={resetEmail}
          onBack={() => setCurrentScreen("forgot-password")}
          onResetSuccess={() => {
            setShowPasswordResetSuccess(true);
            setCurrentScreen("sign-in");
          }}
        />
      )}

      {currentScreen === "pricing" && (
        <Pricing
          onBack={() => setCurrentScreen(fromSocialAuth ? "social-role-selection" : "sign-up")}
          onSelectPlan={handlePricingSelect}
        />
      )}

      {currentScreen === "payment" && (
        <Payment
          onBack={() => setCurrentScreen(comingFromPricing ? "pricing" : "sign-up")}
          planName={paymentInfo.planName}
          price={paymentInfo.price}
          onPaymentSuccess={() => {
            setShowProfileSetup(true);
            setCurrentScreen("profile-setup");
          }}
          onSkip={() => {
            setShowProfileSetup(true);
            setCurrentScreen("profile-setup");
          }}
          userRole={selectedRole}
        />
      )}

      {currentScreen === "book-consultation" && (
        <BookConsultation
          onBack={() => setShowEnterpriseModal(true)}
          onConsultationBooked={() => setCurrentScreen("sign-in")}
        />
      )}

      {showEnterpriseModal && (
        <EnterpriseSelection
          onClose={() => setShowEnterpriseModal(false)}
          onSelectTier={handleEnterpriseSelect}
        />
      )}
    </div>
  );
}
