import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

const rupiah = (n: unknown) => "Rp" + Number(n ?? 0).toLocaleString("id-ID");

type AuditRow = {
  id: number;
  user_id: number | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  detail: string | null;
  created_at: string;
  full_name: string | null;
};

type Maps = {
  wh: Map<number, string>;
  variants: Map<number, string>;
  deals: Map<number, string>;
  users: Map<number, string>;
  prods: Map<number, string>;
  accts: Map<number, string>;
  b2c: Map<number, string>;
};

const DETAIL_KEY_LABELS: Record<string, { label: string; fmt?: (v: unknown, m: Maps) => string }> = {
  variantId: { label: "produk", fmt: (v, m) => m.variants.get(Number(v)) ?? `varian #${v}` },
  productId: { label: "produk", fmt: (v, m) => m.prods.get(Number(v)) ?? m.variants.get(Number(v)) ?? String(v) },
  warehouseId: { label: "gudang", fmt: (v, m) => m.wh.get(Number(v)) ?? `gudang #${v}` },
  priceBefore: { label: "harga lama", fmt: rupiah },
  priceAfter: { label: "harga baru", fmt: rupiah },
  qty: { label: "qty", fmt: (v) => String(v) },
  discount: { label: "diskon", fmt: (v) => `${v}%` },
  stage: { label: "tahap", fmt: (v) => { const s = String(v); const map: Record<string, string> = { lead: "Lead", offer: "Penawaran", negosiasi: "Negosiasi", deal: "Deal", "follow_up": "Follow-up", lost: "Batal" }; return map[s] ?? s; } },
  channel: { label: "kanal", fmt: (v) => String(v).toUpperCase() },
  passwordSet: { label: "password", fmt: (v) => (v ? "diubah" : "tidak diubah") },
  type: { label: "tipe" },
  name: { label: "nama" },
  role: { label: "role" },
  email: { label: "email" },
  region: { label: "region" },
  company: { label: "perusahaan" },
  contactId: { label: "kontak", fmt: (v) => `#${v}` },
  approvalId: { label: "approval", fmt: (v) => `#${v}` },
};

function detailDisplay(detail: string | null, m: Maps): string | null {
  if (!detail) return null;
  let d: unknown;
  try {
    d = JSON.parse(detail);
  } catch {
    return detail;
  }
  if (!d || typeof d !== "object" || Array.isArray(d)) return String(d ?? "");

  const parts: string[] = [];
  for (const [k, v] of Object.entries(d)) {
    if (v === null || v === undefined || v === "") continue;
    const def = DETAIL_KEY_LABELS[k];
    if (!def) {
      parts.push(`${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`);
      continue;
    }
    const label = def.label;
    const value = def.fmt ? def.fmt(v, m) : String(v);
    parts.push(`${label}: ${value}`);
  }
  return parts.length ? parts.join(" · ") : null;
}

function entityLabel(a: AuditRow, m: Maps): string | null {
  if (!a.entity_type || !a.entity_id) return null;
  const id = Number(a.entity_id);
  switch (a.entity_type) {
    case "deal": return m.deals.get(id) ?? a.entity_id;
    case "users": return m.users.get(id) ?? a.entity_id;
    case "warehouses": return m.wh.get(id) ?? a.entity_id;
    case "products": return m.prods.get(id) ?? a.entity_id;
    case "product_variants": return m.variants.get(id) ?? a.entity_id;
    case "accounts": return m.accts.get(id) ?? a.entity_id;
    case "b2c_profiles": return m.b2c.get(id) ?? a.entity_id;
    default: return null;
  }
}

export async function GET() {
  const user = await getSession();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ message: "Hanya admin." }, { status: 403 });
  }

  const audits = await query<AuditRow>(
    `SELECT al.id, al.user_id, al.action, al.entity_type, al.entity_id, al.detail, al.created_at, u.full_name
     FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id
     ORDER BY al.created_at DESC LIMIT 60`
  );

  const [wh, variants, deals, users, prods, accts, b2c] = await Promise.all([
    query<{ id: number; warehouse_name: string }>("SELECT id, warehouse_name FROM warehouses"),
    query<{ id: number; product_name: string; variant_name: string }>(
      "SELECT pv.id, p.product_name, pv.variant_name FROM product_variants pv JOIN products p ON p.id = pv.product_id"
    ),
    query<{ id: number; ref_no: string }>("SELECT id, ref_no FROM deals"),
    query<{ id: number; full_name: string }>("SELECT id, full_name FROM users"),
    query<{ id: number; product_name: string }>("SELECT id, product_name FROM products"),
    query<{ id: number; company_name: string }>("SELECT id, company_name FROM accounts"),
    query<{ id: number; full_name: string }>("SELECT id, full_name FROM b2c_profiles"),
  ]);

  const maps: Maps = {
    wh: new Map(wh.map((r) => [r.id, r.warehouse_name] as [number, string])),
    variants: new Map(
      variants.map(
        (r) =>
          [
            r.id,
            r.product_name === r.variant_name || !r.variant_name ? r.product_name : `${r.product_name} — ${r.variant_name}`,
          ] as [number, string]
      )
    ),
    deals: new Map(deals.map((r) => [r.id, r.ref_no] as [number, string])),
    users: new Map(users.map((r) => [r.id, r.full_name] as [number, string])),
    prods: new Map(prods.map((r) => [r.id, r.product_name] as [number, string])),
    accts: new Map(accts.map((r) => [r.id, r.company_name] as [number, string])),
    b2c: new Map(b2c.map((r) => [r.id, r.full_name] as [number, string])),
  };

  const enriched = audits.map((a) => ({
    ...a,
    detailDisplay: detailDisplay(a.detail, maps),
    entityLabel: entityLabel(a, maps),
  }));

  return NextResponse.json({ audits: enriched });
}