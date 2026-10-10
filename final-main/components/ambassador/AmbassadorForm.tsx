"use client";

import React, { useState, useCallback } from "react";
import FormField from "./FormField";
import FormSection from "./FormSection";
import SuccessState from "./SuccessState";
import {
  validateEmail,
  validatePhone,
  validateUrl,
  WEEKLY_AVAILABILITY_OPTIONS,
} from "@/lib/validation";

interface FormData {
  name: string;
  email: string;
  whatsapp: string;
  city: string;
  university: string;
  degreeYear: string;
  instagram: string;
  linkedin: string;
  usedAptivo: string;
  whyAmbassador: string;
  promotionPlan: string;
  involvedInCommunities: string;
  communitiesDetails: string;
  weeklyAvailability: string;
  whySelectMe: string;
}

const initialFormData: FormData = {
  name: "",
  email: "",
  whatsapp: "",
  city: "",
  university: "",
  degreeYear: "",
  instagram: "",
  linkedin: "",
  usedAptivo: "",
  whyAmbassador: "",
  promotionPlan: "",
  involvedInCommunities: "",
  communitiesDetails: "",
  weeklyAvailability: "",
  whySelectMe: "",
};

const STEPS = [
  { label: "Personal", icon: "👤" },
  { label: "Education", icon: "🎓" },
  { label: "Social", icon: "🔗" },
  { label: "Aptivo", icon: "💡" },
  { label: "Experience", icon: "⭐" },
];

export default function AmbassadorForm() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const updateField = useCallback((field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setSubmitError("");
  }, []);

  const validateStep = useCallback(
    (step: number): boolean => {
      const newErrors: Record<string, string> = {};

      switch (step) {
        case 0: // Personal
          if (!formData.name || formData.name.trim().length < 2)
            newErrors.name = "Full name is required (minimum 2 characters).";
          if (!formData.email || !validateEmail(formData.email))
            newErrors.email = "A valid email address is required.";
          if (!formData.whatsapp || !validatePhone(formData.whatsapp))
            newErrors.whatsapp = "A valid WhatsApp number is required.";
          if (!formData.city || formData.city.trim().length < 2)
            newErrors.city = "City is required.";
          break;

        case 1: // Education
          if (!formData.university || formData.university.trim().length < 2)
            newErrors.university = "University / College is required.";
          if (!formData.degreeYear || formData.degreeYear.trim().length < 2)
            newErrors.degreeYear = "Degree & Year is required.";
          break;

        case 2: // Social
          if (
            formData.instagram &&
            formData.instagram.trim().length > 0 &&
            !validateUrl(formData.instagram)
          )
            newErrors.instagram = "Please enter a valid Instagram URL.";
          if (!formData.linkedin || !validateUrl(formData.linkedin))
            newErrors.linkedin = "A valid LinkedIn profile URL is required.";
          break;

        case 3: // Aptivo
          if (!formData.usedAptivo)
            newErrors.usedAptivo =
              "Please indicate if you have used Aptivo before.";
          if (
            !formData.whyAmbassador ||
            formData.whyAmbassador.trim().length < 30
          )
            newErrors.whyAmbassador =
              "Please explain why you want to become an ambassador (minimum 30 characters).";
          if (
            !formData.promotionPlan ||
            formData.promotionPlan.trim().length < 30
          )
            newErrors.promotionPlan =
              "Please describe your promotion plan (minimum 30 characters).";
          break;

        case 4: // Experience
          if (!formData.involvedInCommunities)
            newErrors.involvedInCommunities =
              "Please indicate if you are involved in communities.";
          if (!formData.weeklyAvailability)
            newErrors.weeklyAvailability =
              "Please select your weekly availability.";
          if (
            !formData.whySelectMe ||
            formData.whySelectMe.trim().length < 30
          )
            newErrors.whySelectMe =
              "Please explain why we should select you (minimum 30 characters).";
          break;
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [formData]
  );

  const handleNext = useCallback(() => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentStep, validateStep]);

  const handlePrev = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const payload = {
        ...formData,
        usedAptivo: formData.usedAptivo === "yes",
        involvedInCommunities: formData.involvedInCommunities === "yes",
      };

      const res = await fetch("/api/ambassadors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors && Array.isArray(data.errors)) {
          const fieldErrors: Record<string, string> = {};
          data.errors.forEach(
            (err: { field: string; message: string }) => {
              fieldErrors[err.field] = err.message;
            }
          );
          setErrors(fieldErrors);
          // Navigate to the first step with an error
          const errorFields = Object.keys(fieldErrors);
          const stepFieldMap: Record<number, string[]> = {
            0: ["name", "email", "whatsapp", "city"],
            1: ["university", "degreeYear"],
            2: ["instagram", "linkedin"],
            3: ["usedAptivo", "whyAmbassador", "promotionPlan"],
            4: [
              "involvedInCommunities",
              "weeklyAvailability",
              "whySelectMe",
            ],
          };

          for (let step = 0; step < STEPS.length; step++) {
            if (
              errorFields.some((f) => stepFieldMap[step]?.includes(f))
            ) {
              setCurrentStep(step);
              break;
            }
          }
        } else {
          setSubmitError(
            data.error || "Something went wrong. Please try again."
          );
        }
        return;
      }

      setIsSubmitted(true);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [currentStep, formData, validateStep]);

  if (isSubmitted) {
    return <SuccessState />;
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <FormSection
            stepNumber={1}
            title="Personal Information"
            description="Tell us about yourself."
          >
            <FormField
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={(v) => updateField("name", v)}
              placeholder="e.g. Ahmed Ali Khan"
              required
              error={errors.name}
            />
            <FormField
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={(v) => updateField("email", v)}
              placeholder="e.g. ahmed@example.com"
              required
              error={errors.email}
            />
            <FormField
              label="WhatsApp Number"
              name="whatsapp"
              type="tel"
              value={formData.whatsapp}
              onChange={(v) => updateField("whatsapp", v)}
              placeholder="e.g. +92 300 1234567"
              required
              error={errors.whatsapp}
            />
            <FormField
              label="City"
              name="city"
              value={formData.city}
              onChange={(v) => updateField("city", v)}
              placeholder="e.g. Lahore"
              required
              error={errors.city}
            />
          </FormSection>
        );

      case 1:
        return (
          <FormSection
            stepNumber={2}
            title="Education"
            description="Tell us about your academic background."
          >
            <FormField
              label="University / College"
              name="university"
              value={formData.university}
              onChange={(v) => updateField("university", v)}
              placeholder="e.g. LUMS, NUST, IBA Karachi"
              required
              error={errors.university}
            />
            <FormField
              label="Degree & Year"
              name="degreeYear"
              value={formData.degreeYear}
              onChange={(v) => updateField("degreeYear", v)}
              placeholder="e.g. BS Computer Science — 2nd Year"
              required
              error={errors.degreeYear}
              helpText="Include your degree program and current year."
            />
          </FormSection>
        );

      case 2:
        return (
          <FormSection
            stepNumber={3}
            title="Online Presence"
            description="Share your social profiles so we can learn more about you."
          >
            <FormField
              label="Instagram Profile Link"
              name="instagram"
              type="url"
              value={formData.instagram}
              onChange={(v) => updateField("instagram", v)}
              placeholder="e.g. https://instagram.com/yourusername"
              error={errors.instagram}
              helpText="Optional — but helps us understand your reach."
            />
            <FormField
              label="LinkedIn Profile Link"
              name="linkedin"
              type="url"
              value={formData.linkedin}
              onChange={(v) => updateField("linkedin", v)}
              placeholder="e.g. https://linkedin.com/in/yourusername"
              required
              error={errors.linkedin}
            />
          </FormSection>
        );

      case 3:
        return (
          <FormSection
            stepNumber={4}
            title="Aptivo"
            description="Tell us about your experience and motivation."
          >
            <FormField
              label="Have you used Aptivo before?"
              name="usedAptivo"
              type="radio"
              value={formData.usedAptivo}
              onChange={(v) => updateField("usedAptivo", v)}
              required
              error={errors.usedAptivo}
              options={[
                { label: "Yes", value: "yes" },
                { label: "No", value: "no" },
              ]}
            />
            <FormField
              label="Why do you want to become an Aptivo Ambassador?"
              name="whyAmbassador"
              type="textarea"
              value={formData.whyAmbassador}
              onChange={(v) => updateField("whyAmbassador", v)}
              placeholder="Tell us what excites you about this opportunity..."
              required
              error={errors.whyAmbassador}
              showCharCount
              minLength={30}
              maxLength={1000}
            />
            <FormField
              label="How would you promote Aptivo among students?"
              name="promotionPlan"
              type="textarea"
              value={formData.promotionPlan}
              onChange={(v) => updateField("promotionPlan", v)}
              placeholder="Share your ideas and strategies..."
              required
              error={errors.promotionPlan}
              showCharCount
              minLength={30}
              maxLength={1000}
            />
          </FormSection>
        );

      case 4:
        return (
          <FormSection
            stepNumber={5}
            title="Experience & Availability"
            description="Help us understand your involvement and time commitment."
          >
            <FormField
              label="Are you involved in any societies, clubs, or student communities?"
              name="involvedInCommunities"
              type="radio"
              value={formData.involvedInCommunities}
              onChange={(v) => updateField("involvedInCommunities", v)}
              required
              error={errors.involvedInCommunities}
              options={[
                { label: "Yes", value: "yes" },
                { label: "No", value: "no" },
              ]}
            />

            {formData.involvedInCommunities === "yes" && (
              <div className="animate-fade-in">
                <FormField
                  label="Tell us about your involvement"
                  name="communitiesDetails"
                  type="textarea"
                  value={formData.communitiesDetails}
                  onChange={(v) => updateField("communitiesDetails", v)}
                  placeholder="Describe the societies, clubs, communities, or leadership roles you're involved in..."
                  rows={3}
                  showCharCount
                  maxLength={500}
                />
              </div>
            )}

            <FormField
              label="How much time can you dedicate per week?"
              name="weeklyAvailability"
              type="select"
              value={formData.weeklyAvailability}
              onChange={(v) => updateField("weeklyAvailability", v)}
              required
              error={errors.weeklyAvailability}
              placeholder="Select your availability"
              options={WEEKLY_AVAILABILITY_OPTIONS.map((opt) => ({
                label: opt,
                value: opt,
              }))}
            />

            <FormField
              label="Why should we select you as an Aptivo Ambassador?"
              name="whySelectMe"
              type="textarea"
              value={formData.whySelectMe}
              onChange={(v) => updateField("whySelectMe", v)}
              placeholder="What makes you the right person for this role?"
              required
              error={errors.whySelectMe}
              showCharCount
              minLength={30}
              maxLength={1000}
            />
          </FormSection>
        );
    }
  };

  return (
    <div>
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, i) => (
            <div key={step.label} className="flex items-center flex-1">
              <button
                onClick={() => {
                  // Only allow going back to previous or completed steps
                  if (i <= currentStep) setCurrentStep(i);
                }}
                className={`
                  flex flex-col items-center gap-1.5 group
                  ${i <= currentStep ? "cursor-pointer" : "cursor-default"}
                `}
                type="button"
                disabled={i > currentStep}
              >
                <div
                  className={`
                    w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium
                    transition-all duration-300
                    ${
                      i < currentStep
                        ? "bg-[#042f2e] text-white"
                        : i === currentStep
                          ? "bg-teal-50 text-teal-800 ring-2 ring-teal-600 font-bold shadow-xs"
                          : "bg-gray-100 text-gray-400"
                    }
                  `}
                >
                  {i < currentStep ? (
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <span>{String(i + 1).padStart(2, "0")}</span>
                  )}
                </div>
                <span
                  className={`
                    text-xs font-medium hidden sm:block
                    ${
                      i <= currentStep ? "text-teal-700 font-bold" : "text-gray-400"
                    }
                  `}
                >
                  {step.label}
                </span>
              </button>

              {i < STEPS.length - 1 && (
                <div className="flex-1 mx-2 mt-[-18px] sm:mt-[-6px]">
                  <div
                    className={`
                      h-0.5 rounded-full transition-all duration-500
                      ${i < currentStep ? "bg-teal-500" : "bg-gray-200"}
                    `}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="space-y-4">{renderStep()}</div>

      {/* Submit Error */}
      {submitError && (
        <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm animate-fade-in">
          {submitError}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentStep === 0}
          className={`
            inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium
            transition-all duration-200
            ${
              currentStep === 0
                ? "text-gray-300 cursor-not-allowed"
                : "text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl px-4 py-2 font-bold"
            }
          `}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Previous
        </button>

        {currentStep < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#042f2e] text-white rounded-lg text-sm font-medium hover:bg-aptivo-700 transition-colors shadow-sm"
          >
            Next
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`
              inline-flex items-center gap-2 px-7 py-2.5 rounded-lg text-sm font-medium
              transition-all duration-200 shadow-sm
              ${
                isSubmitting
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                  : "bg-[#042f2e] text-white hover:bg-teal-900 shadow-md shadow-[#042f2e]/20 cursor-pointer"
              }
            `}
          >
            {isSubmitting ? (
              <>
                <svg
                  className="animate-spin w-4 h-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Submitting Application...
              </>
            ) : (
              <>
                Submit Application
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
