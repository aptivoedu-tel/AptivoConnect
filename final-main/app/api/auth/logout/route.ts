import { NextResponse } from "next/server";
import { getLogoutCookieConfig } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json(
    { message: "Logged out successfully." },
    { status: 200 }
  );

  const logoutConfig = getLogoutCookieConfig();
  response.cookies.set(logoutConfig);

  return response;
}
