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
  const [users, products] = await Promise.all([
    query("SELECT id, full_name, email, role, is_active FROM users ORDER BY role, full_name"),
    query("SELECT id, product_name, category, is_active FROM products WHERE is_active = 1 ORDER BY product_name"),
  ]);
  return NextResponse.json({
    users,
    products: products.map((p: Record<string, unknown>) => ({
      ...p,
      category: CATEGORY_MAP[String(p.category)] ?? String(p.category),
    })),
  });
}