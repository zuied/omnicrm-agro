import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query, withTransaction } from "@/lib/db";
import { auditLog } from "@/lib/audit";

function asNum(v: unknown): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Master data untuk form restok: semua varian aktif + gudang aktif. Admin-only. */
export async function GET() {
  const user = await getSession();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ message: "Hanya admin." }, { status: 403 });
  }
  const [variants, warehouses] = await Promise.all([
    query(
      `SELECT pv.id AS variant_id, pv.variant_name, pv.sku, pv.price, p.product_name, p.uom, p.category
       FROM product_variants pv JOIN products p ON p.id = pv.product_id
       WHERE pv.is_active = 1 AND p.is_active = 1
       ORDER BY p.product_name, pv.variant_name`
    ),
    query("SELECT id, warehouse_name, location_type, region FROM warehouses WHERE is_active = 1 ORDER BY warehouse_name"),
  ]);
  return NextResponse.json({ variants, warehouses });
}

/**
 * Restok barang masuk.
 * - SKU + gudang sudah ada  → qty_available ditambah, harga boleh diperbarui
 * - SKU + gudang belum ada  → baris stok baru dibuat (harga varian boleh ikut diperbarui)
 */
export async function POST(req: Request) {
  const user = await getSession();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ message: "Hanya admin." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ message: "Badan request tidak valid." }, { status: 400 });

  const variantId = asNum(body.variant_id);
  const warehouseId = asNum(body.warehouse_id);
  const qty = asNum(body.qty);
  const updatePrice = body.update_price === true;
  const newPrice = asNum(body.new_price);

  if (!variantId) return NextResponse.json({ message: "Pilih varian produk." }, { status: 400 });
  if (!warehouseId) return NextResponse.json({ message: "Pilih gudang." }, { status: 400 });
  if (!qty || qty <= 0) return NextResponse.json({ message: "Jumlah stok masuk harus lebih dari 0." }, { status: 400 });
  if (updatePrice && (newPrice === null || newPrice < 0)) {
    return NextResponse.json({ message: "Harga baru harus angka ≥ 0." }, { status: 400 });
  }

  const variant = await query<{ id: number; price: number }>(
    "SELECT id, price FROM product_variants WHERE id = ? AND is_active = 1",
    [variantId]
  );
  if (variant.length === 0) return NextResponse.json({ message: "Varian produk tidak ditemukan / nonaktif." }, { status: 404 });

  const warehouse = await query<{ id: number }>("SELECT id FROM warehouses WHERE id = ? AND is_active = 1", [warehouseId]);
  if (warehouse.length === 0) return NextResponse.json({ message: "Gudang tidak ditemukan / nonaktif." }, { status: 404 });

  const oldPrice = Number(variant[0].price);

  try {
    const out = await withTransaction(async (conn) => {
      const [stock] = await conn.execute(
        "SELECT id, qty_available FROM inventory_stocks WHERE warehouse_id = ? AND variant_id = ? FOR UPDATE",
        [warehouseId, variantId]
      );
      const rows = stock as { id: number; qty_available: number }[];
      let stockId: number;
      let qtyAvailable: number;

      if (rows.length > 0) {
        stockId = rows[0].id;
        qtyAvailable = Number(rows[0].qty_available) + qty;
        await conn.execute("UPDATE inventory_stocks SET qty_available = ? WHERE id = ?", [qtyAvailable, stockId]);
      } else {
        const [ir] = await conn.execute(
          "INSERT INTO inventory_stocks (warehouse_id, variant_id, qty_available, qty_allocated, qty_warning) VALUES (?,?,?,0,10)",
          [warehouseId, variantId, qty]
        );
        stockId = Number((ir as { insertId: number }).insertId);
        qtyAvailable = qty;
      }

      let priceAfter = oldPrice;
      if (updatePrice && newPrice !== null) {
        await conn.execute("UPDATE product_variants SET price = ? WHERE id = ?", [newPrice, variantId]);
        priceAfter = newPrice;
      }

      return { stockId, qtyAvailable, priceAfter };
    });

    await auditLog({
      userId: user.id,
      action: "STOCK_IN",
      entityType: "inventory_stocks",
      entityId: String(out.stockId),
      detail: { variantId, warehouseId, qty, priceBefore: oldPrice, priceAfter: out.priceAfter },
    });

    return NextResponse.json({ ok: true, stock_id: out.stockId, qty_available: out.qtyAvailable, price: out.priceAfter });
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 400 });
  }
}