import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getSession } from "@/lib/auth";
import { query, execute } from "@/lib/db";
import { getDeal } from "@/lib/pipeline";
import { auditLog } from "@/lib/audit";

export async function POST(req: NextRequest, ctx: RouteContext<"/api/deals/[id]/submit-approval">) {
  const user = await getSession();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const dealId = Number(id);

  const deal = await getDeal(dealId);
  if (!deal) return NextResponse.json({ message: "Deal tidak ditemukan." }, { status: 404 });
  if (user.role === "agent" && deal.owner_id !== user.id) {
    return NextResponse.json({ message: "Tidak berhak mengajukan approval." }, { status: 403 });
  }

  const discount = Number(deal.discount_percent);
  if (discount <= 5) {
    return NextResponse.json({ message: "Diskon masih dalam kewenangan agen (≤5%), tidak butuh approval." }, { status: 400 });
  }

  const existing = await query<{ id: number; token: string; status: string }>(
    "SELECT id, token, status FROM approval_requests WHERE deal_id = ? AND status = 'pending' ORDER BY id DESC LIMIT 1",
    [dealId]
  );

  let approvalId: number;
  let token: string;
  if (existing[0]) {
    approvalId = existing[0].id;
    token = existing[0].token;
  } else {
    token = crypto.randomBytes(32).toString("hex");
    const valueBefore = Math.round(Number(deal.total_value) / (1 - discount / 100));
    const res = await execute(
      `INSERT INTO approval_requests (deal_id, requested_by, discount_percent, value_before, value_after, status, tier, token)
       VALUES (?,?,?,?,?, 'pending', ?, ?)`,
      [dealId, user.id, discount, valueBefore, Number(deal.total_value), discount > 15 ? "hos" : "manager", token]
    );
    approvalId = res.insertId;
  }

  await execute("UPDATE deals SET pipeline_stage = 'Pending Approval', discount_status = 'pending', updated_at = NOW() WHERE id = ?", [dealId]);

  const approveUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/approve/${token}`;
  // Stub integrasi WhatsApp Business API - pesan auto ke Manager
  await execute(
    `INSERT INTO inbox_messages (direction, channel, counterpart, deal_id, subject, body, status)
     VALUES ('outbound','whatsapp', ?, ?, 'Permintaan Persetujuan Diskon', ?, 'sent')`,
    [
      "Sales Manager (Otomasi WA)",
      dealId,
      `Permintaan persetujuan diskon ${discount}% untuk ${deal.customer_name} (${deal.ref_no}, nilai Rp ${deal.total_value}). Setujui/Tolak di: ${approveUrl}`,
    ]
  );

  await auditLog({ userId: user.id, action: "APPROVAL_SUBMIT", entityType: "deal", entityId: String(dealId), detail: { approvalId, discount } });

  return NextResponse.json({
    ok: true,
    approvalId,
    token,
    message: "Transaksi terkunci. Menunggu persetujuan Manager.",
    waLink: `https://wa.me/?text=${encodeURIComponent(`Permintaan persetujuan diskon ${discount}% (${deal.ref_no}): ${approveUrl}`)}`,
    approveUrl,
  });
}