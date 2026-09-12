import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { approve } from "@/lib/approval";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/approvals/[id]">) {
  const user = await getSession();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!["manager", "hos", "admin"].includes(user.role)) {
    return NextResponse.json({ message: "Hanya Manager/HOS yang dapat melihat approval." }, { status: 403 });
  }
  const { id } = await ctx.params;
  const row = await query<Record<string, unknown>>(
    `SELECT ar.*, ru.full_name AS requested_by_name, COALESCE(a.company_name, b.full_name) AS customer_name,
            d.ref_no, d.total_value
     FROM approval_requests ar
     JOIN deals d ON d.id = ar.deal_id
     LEFT JOIN accounts a ON a.id = d.account_id
     LEFT JOIN b2c_profiles b ON b.id = d.b2c_profile_id
     JOIN users ru ON ru.id = ar.requested_by
     WHERE ar.id = ?`,
    [Number(id)]
  );
  if (!row[0]) return NextResponse.json({ message: "Approval tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ approval: { ...row[0], requester_can_note: true } });
}

export async function POST(req: NextRequest, ctx: RouteContext<"/api/approvals/[id]">) {
  const user = await getSession();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!["manager", "hos", "admin"].includes(user.role)) {
    return NextResponse.json({ message: "Hanya Manager/HOS yang dapat mereview." }, { status: 403 });
  }
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  if (body.action !== "approved" && body.action !== "rejected") {
    return NextResponse.json({ message: "Aksi tidak valid." }, { status: 400 });
  }
  try {
    const result = await approve(body.action, {
      approvalId: Number(id),
      reviewerId: user.id,
      reviewerName: user.full_name,
      reviewerRole: user.role,
      note: body.note,
    });
    return NextResponse.json({ ...result });
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 400 });
  }
}