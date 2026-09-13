import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { withTransaction } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { query } from "@/lib/db";

function asJson(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === "string") {
    try {
      JSON.parse(v);
      return v;
    } catch {
      return JSON.stringify({ raw: v });
    }
  }
  return JSON.stringify(v);
}

function asNum(v: unknown): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Tambah master produk + varian (+ stok awal di gudang). Khusus admin. */
export async function POST(req: Request) {
  const user = await getSession();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ message: "Hanya admin." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ message: "Badan request tidak valid." }, { status: 400 });

  const category = body.category;
  if (!["agrochemical", "equipment"].includes(category)) {
    return NextResponse.json({ message: "Kategori wajib KIMIA (agrochemical) atau ALAT PERKEBUNAN (equipment)." }, { status: 400 });
  }
  const productName = String(body.product_name ?? "").trim();
  const sku = String(body.sku ?? "").trim();
  const variantName = String(body.variant_name ?? "").trim();
  const price = asNum(body.price);
  if (!productName || !sku || !variantName) {
    return NextResponse.json({ message: "Nama produk, SKU, dan nama varian wajib diisi." }, { status: 400 });
  }
  if (price === null || price < 0) {
    return NextResponse.json({ message: "Harga harus angka ≥ 0." }, { status: 400 });
  }

  // Duplikasi SKU dicek eksplisit agar pesan error ramah
  const dup = await query("SELECT id FROM product_variants WHERE sku = ?", [sku]);
  if (dup[0]) {
    return NextResponse.json({ message: `SKU ${sku} sudah dipakai oleh varian lain.` }, { status: 400 });
  }

  const uom = String(body.uom ?? "Pcs").trim() || "Pcs";
  const manufacturer = String(body.manufacturer ?? "").trim() || null;
  const requiresDemplot = body.requires_demplot ? 1 : 0;
  const agroAttrs = category === "agrochemical" ? asJson(body.agro_chemical_attrs) : null;
  const eqAttrs = category === "equipment" ? asJson(body.equipment_attrs) : null;

  const warehouseId = asNum(body.warehouse_id);
  const qtyAvailable = asNum(body.qty_available);

  try {
    const res = await withTransaction(async (conn) => {
      const [pr] = await conn.execute(
        "INSERT INTO products (product_name, category, uom, manufacturer, requires_demplot, is_active) VALUES (?,?,?,?,?, 1)",
        [productName, category, uom, manufacturer, requiresDemplot]
      );
      const productId = Number((pr as { insertId: number }).insertId);

      const [vr] = await conn.execute(
        "INSERT INTO product_variants (product_id, sku, variant_name, price, agro_chemical_attrs, equipment_attrs, is_active) VALUES (?,?,?,?,?,?, 1)",
        [productId, sku, variantName, price, agroAttrs, eqAttrs]
      );
      const variantId = Number((vr as { insertId: number }).insertId);

      if (warehouseId !== null && qtyAvailable !== null && qtyAvailable >= 0) {
        const qtyWarning = asNum(body.qty_warning) ?? 10;
        await conn.execute(
          "INSERT INTO inventory_stocks (warehouse_id, variant_id, qty_available, qty_allocated, qty_warning) VALUES (?,?,?, 0, ?)",
          [warehouseId, variantId, qtyAvailable, qtyWarning]
        );
      }

      return { productId, variantId };
    });

    await auditLog({
      userId: user.id,
      action: "PRODUCT_CREATE",
      entityType: "product",
      entityId: String(res.productId),
      detail: { product: productName, sku, variant: variantName, price, category, warehouseId, qtyAvailable },
    });

    return NextResponse.json({ ok: true, ...res, product_name: productName }, { status: 201 });
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "ER_DUP_ENTRY") {
      return NextResponse.json({ message: `SKU ${sku} sudah digunakan.` }, { status: 400 });
    }
    return NextResponse.json({ message: (e as Error).message }, { status: 400 });
  }
}