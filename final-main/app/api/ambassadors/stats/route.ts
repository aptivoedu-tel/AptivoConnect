import { NextRequest, NextResponse } from "next/server";
import { getAmbassadorApplicationModel } from "@/models/AmbassadorApplication";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const AmbassadorApplication = await getAmbassadorApplicationModel();

    const [total, newCount, reviewing, shortlisted, selected, rejected] =
      await Promise.all([
        AmbassadorApplication.countDocuments(),
        AmbassadorApplication.countDocuments({ status: "New" }),
        AmbassadorApplication.countDocuments({ status: "Reviewing" }),
        AmbassadorApplication.countDocuments({ status: "Shortlisted" }),
        AmbassadorApplication.countDocuments({ status: "Selected" }),
        AmbassadorApplication.countDocuments({ status: "Rejected" }),
      ]);

    return NextResponse.json({
      stats: {
        total,
        New: newCount,
        Reviewing: reviewing,
        Shortlisted: shortlisted,
        Selected: selected,
        Rejected: rejected,
      },
    });
  } catch (error: any) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats: " + (error?.message || "Server Error") },
      { status: 500 }
    );
  }
}
