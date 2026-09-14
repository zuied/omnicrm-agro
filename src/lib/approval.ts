import { query, execute, withTransaction } from "./db";
import { auditLog } from "./audit";
import { getDeal } from "./pipeline";

export interface ApprovalSummary {
  id: number;
  deal_id: number;
  discount_percent: number;
  value_before: number;
  value_after: number;
  status: "pending" | "approved" | "rejected";
  tier: "manager" | "hos";
  token: string;
  requested_at: string;
  requested_by_name: string;
  review_note: string | null;
  reviewed_by_name: string | null;
  reviewer_role: string | null;
  customer_name: string;
  ref_no: string;
  product_label: string;
  urgency: string;
}

export async function getApprovalByToken(token: string): Promise<ApprovalSummary | null> {
  const rows = await query<Record<string, unknown>>(
    `SELECT ar.*, ru.full_name AS requested_by_name, rv.full_name AS reviewed_by_name, rv.role AS reviewer_role,
            COALESCE(a.company_name, b.full_name) AS customer_name,
            d.ref_no, d.urgency,
            (SELECT GROUP_CONCAT(CONCAT(pv.variant_name, ' (', dl.quantity, ' ', COALESCE(p.uom,''), ')') SEPARATOR ', ')
             FROM deal_line_items dl JOIN product_variants pv ON pv.id = dl.variant_id JOIN products p ON p.id = pv.product_id
             WHERE dl.deal_id = d.id) AS product_label
     FROM approval_requests ar
     JOIN deals d ON d.id = ar.deal_id
     LEFT JOIN accounts a ON a.id = d.account_id
     LEFT JOIN b2c_profiles b ON b.id = d.b2c_profile_id
     JOIN users ru ON ru.id = ar.requested_by
     LEFT JOIN users rv ON rv.id = ar.reviewed_by
     WHERE ar.token = ?`,
    [token]
  );
  const r = rows[0];
  if (!r) return null;
  return {
    id: Number(r.id),
    deal_id: Number(r.deal_id),
    discount_percent: Number(r.discount_percent),
    value_before: Number(r.value_before),
    value_after: Number(r.value_after),
    status: r.status as ApprovalSummary["status"],
    tier: r.tier as ApprovalSummary["tier"],
    token: String(r.token),
    requested_at: String(r.requested_at),
    requested_by_name: String(r.requested_by_name),
    review_note: r.review_note ? String(r.review_note) : null,
    reviewed_by_name: r.reviewed_by_name ? String(r.reviewed_by_name) : null,
    reviewer_role: r.reviewer_role ? String(r.reviewer_role) : null,
    customer_name: String(r.customer_name ?? "-"),
    ref_no: String(r.ref_no),
    product_label: String(r.product_label ?? ""),
    urgency: String(r.urgency),
  };
}

export async function approve(action: "approved" | "rejected", opts: {
  approvalId?: number;
  token?: string;
  reviewerId: number;
  reviewerName: string;
  reviewerRole: string;
  note?: string;
}) {
  const row = opts.approvalId
    ? (await query<{ id: number; deal_id: number; status: string; discount_percent: number; tier: string }>(
        "SELECT id, deal_id, status, discount_percent, tier FROM approval_requests WHERE id = ?",
        [opts.approvalId]
      ))[0]
    : opts.token
      ? (await query<{ id: number; deal_id: number; status: string; discount_percent: number; tier: string }>(
          "SELECT id, deal_id, status, discount_percent, tier FROM approval_requests WHERE token = ?",
          [opts.token]
        ))[0]
      : undefined;

  if (!row) throw new Error("Pengajuan approval tidak ditemukan.");
  if (row.status !== "pending") throw new Error(`Pengajuan sudah berstatus ${row.status.toUpperCase()}.`);

  // Validasi tier sesuai matriks PRD §2.2
  const ALLOWED_ROLES: Record<string, string[]> = {
    manager: ["manager", "admin"],
    hos: ["hos", "admin"],
  };
  const permitted = ALLOWED_ROLES[row.tier];
  if (permitted && !permitted.includes(opts.reviewerRole)) {
    const target = row.tier === "hos" ? "Head of Sales atau Admin" : "Sales Manager atau Admin";
    throw new Error(`Approval ini hanya dapat direview oleh ${target}.`);
  }

  const reviewedBy = opts.reviewerId > 0 ? opts.reviewerId : null;

  await withTransaction(async (conn) => {
    await conn.execute(
      "UPDATE approval_requests SET status = ?, reviewed_by = ?, reviewed_at = NOW(), review_note = ? WHERE id = ?",
      [action, reviewedBy, opts.note ?? null, row.id]
    );
    if (action === "approved") {
      await conn.execute(
        "UPDATE deals SET discount_status = 'approved', pipeline_stage = 'PO Verification', updated_at = NOW() WHERE id = ?",
        [row.deal_id]
      );
    } else {
      await conn.execute(
        "UPDATE deals SET discount_status = 'rejected', pipeline_stage = 'Quotation & Negotiation', updated_at = NOW() WHERE id = ?",
        [row.deal_id]
      );
    }
  });

  const deal = await getDeal(row.deal_id);
  // Notifikasi ke agen pemilik (stub: masuk inbox + WA deep link)
  const statusText = action === "approved" ? "DISETUJUI" : "DITOLAK";
  const note = opts.note ? ` Catatan: ${opts.note}` : "";
  await execute(
    `INSERT INTO inbox_messages (direction, channel, counterpart, deal_id, subject, body, status)
     VALUES ('outbound','whatsapp', ?, ?, 'Status Persetujuan', ?, 'sent')`,
    [
      deal?.owner_name ?? "Agen",
      row.deal_id,
      `Keputusan Manager: Diskon ${row.discount_percent}% pada ${deal?.ref_no} (${deal?.customer_name}) ${statusText}.${note}`,
    ]
  );

  await auditLog({
    userId: opts.reviewerId,
    action: "APPROVAL_REVIEW",
    entityType: "approval_requests",
    entityId: String(row.id),
    detail: { deal_id: row.deal_id, decision: action, reviewer: opts.reviewerName, reviewerRole: opts.reviewerRole },
  });

  return { ok: true, decision: action, approvalId: row.id, deal: { id: deal?.id, ref_no: deal?.ref_no ?? "" } };
}