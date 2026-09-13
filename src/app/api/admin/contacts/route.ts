import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { withTransaction } from "@/lib/db";
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

/** Tambah kontak B2B (akun + kontak) atau profil B2C. Khusus admin. */
export async function POST(req: Request) {
  const user = await getSession();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ message: "Hanya admin." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ message: "Badan request tidak valid." }, { status: 400 });

  const type = body.type === "B2C" ? "B2C" : "B2B";

  try {
    let createdId: number;
    let detail: Record<string, unknown>;

    if (type === "B2B") {
      const companyName = str(body.company_name);
      if (!companyName) return NextResponse.json({ message: "Nama perusahaan (B2B) wajib diisi." }, { status: 400 });
      const firstName = str(body.first_name);
      if (!firstName) return NextResponse.json({ message: "Nama kontak wajib diisi." }, { status: 400 });

      createdId = await withTransaction(async (conn) => {
        const [ar] = await conn.execute(
          "INSERT INTO accounts (company_name, legal_type, region, phone, email, priority) VALUES (?,?,?,?,?,'normal')",
          [companyName, str(body.legal_type), str(body.region), str(body.phone), str(body.email)]
        );
        const accountId = Number((ar as { insertId: number }).insertId);
        const [cr] = await conn.execute(
          "INSERT INTO contacts (account_id, first_name, job_title, whatsapp_number, email) VALUES (?,?,?,?,?)",
          [accountId, firstName, str(body.job_title), str(body.whatsapp_number), str(body.contact_email) ?? str(body.email)]
        );
        return Number((cr as { insertId: number }).insertId);
      });

      detail = { type: "B2B", company: companyName, contact: firstName, accountId: undefined, region: str(body.region) };
      await auditLog({
        userId: user.id,
        action: "CONTACT_CREATE",
        entityType: "contacts",
        entityId: String(createdId),
        detail,
      });
      return NextResponse.json({ ok: true, type: "B2B", contactId: createdId }, { status: 201 });
    }

    // B2C
    const fullName = str(body.full_name);
    if (!fullName) return NextResponse.json({ message: "Nama lengkap petani (B2C) wajib diisi." }, { status: 400 });

    createdId = await withTransaction(async (conn) => {
      const [r] = await conn.execute(
        "INSERT INTO b2c_profiles (full_name, whatsapp_number, email, land_size_ha, current_crop, region, village) VALUES (?,?,?,?,?,?,?)",
        [fullName, str(body.whatsapp_number), str(body.email), numOrNull(body.land_size_ha), str(body.current_crop), str(body.region), str(body.village)]
      );
      return Number((r as { insertId: number }).insertId);
    });

    await auditLog({
      userId: user.id,
      action: "CONTACT_CREATE",
      entityType: "b2c_profiles",
      entityId: String(createdId),
      detail: { type: "B2C", name: fullName, region: str(body.region) },
    });
    return NextResponse.json({ ok: true, type: "B2C", contactId: createdId }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 400 });
  }
}