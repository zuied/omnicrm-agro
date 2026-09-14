import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

const CATEGORY_MAP: Record<string, string> = {
  agrochemical: "KIMIA",
  equipment: "ALAT PERKEBUNAN",
};

export async function GET() {
  const user = await getSession();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ message: "Hanya admin." }, { status: 403 });
  }
  const [users, products, contacts, warehouses] = await Promise.all([
    query("SELECT id, full_name, email, role, phone, region, is_active FROM users ORDER BY role, full_name"),
    query("SELECT id, product_name, category, uom, manufacturer, requires_demplot, is_active FROM products WHERE is_active = 1 ORDER BY product_name"),
    query(
      `SELECT c.id, c.account_id, c.first_name AS name, c.job_title, c.whatsapp_number, c.email, 'B2B' AS type, a.region,
              a.company_name, a.legal_type, a.phone AS account_phone, a.email AS account_email, NULL AS land_size_ha, NULL AS current_crop, NULL AS village
       FROM contacts c JOIN accounts a ON a.id = c.account_id
       UNION ALL
       SELECT id, NULL, full_name, 'Petani', whatsapp_number, email, 'B2C', region,
              NULL, NULL, NULL, NULL, land_size_ha, current_crop, village
       FROM b2c_profiles
       ORDER BY type, name`
    ),
    query("SELECT id, warehouse_name, location_type, region, is_active FROM warehouses ORDER BY is_active DESC, warehouse_name"),
  ]);
  return NextResponse.json({
    users,
    products: products.map((p: Record<string, unknown>) => ({
      ...p,
      category: CATEGORY_MAP[String(p.category)] ?? String(p.category),
    })),
    contacts,
    warehouses,
  });
}