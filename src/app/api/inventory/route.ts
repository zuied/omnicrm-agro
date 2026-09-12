import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { releaseExpiredAllocations } from "@/lib/stock";

const CATEGORY_MAP: Record<string, string> = {
  agrochemical: "KIMIA",
  equipment: "ALAT PERKEBUNAN",
};
const CATEGORY_FROM_UI: Record<string, string> = {
  KIMIA: "agrochemical",
  "ALAT PERKEBUNAN": "equipment",
};

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await releaseExpiredAllocations();

  const sp = req.nextUrl.searchParams;
  const warehouseId = sp.get("warehouse") ? Number(sp.get("warehouse")) : null;
  const q = (sp.get("q") ?? "").trim();
  const categoryUi = sp.get("category") ?? null;
  const categoryDb = categoryUi && CATEGORY_FROM_UI[categoryUi] ? CATEGORY_FROM_UI[categoryUi] : null;

  const warehouses = await query(
    "SELECT id, warehouse_name, location_type, region FROM warehouses WHERE is_active = 1 ORDER BY id"
  );

  let sql = `
    SELECT s.*, w.warehouse_name AS warehouse_name,
           pv.variant_name, pv.sku, pv.price,
           p.product_name, p.category, p.uom, p.requires_demplot,
           pv.agro_chemical_attrs, pv.equipment_attrs
    FROM inventory_stocks s
    JOIN warehouses w ON w.id = s.warehouse_id
    JOIN product_variants pv ON pv.id = s.variant_id
    JOIN products p ON p.id = pv.product_id
    WHERE s.qty_available >= 0
  `;
  const params: unknown[] = [];
  if (warehouseId) {
    sql += " AND s.warehouse_id = ?";
    params.push(warehouseId);
  }
  if (categoryDb) {
    sql += " AND p.category = ?";
    params.push(categoryDb);
  }
  if (q) {
    sql += " AND (pv.variant_name LIKE ? OR pv.sku LIKE ? OR p.product_name LIKE ?)";
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  sql += " ORDER BY p.category, p.product_name, pv.variant_name";
  const stocksRows = await query<Record<string, unknown>>(sql, params);

  const stocks = stocksRows.map((s) => {
    const attrsRaw = (s.agro_chemical_attrs ?? s.equipment_attrs ?? "") as string;
    let attrs: Record<string, string> = {};
    try {
      attrs = attrsRaw ? JSON.parse(attrsRaw) : {};
    } catch {
      attrs = {};
    }
    const is_chemical = s.category === "agrochemical";
    const exp = is_chemical ? attrs.expiry_date : null;
    let is_expired = 0;
    if (exp) {
      const t = new Date(String(exp)).getTime();
      if (!isNaN(t) && t < Date.now()) is_expired = 1;
    }
    return {
      ...s,
      category: CATEGORY_MAP[String(s.category)] ?? String(s.category),
      attrs,
      is_expired,
    };
  });

  const alerts = await query(
    `SELECT COUNT(*) AS low FROM inventory_stocks s
     WHERE s.qty_available <= s.qty_warning`
  );

  return NextResponse.json({ warehouses, stocks, lowStockCount: Number(alerts[0]?.low ?? 0) });
}