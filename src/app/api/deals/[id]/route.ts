import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDeal } from "@/lib/pipeline";
import { query, execute, withTransaction } from "@/lib/db";
import { auditLog } from "@/lib/audit";

export async function GET(_req: Request, ctx: RouteContext<"/api/deals/[id]">) {
  const user = await getSession();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const deal = await getDeal(Number(id));
  if (!deal) return NextResponse.json({ message: "Deal tidak ditemukan." }, { status: 404 });

  // Hak akses: agent hanya untuk deal miliknya
  if (user.role === "agent" && deal.owner_id !== user.id) {
    return NextResponse.json({ message: "Anda tidak memiliki akses ke deal ini." }, { status: 403 });
  }
  return NextResponse.json({ deal });
}

/** Perbarui deal: pindah stage, ubah diskon, catatan, dsb. */
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/deals/[id]">) {
  const user = await getSession();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const dealId = Number(id);
  const body = await req.json().catch(() => ({}));

  const rows = await query<{ owner_id: number; pipeline_stage: string; discount_status: string; discount_percent: number; total_value: number }>(
    "SELECT owner_id, pipeline_stage, discount_status, discount_percent, total_value FROM deals WHERE id = ?",
    [dealId]
  );
  const deal = rows[0];
  if (!deal) return NextResponse.json({ message: "Deal tidak ditemukan." }, { status: 404 });
  if (user.role === "agent" && deal.owner_id !== user.id) {
    return NextResponse.json({ message: "Tidak berhak mengubah deal ini." }, { status: 403 });
  }

  try {
    const updates: string[] = [];
    const params: unknown[] = [];
    const auditDetail: Record<string, unknown> = {};

    if (body.stage && body.stage !== deal.pipeline_stage) {
      // Stage Pending Approval hanya bisa masuk lewat approval workflow
      updates.push("pipeline_stage = ?");
      params.push(body.stage);
      auditDetail.stage = body.stage;
    }

    if (typeof body.discount_percent === "number") {
      const d = Number(body.discount_percent);
      if (d < 0 || d > 100) return NextResponse.json({ message: "Diskon tidak valid." }, { status: 400 });

      let status: string;
      if (d === 0) status = "none";
      else if (d <= 5) status = "auto";
      else status = "pending";

      updates.push("discount_percent = ?", "discount_status = ?");
      params.push(d, status);
      auditDetail.discount = d;
      auditDetail.discountStatus = status;

      // Diskon >5% mengunci transaksi -> stage Pending Approval
      if (d > 5 && deal.pipeline_stage !== "Closed Won") {
        updates.push("pipeline_stage = ?");
        params.push("Pending Approval");
      }
    }

    if (typeof body.urgency === "string") {
      updates.push("urgency = ?");
      params.push(body.urgency === "urgent" ? "urgent" : "normal");
    }
    if (typeof body.notes === "string") {
      updates.push("notes = ?");
      params.push(body.notes);
    }
    if (body.closing_date) {
      updates.push("closing_date = ?");
      params.push(body.closing_date);
    }

    if (updates.length === 0) return NextResponse.json({ message: "Tidak ada field yang diubah." }, { status: 400 });

    params.push(dealId);
    await execute(`UPDATE deals SET ${updates.join(", ")}, updated_at = NOW() WHERE id = ?`, params);
    await auditLog({ userId: user.id, action: "DEAL_UPDATE", entityType: "deal", entityId: String(dealId), detail: auditDetail });

    // Jika berpindah ke Closed Won (B2C): kurangi stok langsung (qty dipotong)
    if (body.stage === "Closed Won") {
      await closeDealStock(dealId);
    }

    const fresh = await getDeal(dealId);
    return NextResponse.json({ ok: true, deal: fresh });
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 400 });
  }
}

/** Potong qty_available saat deal Closed Won (khusus alokasi yang sudah pernah dikunci). */
async function closeDealStock(dealId: number) {
  const allocs = await query<{ id: number; inventory_id: number; qty: number }>(
    "SELECT id, inventory_id, qty FROM stock_allocations WHERE deal_id = ? AND status = 'active'",
    [dealId]
  );
  if (allocs.length === 0) return;
  await withTransaction(async (conn) => {
    for (const a of allocs) {
      await conn.query(
        "UPDATE inventory_stocks SET qty_allocated = GREATEST(qty_allocated - ?, 0), qty_available = GREATEST(qty_available - ?, 0) WHERE id = ?",
        [a.qty, a.qty, a.inventory_id]
      );
      await conn.query("UPDATE stock_allocations SET status = 'converted', released_at = NOW() WHERE id = ?", [a.id]);
    }
  });
}