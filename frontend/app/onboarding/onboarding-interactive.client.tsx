"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CompanyDetailsForm, type CompanyDetails } from "@/components/company-details-form";
import { completeOnboarding } from "@/lib/actions/onboarding";

export function OnboardingInteractive() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleCompanyDetailsSubmit = async (details: CompanyDetails) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await completeOnboarding({
        companyDetails: details,
      });
    } catch (error) {
      if ((error as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) {
        throw error;
      }
      const msg = error instanceof TypeError && error.message === "Failed to fetch" ? "Could not connect to server" : error instanceof Error ? error.message : "Could not save. Try again.";
      toast.error(msg);
      setSubmitError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-2xl space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Company Details</h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Tell us about your company to set up your workspace.
            </p>
          </div>

          {submitError && (
            <div className="rounded-sm border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {submitError}
            </div>
          )}

          <CompanyDetailsForm
            onSubmit={handleCompanyDetailsSubmit}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
}
