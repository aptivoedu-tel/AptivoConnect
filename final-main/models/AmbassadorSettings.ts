import mongoose, { Schema, Document, Model } from "mongoose";
import { getAmbassadorConnection } from "@/lib/ambassador-db";

export interface IAmbassadorSettings extends Document {
  key: string;
  applicationsClosed: boolean;
  updatedAt: Date;
}

export const AmbassadorSettingsSchema = new Schema<IAmbassadorSettings>(
  {
    key: { type: String, required: true, unique: true, default: "global" },
    applicationsClosed: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export async function getAmbassadorSettingsModel(): Promise<Model<IAmbassadorSettings>> {
  const conn = await getAmbassadorConnection();
  return (
    conn.models.AmbassadorSettings ||
    conn.model<IAmbassadorSettings>("AmbassadorSettings", AmbassadorSettingsSchema)
  );
}

export default getAmbassadorSettingsModel;
