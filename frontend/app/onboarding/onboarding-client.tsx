"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PricingCards } from "@/components/pricing-cards";
import { CompanyDetailsForm, type CompanyDetails } from "@/components/company-details-form";
import { completeOnboarding } from "@/lib/actions/onboarding";
import { Check, CreditCard, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  { id: 1, label: "Choose Plan", icon: CreditCard },
  { id: 2, label: "Company Details", icon: Building2 },
];

export function OnboardingClient() {
  const router = useRouter();
  const { update } = useSession();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<string>("pro");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSelectPlan = (plan: string) => {
    setSelectedPlan(plan);
  };

  const handleProceedToDetails = () => {
    setCurrentStep(2);
  };

  const handleCompanyDetailsSubmit = async (details: CompanyDetails) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await completeOnboarding({
        plan: selectedPlan,
        companyDetails: details,
      });
      await update();
      router.push("/dashboard");
    } catch (error) {
      console.error("[ONBOARDING] client error:", error);
      setSubmitError(error instanceof Error ? error.message : "Failed to save. Try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <div className="flex items-center justify-center gap-2 sm:gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              return (
                <div key={step.id} className="flex items-center gap-2 sm:gap-4">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "flex size-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                      isCompleted && "border-primary bg-primary text-primary-foreground",
                      isActive && "border-primary bg-primary/10 text-primary",
                      !isActive && !isCompleted && "border-muted-foreground/30 text-muted-foreground"
                    )}>
                      {isCompleted ? <Check className="size-4" /> : step.id}
                    </div>
                    <span className={cn(
                      "text-sm font-medium hidden sm:block",
                      isActive ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={cn(
                      "w-8 sm:w-16 h-0.5",
                      currentStep > step.id ? "bg-primary" : "bg-muted"
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        {currentStep === 1 && (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Choose Your Plan</h1>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Select the plan that best fits your team. You can always upgrade or downgrade later.
              </p>
            </div>

            <PricingCards selectedPlan={selectedPlan} onSelectPlan={handleSelectPlan} />

            <div className="flex justify-center pt-4">
              <button
                onClick={handleProceedToDetails}
                disabled={!selectedPlan}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                )}
              >
                Continue with {selectedPlan ? steps.find(s => s.id === 1)?.label : "selected plan"}
                <Check className="size-4" />
              </button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Company Details</h1>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Tell us about your company to set up your workspace.
              </p>
            </div>

            {submitError && (
              <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                {submitError}
              </div>
            )}

            <CompanyDetailsForm
              onSubmit={handleCompanyDetailsSubmit}
              onBack={() => setCurrentStep(1)}
              isSubmitting={isSubmitting}
            />
          </div>
        )}
      </div>
    </div>
  );
}
