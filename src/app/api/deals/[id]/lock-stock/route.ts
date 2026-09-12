import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { lockStock, releaseExpiredAllocations } from "@/lib/stock";
import { auditLog } from "@/lib/audit";

/** Kunci stok untuk deal (bukan konsumsi). Alokasi kedaluwarsa otomatis 3x24 jam. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/deals/[id]/lock-stock">) {
  const user = await getSession();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const dealId = Number(id);
  const body = await req.json().catch(() => ({}));

  const start = Date.now();
  await releaseExpiredAllocations();

  const dealer = await query<{ owner_id: number }>("SELECT owner_id FROM deals WHERE id = ?", [dealId]);
  if (!dealer[0]) return NextResponse.json({ message: "Deal tidak ditemukan." }, { status: 404 });
  if (user.role === "agent" && dealer[0].owner_id !== user.id) {
    return NextResponse.json({ message: "Tidak berhak mengunci stok untuk deal ini." }, { status: 403 });
  }

  try {
    const result = await lockStock({
      inventoryId: Number(body.inventoryId),
      dealId,
      qty: Number(body.qty),
      allocatedBy: user.id,
    });
    await auditLog({
      userId: user.id,
      action: "STOCK_LOCK",
      entityType: "deal",
      entityId: String(dealId),
      detail: { inventoryId: result.inventoryId, qty: result.qty, expiresAt: result.expiresAt, lockDurationHours: result.lockDurationHours },
    });
    const ms = Date.now() - start;
    return NextResponse.json({ ...result, elapsedMs: ms, uat: { lockUnder1500ms: ms < 1500 } });
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 400 });
  }
}