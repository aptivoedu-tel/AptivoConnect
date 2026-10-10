import { NextRequest, NextResponse } from "next/server";
import { getAmbassadorApplicationModel } from "@/models/AmbassadorApplication";
import { getSessionFromCookies } from "@/lib/auth";

// GET - Export applications as CSV (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const university = searchParams.get("university") || "";
    const city = searchParams.get("city") || "";
    const usedAptivo = searchParams.get("usedAptivo");
    const weeklyAvailability = searchParams.get("weeklyAvailability") || "";

    // Build query (same as list)
    const query: Record<string, unknown> = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { university: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
      ];
    }

    if (status) query.status = status;
    if (university) query.university = { $regex: university, $options: "i" };
    if (city) query.city = { $regex: city, $options: "i" };
    if (usedAptivo === "true") query.usedAptivo = true;
    if (usedAptivo === "false") query.usedAptivo = false;
    if (weeklyAvailability) query.weeklyAvailability = weeklyAvailability;

    const AmbassadorApplication = await getAmbassadorApplicationModel();
    const applications = await AmbassadorApplication.find(query)
      .sort({ createdAt: -1 })
      .lean();

    // Build CSV
    const headers = [
      "Name",
      "Email",
      "WhatsApp",
      "University",
      "Degree & Year",
      "City",
      "Instagram",
      "LinkedIn",
      "Used Aptivo",
      "Why Ambassador",
      "Promotion Plan",
      "Communities",
      "Community Details",
      "Availability",
      "Why Select",
      "Status",
      "Admin Notes",
      "Created At",
    ];

    const escapeCSV = (value: unknown) => {
      if (value === null || value === undefined) return "";
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = applications.map((app: any) => [
      escapeCSV(app.name),
      escapeCSV(app.email),
      escapeCSV(app.whatsapp),
      escapeCSV(app.university),
      escapeCSV(app.degreeYear),
      escapeCSV(app.city),
      escapeCSV(app.instagram),
      escapeCSV(app.linkedin),
      app.usedAptivo ? "Yes" : "No",
      escapeCSV(app.whyAmbassador),
      escapeCSV(app.promotionPlan),
      app.involvedInCommunities ? "Yes" : "No",
      escapeCSV(app.communitiesDetails),
      escapeCSV(app.weeklyAvailability),
      escapeCSV(app.whySelectMe),
      escapeCSV(app.status),
      escapeCSV(app.adminNotes),
      app.createdAt ? new Date(app.createdAt).toISOString() : "",
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join(
      "\n"
    );

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="ambassador-applications-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting applications:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
