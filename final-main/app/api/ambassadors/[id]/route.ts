import { NextRequest, NextResponse } from "next/server";
import { getAmbassadorApplicationModel } from "@/models/AmbassadorApplication";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const AmbassadorApplication = await getAmbassadorApplicationModel();
    const application = await AmbassadorApplication.findById(id).lean();

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    return NextResponse.json({ application });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to load application: " + (error?.message || "Server Error") },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, adminNotes } = body;

    const AmbassadorApplication = await getAmbassadorApplicationModel();
    const updateData: Record<string, any> = {};
    if (status) updateData.status = status;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;

    const application = await AmbassadorApplication.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    return NextResponse.json({ application, message: "Application updated successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to update: " + (error?.message || "Server Error") },
      { status: 500 }
    );
  }
}
