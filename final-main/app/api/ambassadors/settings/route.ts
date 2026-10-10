import { NextRequest, NextResponse } from "next/server";
import { getAmbassadorSettingsModel } from "@/models/AmbassadorSettings";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET() {
  try {
    const AmbassadorSettings = await getAmbassadorSettingsModel();
    const settings = await AmbassadorSettings.findOne({ key: "global" }).lean();
    return NextResponse.json({
      applicationsClosed: !!settings?.applicationsClosed,
    });
  } catch (error: any) {
    console.error("Error fetching ambassador settings:", error);
    return NextResponse.json({ applicationsClosed: false }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const applicationsClosed = Boolean(body.applicationsClosed);

    const AmbassadorSettings = await getAmbassadorSettingsModel();
    const updated = await AmbassadorSettings.findOneAndUpdate(
      { key: "global" },
      { applicationsClosed },
      { upsert: true, new: true }
    ).lean();

    return NextResponse.json({
      success: true,
      applicationsClosed: !!updated?.applicationsClosed,
    });
  } catch (error: any) {
    console.error("Error updating ambassador settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings: " + (error?.message || "Server Error") },
      { status: 500 }
    );
  }
}
