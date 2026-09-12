import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!["manager", "hos", "admin"].includes(user.role)) {
    return NextResponse.json({ message: "Hanya Manager/HOS yang dapat melihat approval." }, { status: 403 });
  }

  const rows = await query<Record<string, unknown>>(
    `SELECT ar.id, ar.discount_percent, ar.value_before, ar.value_after, ar.status, ar.tier,
            ar.requested_at, ar.review_note, ru.full_name AS requested_by_name,
            d.ref_no, d.urgency, COALESCE(a.company_name, b.full_name) AS customer_name
     FROM approval_requests ar
     JOIN deals d ON d.id = ar.deal_id
     LEFT JOIN accounts a ON a.id = d.account_id
     LEFT JOIN b2c_profiles b ON b.id = d.b2c_profile_id
     JOIN users ru ON ru.id = ar.requested_by
     ORDER BY (ar.status = 'pending') DESC, ar.requested_at DESC`
  );

  return NextResponse.json({ approvals: rows });
}