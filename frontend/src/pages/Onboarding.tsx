import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Truck, Package, Users, ArrowRight } from 'lucide-react';
import logo from '../assets/livestockway-logo.svg';

interface OnboardingProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

const onboardingSteps = [
  {
    title: 'Welcome to LivestockWay',
    description: 'Seamless livestock load posting and matching between shippers and drivers',
    icon: Package,
  },
  {
    title: 'For Drivers',
    description: 'Accept trips, manage deliveries, and earn with minimal friction',
    icon: Truck,
  },
  {
    title: 'For Shippers',
    description: 'Post loads, track shipments, and connect with trusted drivers',
    icon: Users,
  },
];

export function Onboarding({ onComplete, onSkip }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;
  const step = onboardingSteps[currentStep];
  const Icon = step.icon;

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete?.();
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      onComplete?.();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col">
      {/* Logo */}
      <div className="pt-12 pb-8 text-center">
        <img 
          src={logo} 
          alt="LivestockWay" 
          className="h-12 mx-auto"
        />
      </div>

      {/* Progress */}
      <div className="px-6 mb-8">
        <Progress value={progress} className="h-1" />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-[#29CA8D]/10 mb-6">
            <Icon className="w-12 h-12 text-[#29CA8D]" />
          </div>
          
          <div className="space-y-4">
            <h1 className="text-3xl text-[#172039]">{step.title}</h1>
            <p className="text-lg text-gray-600">{step.description}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 pb-8 space-y-4">
        <Button
          onClick={handleNext}
          className="w-full h-14 bg-[#29CA8D] hover:bg-[#24b67d] text-white rounded-xl"
        >
          {currentStep < onboardingSteps.length - 1 ? 'Continue' : 'Get Started'}
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
        
        {currentStep < onboardingSteps.length - 1 && (
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="w-full"
          >
            Skip
          </Button>
        )}
      </div>
    </div>
  );
}
