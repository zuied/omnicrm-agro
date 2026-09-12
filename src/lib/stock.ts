import { query, execute, withTransaction } from "./db";

export const ALLOCATION_TTL_HOURS = 72;

/** Lepas alokasi yang kedaluwarsa (3x24 jam). Dipanggil pada akses inventaris & kunci stok. */
export async function releaseExpiredAllocations(): Promise<number> {
  const expired = await query<{ id: number; inventory_id: number; qty: number }>(
    "SELECT id, inventory_id, qty FROM stock_allocations WHERE status = 'active' AND expires_at < NOW()"
  );
  if (expired.length === 0) return 0;

  await withTransaction(async (conn) => {
    for (const a of expired) {
      await conn.query(
        "UPDATE inventory_stocks SET qty_allocated = GREATEST(qty_allocated - ?, 0), qty_available = qty_available + ? WHERE id = ?",
        [a.qty, a.qty, a.inventory_id]
      );
      await conn.query(
        "UPDATE stock_allocations SET status = 'released', released_at = NOW() WHERE id = ? AND status = 'active'",
        [a.id]
      );
    }
  });
  return expired.length;
}

export interface LockStockResult {
  ok: boolean;
  inventoryId: number;
  qty: number;
  expiresAt: Date;
  lockDurationHours: number;
}

export async function lockStock(opts: {
  inventoryId: number;
  dealId: number;
  qty: number;
  allocatedBy: number;
  ttlHours?: number;
}): Promise<LockStockResult> {
  const ttl = opts.ttlHours ?? ALLOCATION_TTL_HOURS;
  const expiresAt = new Date(Date.now() + ttl * 3600 * 1000);

  const res = await withTransaction(async (conn) => {
    const [inv] = await conn.execute(
      "SELECT id, qty_available, qty_allocated FROM inventory_stocks WHERE id = ? FOR UPDATE",
      [opts.inventoryId]
    );
    const stockRow = (inv as { id: number; qty_available: string; qty_allocated: string }[])[0];
    if (!stockRow) throw new Error("Stok tidak ditemukan.");
    const available = Number(stockRow.qty_available);
    if (opts.qty <= 0) throw new Error("Jumlah harus lebih dari 0.");
    if (opts.qty > available) {
      throw new Error(`Stok tidak mencukupi (tersedia ${available}).`);
    }

    await conn.execute(
      "UPDATE inventory_stocks SET qty_available = qty_available - ?, qty_allocated = qty_allocated + ? WHERE id = ?",
      [opts.qty, opts.qty, opts.inventoryId]
    );
    await conn.execute(
      "INSERT INTO stock_allocations (inventory_id, deal_id, qty, allocated_by, expires_at, status) VALUES (?,?,?,?,?, 'active')",
      [opts.inventoryId, opts.dealId, opts.qty, opts.allocatedBy, expiresAt.toISOString().slice(0, 19).replace("T", " ")]
    );

    return { inventoryId: opts.inventoryId, qty: opts.qty, expiresAt };
  });

  await execute("UPDATE inventory_stocks SET updated_at = NOW() WHERE id = ?", [opts.inventoryId]);
  return { ok: true, ...res, lockDurationHours: ttl };
}

/** Pulangkan alokasi tanpa konsumsi (pembatalan deal). */
export async function releaseStock(inventoryId: number, dealId: number, qty: number): Promise<boolean> {
  return withTransaction(async (conn) => {
    const [allocRows] = await conn.execute(
      "SELECT id FROM stock_allocations WHERE inventory_id = ? AND deal_id = ? AND status = 'active' ORDER BY id LIMIT 1",
      [inventoryId, dealId]
    );
    const alloc = (allocRows as { id: number }[])[0];
    if (!alloc) return false;

    await conn.execute(
      "UPDATE inventory_stocks SET qty_allocated = GREATEST(qty_allocated - ?, 0), qty_available = qty_available + ? WHERE id = ?",
      [qty, qty, inventoryId]
    );
    await conn.execute("UPDATE stock_allocations SET status = 'released', released_at = NOW() WHERE id = ?", [alloc.id]);
    return true;
  });
}