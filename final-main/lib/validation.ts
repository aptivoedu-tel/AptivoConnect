export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^https?:\/\/.+\..+/;
const PHONE_REGEX = /^[\d\s+\-()]{7,20}$/;

const WEEKLY_AVAILABILITY_OPTIONS = [
  "Less than 1 hour",
  "1–3 hours",
  "3–6 hours",
  "6+ hours",
];

const STATUS_OPTIONS = [
  "New",
  "Reviewing",
  "Shortlisted",
  "Selected",
  "Rejected",
];

export function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export function validateUrl(url: string): boolean {
  return URL_REGEX.test(url.trim());
}

export function validatePhone(phone: string): boolean {
  return PHONE_REGEX.test(phone.trim());
}

export function validateStatus(status: string): boolean {
  return STATUS_OPTIONS.includes(status);
}

export function validateWeeklyAvailability(value: string): boolean {
  return WEEKLY_AVAILABILITY_OPTIONS.includes(value);
}

export interface ApplicationInput {
  name: string;
  email: string;
  whatsapp: string;
  city: string;
  university: string;
  degreeYear: string;
  instagram?: string;
  linkedin: string;
  usedAptivo: boolean;
  whyAmbassador: string;
  promotionPlan: string;
  involvedInCommunities: boolean;
  communitiesDetails?: string;
  weeklyAvailability: string;
  whySelectMe: string;
}

export function validateApplication(data: ApplicationInput): ValidationResult {
  const errors: ValidationError[] = [];

  // Section 1 - Personal Information
  if (!data.name || data.name.trim().length < 2) {
    errors.push({ field: "name", message: "Full name is required (minimum 2 characters)." });
  }

  if (!data.email || !validateEmail(data.email)) {
    errors.push({ field: "email", message: "A valid email address is required." });
  }

  if (!data.whatsapp || !validatePhone(data.whatsapp)) {
    errors.push({ field: "whatsapp", message: "A valid WhatsApp number is required." });
  }

  if (!data.city || data.city.trim().length < 2) {
    errors.push({ field: "city", message: "City is required." });
  }

  // Section 2 - Education
  if (!data.university || data.university.trim().length < 2) {
    errors.push({ field: "university", message: "University / College is required." });
  }

  if (!data.degreeYear || data.degreeYear.trim().length < 2) {
    errors.push({ field: "degreeYear", message: "Degree & Year is required." });
  }

  // Section 3 - Online Presence
  if (data.instagram && data.instagram.trim().length > 0 && !validateUrl(data.instagram)) {
    errors.push({ field: "instagram", message: "Please enter a valid Instagram URL." });
  }

  if (!data.linkedin || !validateUrl(data.linkedin)) {
    errors.push({ field: "linkedin", message: "A valid LinkedIn profile URL is required." });
  }

  // Section 4 - Aptivo
  if (typeof data.usedAptivo !== "boolean") {
    errors.push({ field: "usedAptivo", message: "Please indicate if you have used Aptivo before." });
  }

  if (!data.whyAmbassador || data.whyAmbassador.trim().length < 30) {
    errors.push({
      field: "whyAmbassador",
      message: "Please explain why you want to become an ambassador (minimum 30 characters).",
    });
  }

  if (!data.promotionPlan || data.promotionPlan.trim().length < 30) {
    errors.push({
      field: "promotionPlan",
      message: "Please describe your promotion plan (minimum 30 characters).",
    });
  }

  // Section 5 - Experience & Availability
  if (typeof data.involvedInCommunities !== "boolean") {
    errors.push({
      field: "involvedInCommunities",
      message: "Please indicate if you are involved in communities.",
    });
  }

  if (!data.weeklyAvailability || !validateWeeklyAvailability(data.weeklyAvailability)) {
    errors.push({
      field: "weeklyAvailability",
      message: "Please select your weekly availability.",
    });
  }

  if (!data.whySelectMe || data.whySelectMe.trim().length < 30) {
    errors.push({
      field: "whySelectMe",
      message: "Please explain why we should select you (minimum 30 characters).",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function sanitizeString(str: string): string {
  return str
    .trim()
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function sanitizeApplication(data: ApplicationInput): ApplicationInput {
  return {
    name: sanitizeString(data.name || ""),
    email: (data.email || "").trim().toLowerCase(),
    whatsapp: sanitizeString(data.whatsapp || ""),
    city: sanitizeString(data.city || ""),
    university: sanitizeString(data.university || ""),
    degreeYear: sanitizeString(data.degreeYear || ""),
    instagram: data.instagram ? sanitizeString(data.instagram) : "",
    linkedin: sanitizeString(data.linkedin || ""),
    usedAptivo: Boolean(data.usedAptivo),
    whyAmbassador: sanitizeString(data.whyAmbassador || ""),
    promotionPlan: sanitizeString(data.promotionPlan || ""),
    involvedInCommunities: Boolean(data.involvedInCommunities),
    communitiesDetails: data.communitiesDetails
      ? sanitizeString(data.communitiesDetails)
      : "",
    weeklyAvailability: sanitizeString(data.weeklyAvailability || ""),
    whySelectMe: sanitizeString(data.whySelectMe || ""),
  };
}

export { WEEKLY_AVAILABILITY_OPTIONS, STATUS_OPTIONS };
