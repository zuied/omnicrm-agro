import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession, ROLES } from "@/lib/auth";
import { query } from "@/lib/db";
import { auditLog } from "@/lib/audit";

function str(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

/** Daftar semua akun (admin-only). Data lengkap untuk form edit. */
export async function GET() {
  const user = await getSession();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ message: "Hanya admin." }, { status: 403 });
  }
  const rows = await query(
    "SELECT id, full_name, email, role, phone, region, is_active, created_at FROM users ORDER BY role, full_name"
  );
  return NextResponse.json({ users: rows });
}

/** Tambah akun baru (admin-only). */
export async function POST(req: Request) {
  const user = await getSession();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ message: "Hanya admin." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ message: "Badan request tidak valid." }, { status: 400 });

  const full_name = str(body.full_name);
  const email = str(body.email);
  const password = String(body.password ?? "");
  const role = ROLES.includes(body.role) ? body.role : null;

  if (!full_name) return NextResponse.json({ message: "Nama lengkap wajib diisi." }, { status: 400 });
  if (!email) return NextResponse.json({ message: "Email wajib diisi." }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ message: "Password minimal 6 karakter." }, { status: 400 });
  if (!role) return NextResponse.json({ message: "Role tidak valid." }, { status: 400 });

  const dup = await query<{ id: number }>("SELECT id FROM users WHERE email = ?", [email]);
  if (dup.length > 0) return NextResponse.json({ message: "Email sudah dipakai akun lain." }, { status: 409 });

  const password_hash = bcrypt.hashSync(password, 10);
  const is_active = body.is_active === false ? 0 : 1;

  await query(
    "INSERT INTO users (full_name, email, password_hash, role, phone, region, is_active) VALUES (?,?,?,?,?,?,?)",
    [full_name, email, password_hash, role, str(body.phone), str(body.region), is_active]
  );

  await auditLog({
    userId: user.id,
    action: "USER_CREATE",
    entityType: "users",
    entityId: String(email),
    detail: { name: full_name, email, role, is_active },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}