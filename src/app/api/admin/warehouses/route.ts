import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query, execute } from "@/lib/db";
import { auditLog } from "@/lib/audit";

function str(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

const LOCATIONS: Record<string, string> = { hazmat: "hazmat", equipment: "equipment", mixed: "mixed" };

/** Daftar semua gudang (admin-only). */
export async function GET() {
  const user = await getSession();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ message: "Hanya admin." }, { status: 403 });
  }
  const rows = await query("SELECT id, warehouse_name, location_type, region, is_active FROM warehouses ORDER BY is_active DESC, warehouse_name");
  return NextResponse.json({ warehouses: rows });
}

/** Tambah gudang baru (admin-only). */
export async function POST(req: Request) {
  const user = await getSession();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ message: "Hanya admin." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ message: "Badan request tidak valid." }, { status: 400 });

  const warehouse_name = str(body.warehouse_name);
  if (!warehouse_name) return NextResponse.json({ message: "Nama gudang wajib diisi." }, { status: 400 });

  const location_type = LOCATIONS[body.location_type] ?? "mixed";
  const is_active = body.is_active === false ? 0 : 1;

  const res = await execute(
    "INSERT INTO warehouses (warehouse_name, location_type, region, is_active) VALUES (?,?,?,?)",
    [warehouse_name, location_type, str(body.region), is_active]
  );
  const id = res.insertId;

  await auditLog({
    userId: user.id,
    action: "WAREHOUSE_CREATE",
    entityType: "warehouses",
    entityId: String(id),
    detail: { name: warehouse_name, location_type, region: str(body.region) },
  });

  return NextResponse.json({ ok: true, id }, { status: 201 });
}