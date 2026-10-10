import mongoose, { Schema, Document, Model } from "mongoose";
import { getAmbassadorConnection } from "@/lib/ambassador-db";

export interface IAmbassadorApplication extends Document {
  name: string;
  email: string;
  whatsapp: string;
  city: string;
  university: string;
  degreeYear: string;
  instagram: string;
  linkedin: string;
  usedAptivo: boolean;
  whyAmbassador: string;
  promotionPlan: string;
  involvedInCommunities: boolean;
  communitiesDetails: string;
  weeklyAvailability: string;
  whySelectMe: string;
  status: "New" | "Reviewing" | "Shortlisted" | "Selected" | "Rejected";
  adminNotes: string;
  createdAt: Date;
  updatedAt: Date;
}

export const AmbassadorApplicationSchema = new Schema<IAmbassadorApplication>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    whatsapp: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    university: { type: String, required: true, trim: true },
    degreeYear: { type: String, required: true, trim: true },
    instagram: { type: String, default: "", trim: true },
    linkedin: { type: String, required: true, trim: true },
    usedAptivo: { type: Boolean, required: true },
    whyAmbassador: { type: String, required: true },
    promotionPlan: { type: String, required: true },
    involvedInCommunities: { type: Boolean, required: true },
    communitiesDetails: { type: String, default: "" },
    weeklyAvailability: {
      type: String,
      required: true,
      enum: ["Less than 1 hour", "1–3 hours", "3–6 hours", "6+ hours"],
    },
    whySelectMe: { type: String, required: true },
    status: {
      type: String,
      enum: ["New", "Reviewing", "Shortlisted", "Selected", "Rejected"],
      default: "New",
    },
    adminNotes: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

AmbassadorApplicationSchema.index({ email: 1 }, { unique: true });
AmbassadorApplicationSchema.index({
  name: "text",
  email: "text",
  university: "text",
  city: "text",
});

export async function getAmbassadorApplicationModel(): Promise<Model<IAmbassadorApplication>> {
  const conn = await getAmbassadorConnection();
  return (
    conn.models.AmbassadorApplication ||
    conn.model<IAmbassadorApplication>("AmbassadorApplication", AmbassadorApplicationSchema)
  );
}

export default getAmbassadorApplicationModel;
