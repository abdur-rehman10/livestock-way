import { Check } from "lucide-react";
import { cn } from "./utils";
import { Button } from "./button";

interface Step {
  label: string;
}

interface FormStepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function FormStepper({ steps, currentStep, onStepClick }: FormStepperProps) {
  return (
    <div className="flex items-center justify-between w-full mb-6">
      {steps.map((step, idx) => {
        const isComplete = idx < currentStep;
        const isActive = idx === currentStep;
        return (
          <div key={idx} className="flex items-center flex-1 last:flex-none">
            <button
              type="button"
              onClick={() => isComplete && onStepClick?.(idx)}
              className={cn(
                "flex items-center gap-2 shrink-0",
                isComplete && onStepClick ? "cursor-pointer" : "cursor-default"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors border-2",
                  isComplete && "bg-[#29CA8D] border-[#29CA8D] text-white",
                  isActive && "bg-white border-[#29CA8D] text-[#29CA8D]",
                  !isComplete && !isActive && "bg-white border-gray-300 text-gray-400"
                )}
              >
                {isComplete ? <Check className="w-4 h-4" /> : idx + 1}
              </div>
              <span
                className={cn(
                  "text-sm font-medium hidden sm:inline",
                  isActive && "text-[#29CA8D]",
                  isComplete && "text-gray-700 dark:text-gray-300",
                  !isComplete && !isActive && "text-gray-400"
                )}
              >
                {step.label}
              </span>
            </button>
            {idx < steps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 flex-1 mx-3 rounded transition-colors",
                  idx < currentStep ? "bg-[#29CA8D]" : "bg-gray-200 dark:bg-gray-700"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface FormStepperNavProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  nextDisabled?: boolean;
  submitDisabled?: boolean;
  submitting?: boolean;
  submitLabel?: string;
}

export function FormStepperNav({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  onSubmit,
  nextDisabled,
  submitDisabled,
  submitting,
  submitLabel = "Submit",
}: FormStepperNavProps) {
  const isLast = currentStep === totalSteps - 1;
  return (
    <div className="flex justify-between pt-4 border-t mt-4">
      <Button
        type="button"
        variant="outline"
        onClick={onBack}
        disabled={currentStep === 0}
      >
        Back
      </Button>
      {isLast ? (
        <Button
          type="button"
          onClick={onSubmit}
          disabled={submitDisabled || submitting}
          className="bg-[#29CA8D] hover:bg-[#24b57e] text-white"
        >
          {submitting ? "Submitting..." : submitLabel}
        </Button>
      ) : (
        <Button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="bg-[#29CA8D] hover:bg-[#24b57e] text-white"
        >
          Next
        </Button>
      )}
    </div>
  );
}
