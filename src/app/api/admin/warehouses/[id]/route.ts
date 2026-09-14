import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { auditLog } from "@/lib/audit";

function str(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

const LOCATIONS: Record<string, string> = { hazmat: "hazmat", equipment: "equipment", mixed: "mixed" };

/** Update gudang (nama, tipe, region, status aktif). Admin-only. */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ message: "Hanya admin." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const wid = Number(id);
  if (!Number.isInteger(wid) || wid <= 0) return NextResponse.json({ message: "ID tidak valid." }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ message: "Badan request tidak valid." }, { status: 400 });

  const existing = await query<{ id: number }>("SELECT id FROM warehouses WHERE id = ?", [wid]);
  if (existing.length === 0) return NextResponse.json({ message: "Gudang tidak ditemukan." }, { status: 404 });

  const warehouse_name = str(body.warehouse_name);
  if (!warehouse_name) return NextResponse.json({ message: "Nama gudang wajib diisi." }, { status: 400 });

  const location_type = LOCATIONS[body.location_type] ?? "mixed";
  const is_active = body.is_active === false || body.is_active === 0 ? 0 : 1;

  await query(
    "UPDATE warehouses SET warehouse_name = ?, location_type = ?, region = ?, is_active = ? WHERE id = ?",
    [warehouse_name, location_type, str(body.region), is_active, wid]
  );

  await auditLog({
    userId: user.id,
    action: "WAREHOUSE_UPDATE",
    entityType: "warehouses",
    entityId: String(wid),
    detail: { name: warehouse_name, location_type, region: str(body.region), is_active },
  });

  return NextResponse.json({ ok: true });
}