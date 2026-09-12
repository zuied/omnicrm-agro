import { NextRequest, NextResponse } from "next/server";
import { getApprovalByToken, approve } from "@/lib/approval";

const RATE_LIMIT: Record<string, number> = {};

/** Endpoint publik untuk deep-link approval dari WhatsApp (tanpa session). */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/approvals/token/[token]">) {
  const { token } = await ctx.params;
  const appr = await getApprovalByToken(token);
  if (!appr) return NextResponse.json({ message: "Link persetujuan tidak valid." }, { status: 404 });
  if (appr.status !== "pending") {
    return NextResponse.json({ ok: false, alreadyReviewed: true, approval: appr });
  }
  return NextResponse.json({ ok: true, approval: appr });
}

export async function POST(req: NextRequest, ctx: RouteContext<"/api/approvals/token/[token]">) {
  const { token } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  if (body.action !== "approved" && body.action !== "rejected") {
    return NextResponse.json({ message: "Aksi tidak valid." }, { status: 400 });
  }

  // Rate-limit sederhana per token untuk mencegah abuse
  const now = Date.now();
  const last = RATE_LIMIT[token];
  if (last && now - last < 5000) {
    return NextResponse.json({ message: "Terlalu cepat. Coba lagi." }, { status: 429 });
  }
  RATE_LIMIT[token] = now;

  try {
    const result = await approve(body.action, {
      token,
      reviewerId: 0,
      reviewerName: body.reviewer_name ?? "Manager via WhatsApp",
      reviewerRole: "manager",
      note: body.note,
    });
    return NextResponse.json({ ...result });
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 400 });
  }
}