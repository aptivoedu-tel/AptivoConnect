import { NextRequest, NextResponse } from "next/server";
import { validateCredentials, createSession, getSessionCookieConfig } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const isValid = await validateCredentials(email, password);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 }
      );
    }

    const token = await createSession(email);
    const cookieConfig = getSessionCookieConfig(token);

    const response = NextResponse.json(
      { message: "Login successful." },
      { status: 200 }
    );

    response.cookies.set(cookieConfig);

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
