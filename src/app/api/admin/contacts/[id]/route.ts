import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query, withTransaction } from "@/lib/db";
import { auditLog } from "@/lib/audit";

function str(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

function numOrNull(v: unknown): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function requireAdmin(user: Awaited<ReturnType<typeof getSession>>) {
  if (!user || user.role !== "admin") return false;
  return true;
}

/** Update kontak B2B/B2C (admin-only). */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!(await requireAdmin(user))) {
    return NextResponse.json({ message: "Hanya admin." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const cid = Number(id);
  if (!Number.isInteger(cid) || cid <= 0) return NextResponse.json({ message: "ID tidak valid." }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ message: "Badan request tidak valid." }, { status: 400 });

  const type = body.type === "B2C" ? "B2C" : "B2B";

  try {
    if (type === "B2B") {
      const contact = await query<{ id: number; account_id: number }>(
        "SELECT id, account_id FROM contacts WHERE id = ?",
        [cid]
      );
      if (contact.length === 0) return NextResponse.json({ message: "Kontak tidak ditemukan." }, { status: 404 });

      const companyName = str(body.company_name);
      const firstName = str(body.first_name);
      if (!companyName) return NextResponse.json({ message: "Nama perusahaan wajib diisi." }, { status: 400 });
      if (!firstName) return NextResponse.json({ message: "Nama kontak wajib diisi." }, { status: 400 });

      const accountId = contact[0].account_id;
      await withTransaction(async (conn) => {
        await conn.execute(
          "UPDATE accounts SET company_name = ?, legal_type = ?, region = ?, phone = ?, email = ? WHERE id = ?",
          [companyName, str(body.legal_type), str(body.region), str(body.phone), str(body.email), accountId]
        );
        await conn.execute(
          "UPDATE contacts SET first_name = ?, job_title = ?, whatsapp_number = ?, email = ? WHERE id = ?",
          [firstName, str(body.job_title), str(body.whatsapp_number), str(body.contact_email) ?? str(body.email), cid]
        );
      });

      await auditLog({
        userId: user!.id,
        action: "CONTACT_UPDATE",
        entityType: "contacts",
        entityId: String(cid),
        detail: { type: "B2B", company: companyName, contact: firstName, accountId },
      });
      return NextResponse.json({ ok: true, type: "B2B" });
    }

    // B2C
    const existing = await query<{ id: number }>("SELECT id FROM b2c_profiles WHERE id = ?", [cid]);
    if (existing.length === 0) return NextResponse.json({ message: "Kontak tidak ditemukan." }, { status: 404 });

    const fullName = str(body.full_name);
    if (!fullName) return NextResponse.json({ message: "Nama lengkap petani wajib diisi." }, { status: 400 });

    await withTransaction(async (conn) => {
      await conn.execute(
        "UPDATE b2c_profiles SET full_name = ?, whatsapp_number = ?, email = ?, land_size_ha = ?, current_crop = ?, region = ?, village = ? WHERE id = ?",
        [fullName, str(body.whatsapp_number), str(body.email), numOrNull(body.land_size_ha), str(body.current_crop), str(body.region), str(body.village), cid]
      );
    });

    await auditLog({
      userId: user!.id,
      action: "CONTACT_UPDATE",
      entityType: "b2c_profiles",
      entityId: String(cid),
      detail: { type: "B2C", name: fullName, region: str(body.region) },
    });
    return NextResponse.json({ ok: true, type: "B2C" });
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 400 });
  }
}

/** Hapus kontak (admin-only). Deal terkait tetap aman via FK ON DELETE SET NULL. */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!(await requireAdmin(user))) {
    return NextResponse.json({ message: "Hanya admin." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const cid = Number(id);
  if (!Number.isInteger(cid) || cid <= 0) return NextResponse.json({ message: "ID tidak valid." }, { status: 400 });

  const url = new URL(req.url);
  const type = url.searchParams.get("type") === "B2C" ? "B2C" : "B2B";

  try {
    if (type === "B2B") {
      const contact = await query<{ account_id: number }>(
        "SELECT account_id FROM contacts WHERE id = ?",
        [cid]
      );
      if (contact.length === 0) return NextResponse.json({ message: "Kontak tidak ditemukan." }, { status: 404 });
      await withTransaction(async (conn) => {
        await conn.execute("DELETE FROM accounts WHERE id = ?", [contact[0].account_id]);
      });
      await auditLog({
        userId: user!.id,
        action: "CONTACT_DELETE",
        entityType: "accounts",
        entityId: String(contact[0].account_id),
        detail: { type: "B2B", contactId: cid },
      });
      return NextResponse.json({ ok: true, type: "B2B" });
    }

    const existing = await query<{ id: number }>("SELECT id FROM b2c_profiles WHERE id = ?", [cid]);
    if (existing.length === 0) return NextResponse.json({ message: "Kontak tidak ditemukan." }, { status: 404 });
    await withTransaction(async (conn) => {
      await conn.execute("DELETE FROM b2c_profiles WHERE id = ?", [cid]);
    });
    await auditLog({
      userId: user!.id,
      action: "CONTACT_DELETE",
      entityType: "b2c_profiles",
      entityId: String(cid),
      detail: { type: "B2C" },
    });
    return NextResponse.json({ ok: true, type: "B2C" });
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 400 });
  }
}