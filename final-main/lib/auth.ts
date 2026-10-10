import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import connectToDatabase from "@/lib/mongodb/connection";
import { Admin } from "@/models/Admin";

const COOKIE_NAME = "aptivo-admin-session";
const COOKIE_MAX_AGE = 60 * 60 * 24;

function getSecretKey() {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return new TextEncoder().encode(secret);
}

export async function createSession(email: string): Promise<string> {
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!normalizedEmail) throw new Error("Admin email is required");
  return new SignJWT({ email: normalizedEmail, role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getSecretKey());
}

export async function verifySession(token: string): Promise<{ email: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ["HS256"] });
    if (payload.role !== "admin" || typeof payload.email !== "string") return null;
    const email = payload.email.trim().toLowerCase();
    if (!email) return null;
    await connectToDatabase();
    const admin = await Admin.findOne({ email });
    return admin?.passwordHash ? { email, role: "admin" } : null;
  } catch {
    return null;
  }
}

export async function validateCredentials(email: string, password: string): Promise<boolean> {
  if (typeof email !== "string" || typeof password !== "string" || !password) return false;
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return false;
  try {
    await connectToDatabase();
    const admin = await Admin.findOne({ email: normalizedEmail });
    return !!admin?.passwordHash && bcrypt.compare(password, admin.passwordHash);
  } catch {
    return false;
  }
}

export async function getSessionFromCookies(): Promise<{ email: string; role: string } | null> {
  const sessionCookie = (await cookies()).get(COOKIE_NAME);
  return sessionCookie?.value ? verifySession(sessionCookie.value) : null;
}

export function getSessionCookieConfig(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  };
}

export function getLogoutCookieConfig() {
  return {
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 0,
    path: "/",
  };
}

export { COOKIE_NAME };
