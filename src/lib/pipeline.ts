import crypto from "node:crypto";
import { query, withTransaction } from "./db";
import { auditLog } from "./audit";
import type { DealCard } from "./types";

export interface DealFilters {
  stage?: string;
  customerType?: "B2B" | "B2C";
  ownerId?: number;
  q?: string;
  activeOnly?: boolean;
}

const DEAL_SELECT = `
  SELECT
    d.id, d.ref_no, d.customer_type, d.pipeline_stage, d.total_value,
    d.discount_percent, d.discount_status, d.owner_id, d.urgency,
    d.closing_date, d.created_at, d.updated_at, d.notes,
    COALESCE(a.company_name, b.full_name) AS customer_name,
    u.full_name AS owner_name,
    (SELECT GROUP_CONCAT(CONCAT(pv.variant_name, ' (', dl.quantity, ' ', COALESCE(p.uom,''), ')') SEPARATOR ', ')
     FROM deal_line_items dl
     JOIN product_variants pv ON pv.id = dl.variant_id
     JOIN products p ON p.id = pv.product_id
     WHERE dl.deal_id = d.id) AS product_label,
    (SELECT COUNT(*) FROM approval_requests ar WHERE ar.deal_id = d.id AND ar.status = 'pending') AS has_approval,
    (SELECT COUNT(*) FROM deal_line_items dl WHERE dl.deal_id = d.id) AS items_count
  FROM deals d
  LEFT JOIN accounts a ON a.id = d.account_id
  LEFT JOIN b2c_profiles b ON b.id = d.b2c_profile_id
  JOIN users u ON u.id = d.owner_id
`;

export function mapDeal(row: Record<string, unknown>): DealCard {
  return {
    id: Number(row.id),
    ref_no: String(row.ref_no),
    customer_type: row.customer_type as "B2B" | "B2C",
    customer_name: String(row.customer_name ?? "-"),
    product_label: String(row.product_label ?? ""),
    total_value: Number(row.total_value),
    discount_percent: Number(row.discount_percent),
    discount_status: (row.discount_status as DealCard["discount_status"]) ?? "none",
    pipeline_stage: String(row.pipeline_stage),
    owner_id: Number(row.owner_id),
    owner_name: String(row.owner_name ?? ""),
    urgency: (row.urgency as "normal" | "urgent") ?? "normal",
    closing_date: row.closing_date ? String(row.closing_date) : null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    has_approval: Number(row.has_approval ?? 0),
    items_count: Number(row.items_count ?? 0),
  };
}

export async function listDeals(f: DealFilters = {}): Promise<DealCard[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (f.activeOnly !== false) clauses.push("d.is_active = 1");
  if (f.stage) {
    clauses.push("d.pipeline_stage = ?");
    params.push(f.stage);
  }
  if (f.customerType) {
    clauses.push("d.customer_type = ?");
    params.push(f.customerType);
  }
  if (f.ownerId) {
    clauses.push("d.owner_id = ?");
    params.push(f.ownerId);
  }
  if (f.q) {
    clauses.push("(COALESCE(a.company_name,'') LIKE ? OR COALESCE(b.full_name,'') LIKE ? OR d.ref_no LIKE ?)");
    const like = `%${f.q}%`;
    params.push(like, like, like);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = await query<Record<string, unknown>>(
    `${DEAL_SELECT} ${where} ORDER BY d.updated_at DESC`,
    params
  );
  return rows.map(mapDeal);
}

export async function getDeal(id: number) {
  const rows = await query<Record<string, unknown>>(
    `${DEAL_SELECT} WHERE d.id = ? LIMIT 1`,
    [id]
  );
  const deal = rows[0];
  if (!deal) return null;

  const items = await query<Record<string, unknown>>(
    `SELECT dl.*, pv.variant_name, pv.sku, p.category, p.uom,
            pv.agro_chemical_attrs, pv.equipment_attrs
     FROM deal_line_items dl
     JOIN product_variants pv ON pv.id = dl.variant_id
     JOIN products p ON p.id = pv.product_id
     WHERE dl.deal_id = ?`,
    [id]
  );

  const approvals = await query<Record<string, unknown>>(
    `SELECT ar.*, ru.full_name AS requested_by_name, rv.full_name AS reviewed_by_name
     FROM approval_requests ar
     JOIN users ru ON ru.id = ar.requested_by
     LEFT JOIN users rv ON rv.id = ar.reviewed_by
     WHERE ar.deal_id = ?
     ORDER BY ar.requested_at DESC`,
    [id]
  );

  const timeline = await query<Record<string, unknown>>(
    `SELECT ac.*, u.full_name AS agent_name
     FROM activity_records ac
     JOIN users u ON u.id = ac.agent_id
     WHERE ac.deal_id = ?
     ORDER BY ac.created_at DESC`,
    [id]
  );

  const allocations = await query<Record<string, unknown>>(
    `SELECT sa.*, pv.variant_name, p.uom
     FROM stock_allocations sa
     JOIN inventory_stocks is2 ON is2.id = sa.inventory_id
     JOIN product_variants pv ON pv.id = is2.variant_id
     JOIN products p ON p.id = pv.product_id
     WHERE sa.deal_id = ? AND sa.status = 'active'
     ORDER BY sa.created_at DESC`,
    [id]
  ).then((rows) =>
    rows.map((r) => ({
      ...r,
      is_expired: new Date(String(r.expires_at)).getTime() < Date.now() ? 1 : 0,
    }))
  );

  return { ...mapDeal(deal), items, approvals, timeline, allocations };
}

export function nextRefNo(last: { id: number }[]): string {
  const n = (last[0]?.id ?? 0) + 1;
  return "CRM-" + String(n).padStart(4, "0");
}

export async function createDeal(input: {
  customer_type: "B2B" | "B2C";
  customer_id: number;
  owner_id: number;
  stage?: string;
  items: { variant_id: number; quantity: number; unit_price: number }[];
  discount_percent: number;
  closing_date?: string;
  urgency?: string;
  notes?: string;
}) {
  return withTransaction(async (conn) => {
    const [lastRow] = await conn.query("SELECT id FROM deals ORDER BY id DESC LIMIT 1");
    const ref = nextRefNo(lastRow as { id: number }[]);

    const items = input.items.filter((i) => i.variant_id && Number(i.quantity) > 0);
    if (items.length === 0) throw new Error("Deal harus memiliki minimal 1 item produk.");
    if (input.discount_percent > 100 || input.discount_percent < 0) throw new Error("Diskon tidak valid.");

    const rawTotal = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0);
    const discount = Number(input.discount_percent);
    const total = rawTotal * (1 - discount / 100);

    let stage = input.stage ?? "Prospecting";
    let discountStatus: string = "none";
    if (discount > 0 && discount <= 5) discountStatus = "auto";
    else if (discount > 5) {
      stage = "Pending Approval";
      discountStatus = "pending";
    }

    const [res] = await conn.query(
      `INSERT INTO deals (ref_no, customer_type, account_id, b2c_profile_id, pipeline_stage, total_value,
        discount_percent, discount_status, owner_id, urgency, closing_date, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        ref,
        input.customer_type,
        input.customer_type === "B2B" ? input.customer_id : null,
        input.customer_type === "B2C" ? input.customer_id : null,
        stage,
        Math.round(total),
        discount,
        discountStatus,
        input.owner_id,
        input.urgency ?? "normal",
        input.closing_date || null,
        input.notes || null,
      ]
    );
    const dealId = (res as { insertId: number }).insertId;

    for (const item of items) {
      const subtotal = Math.round(Number(item.quantity) * Number(item.unit_price));
      await conn.query(
        "INSERT INTO deal_line_items (deal_id, variant_id, quantity, unit_price, subtotal) VALUES (?,?,?,?,?)",
        [dealId, item.variant_id, item.quantity, item.unit_price, subtotal]
      );
    }

    let approvalId: number | null = null;
    let token: string | null = null;
    if (discount > 5) {
      token = crypto.randomBytes(32).toString("hex");
      const [ap] = await conn.query(
        `INSERT INTO approval_requests (deal_id, requested_by, discount_percent, value_before, value_after,
           status, tier, token) VALUES (?,?,?,?,?, 'pending', ?, ?)`,
        [dealId, input.owner_id, discount, Math.round(rawTotal), Math.round(total), discount > 15 ? "hos" : "manager", token]
      );
      approvalId = (ap as { insertId: number }).insertId;
    }

    await auditLog({ userId: input.owner_id, action: "DEAL_CREATE", entityType: "deal", entityId: ref, detail: { stage, discount } });
    return { id: dealId, ref, approvalId, token };
  });
}