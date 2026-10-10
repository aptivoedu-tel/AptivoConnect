import { NextRequest, NextResponse } from "next/server";
import { getAmbassadorApplicationModel } from "@/models/AmbassadorApplication";
import { getAmbassadorSettingsModel } from "@/models/AmbassadorSettings";
import {
  validateApplication,
  sanitizeApplication,
  ApplicationInput,
} from "@/lib/validation";
import { getSessionFromCookies } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const AmbassadorSettings = await getAmbassadorSettingsModel();
    const settings = await AmbassadorSettings.findOne({ key: "global" }).lean();
    if (settings?.applicationsClosed) {
      return NextResponse.json(
        { error: "Ambassador applications are currently closed." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const sanitized = sanitizeApplication(body as ApplicationInput);
    const validation = validateApplication(sanitized);

    if (!validation.valid) {
      return NextResponse.json(
        { error: "Validation failed.", errors: validation.errors },
        { status: 400 }
      );
    }

    const AmbassadorApplication = await getAmbassadorApplicationModel();

    // Check for duplicate
    const existing = await AmbassadorApplication.findOne({ email: sanitized.email });
    if (existing) {
      return NextResponse.json(
        { error: "You have already submitted an application with this email." },
        { status: 409 }
      );
    }

    // Create application in Ambassador Atlas Cluster
    const application = await AmbassadorApplication.create({
      ...sanitized,
      status: "New",
      adminNotes: "",
    });

    return NextResponse.json(
      {
        message: "Application submitted successfully!",
        id: application._id,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating application:", error);
    if (error?.code === 11000) {
      return NextResponse.json(
        { error: "You have already submitted an application." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to submit application: " + (error?.message || "Server Error") },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const AmbassadorApplication = await getAmbassadorApplicationModel();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const university = searchParams.get("university") || "";
    const city = searchParams.get("city") || "";

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

    const skip = (page - 1) * limit;

    const [applications, total] = await Promise.all([
      AmbassadorApplication.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AmbassadorApplication.countDocuments(query),
    ]);

    return NextResponse.json({
      applications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching applications:", error);
    return NextResponse.json(
      { error: "Failed to load applications: " + (error?.message || "Server Error") },
      { status: 500 }
    );
  }
}
