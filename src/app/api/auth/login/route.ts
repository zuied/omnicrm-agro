import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { signToken, SESSION_COOKIE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json({ message: "Email dan password wajib diisi." }, { status: 400 });
  }

  const rows = await query<{
    id: number;
    full_name: string;
    role: "admin" | "hos" | "manager" | "agent";
    email: string;
    phone: string | null;
    region: string | null;
    password_hash: string;
    is_active: number;
  }>("SELECT * FROM users WHERE email = ? LIMIT 1", [email.toLowerCase()]);

  const user = rows[0];
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return NextResponse.json({ message: "Email atau password salah." }, { status: 401 });
  }
  if (!user.is_active) {
    return NextResponse.json({ message: "Akun nonaktif. Hubungi administrator." }, { status: 403 });
  }

  const token = await signToken({
    id: user.id,
    full_name: user.full_name,
    role: user.role,
    email: user.email,
    phone: user.phone ?? undefined,
    region: user.region ?? undefined,
  });

  const res = NextResponse.json({ ok: true, user: { id: user.id, full_name: user.full_name, role: user.role, email: user.email } });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}