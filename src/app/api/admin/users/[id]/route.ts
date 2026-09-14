import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession, ROLES } from "@/lib/auth";
import { query } from "@/lib/db";
import { auditLog } from "@/lib/audit";

function str(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

/** Update akun (nama, email, role, telepon, region, status aktif, password opsional). Admin-only. */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ message: "Hanya admin." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const uid = Number(id);
  if (!Number.isInteger(uid) || uid <= 0) return NextResponse.json({ message: "ID tidak valid." }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ message: "Badan request tidak valid." }, { status: 400 });

  const existing = await query<{ id: number; role: string; is_active: number }>(
    "SELECT id, role, is_active FROM users WHERE id = ?",
    [uid]
  );
  if (existing.length === 0) return NextResponse.json({ message: "User tidak ditemukan." }, { status: 404 });
  const target = existing[0];

  // Proteksi admin agar tidak terkunci sendirinya.
  if (user.id === uid) {
    if (body.role !== undefined && body.role !== "admin") {
      return NextResponse.json({ message: "Tidak bisa mengubah role akun sendiri." }, { status: 400 });
    }
    if (body.is_active !== undefined && body.is_active !== true) {
      return NextResponse.json({ message: "Tidak bisa menonaktifkan akun sendiri." }, { status: 400 });
    }
  }

  const full_name = str(body.full_name);
  const email = str(body.email);
  const role = body.role !== undefined ? (ROLES.includes(body.role) ? body.role : null) : target.role;
  const password = body.password !== undefined ? String(body.password) : "";

  if (!full_name) return NextResponse.json({ message: "Nama lengkap wajib diisi." }, { status: 400 });
  if (!email) return NextResponse.json({ message: "Email wajib diisi." }, { status: 400 });
  if (!role) return NextResponse.json({ message: "Role tidak valid." }, { status: 400 });
  if (password && password.length < 6) return NextResponse.json({ message: "Password baru minimal 6 karakter." }, { status: 400 });

  const dup = await query<{ id: number }>("SELECT id FROM users WHERE email = ? AND id <> ?", [email, uid]);
  if (dup.length > 0) return NextResponse.json({ message: "Email sudah dipakai akun lain." }, { status: 409 });

  const is_active = body.is_active !== undefined ? (body.is_active === false || body.is_active === 0 ? 0 : 1) : target.is_active;

  if (password) {
    const password_hash = bcrypt.hashSync(password, 10);
    await query(
      "UPDATE users SET full_name = ?, email = ?, password_hash = ?, role = ?, phone = ?, region = ?, is_active = ? WHERE id = ?",
      [full_name, email, password_hash, role, str(body.phone), str(body.region), is_active, uid]
    );
  } else {
    await query(
      "UPDATE users SET full_name = ?, email = ?, role = ?, phone = ?, region = ?, is_active = ? WHERE id = ?",
      [full_name, email, role, str(body.phone), str(body.region), is_active, uid]
    );
  }

  await auditLog({
    userId: user.id,
    action: "USER_UPDATE",
    entityType: "users",
    entityId: String(uid),
    detail: { name: full_name, email, role, is_active, passwordSet: Boolean(password) },
  });

  return NextResponse.json({ ok: true });
}