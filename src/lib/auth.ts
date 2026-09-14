import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "omnicrm_token";

export const ROLES = ["admin", "hos", "manager", "agent"] as const;
export type Role = (typeof ROLES)[number];

export interface SessionUser {
  id: number;
  full_name: string;
  role: Role;
  email: string;
  phone?: string;
  region?: string;
}

const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? "omnicrm-agro-dev-secret-2026");

export async function signToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    sub: String(user.id),
    name: user.full_name,
    role: user.role,
    email: user.email,
    phone: user.phone ?? null,
    region: user.region ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret);
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      id: Number(payload.sub),
      full_name: String(payload.name ?? ""),
      role: (payload.role as Role) ?? "agent",
      email: String(payload.email ?? ""),
      phone: payload.phone ? String(payload.phone) : undefined,
      region: payload.region ? String(payload.region) : undefined,
    };
  } catch {
    return null;
  }
}

/** Server-side helper untuk membaca session dari httpOnly cookie. */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await getSession();
  if (!user) throw new AuthError("Unauthorized", 401);
  if (roles.length > 0 && !roles.includes(user.role)) throw new AuthError("Forbidden", 403);
  return user;
}

export async function getUserFromRequest(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}