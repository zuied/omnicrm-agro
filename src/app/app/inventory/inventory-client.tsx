"use client";

import React from "react";
import Link from "next/link";
import { Search, Warehouse, FlaskConical, Wrench, MapPin, AlertTriangle, Package, CalendarClock, PackagePlus, X } from "lucide-react";
import { apiFetcher } from "@/lib/types";
import { formatIDR, formatDate } from "@/lib/format";
import { Button, EmptyState, Spinner, Chip } from "@/components/ui";

interface Stock {
  id: number;
  warehouse_id: number;
  warehouse_name: string;
  variant_name: string;
  sku: string;
  price: number;
  category: "KIMIA" | "ALAT PERKEBUNAN";
  uom: string;
  qty_available: number;
  qty_allocated: number;
  product_name: string;
  attrs: Record<string, string>;
  is_expired: number;
  qty_warning: number;
}

export default function InventoryClient({ isAdmin = false }: { isAdmin?: boolean }) {
  const [warehouses, setWarehouses] = React.useState<{ id: number; warehouse_name: string }[]>([]);
  const [stocks, setStocks] = React.useState<Stock[] | null>(null);
  const [warehouse, setWarehouse] = React.useState<number | null>(null);
  const [q, setQ] = React.useState("");
  const [category, setCategory] = React.useState<string>("all");
  const [lowCount, setLowCount] = React.useState(0);

  const [restockOpen, setRestockOpen] = React.useState(false);
  const [restockVariants, setRestockVariants] = React.useState<{ variant_id: number; variant_name: string; sku: string; price: number; product_name: string; uom: string }[]>([]);
  const [rVariantId, setRVariantId] = React.useState("");
  const [rWarehouseId, setRWarehouseId] = React.useState("");
  const [rQty, setRQty] = React.useState("");
  const [rUpdatePrice, setRUpdatePrice] = React.useState(false);
  const [rNewPrice, setRNewPrice] = React.useState("");
  const [restockErr, setRestockErr] = React.useState<string | null>(null);
  const [restockMsg, setRestockMsg] = React.useState<string | null>(null);
  const [restockSaving, setRestockSaving] = React.useState(false);

  const openRestock = async () => {
    setRestockOpen(true);
    setRestockErr(null);
    setRestockMsg(null);
    setRUpdatePrice(false);
    setRNewPrice("");
    try {
      const r = await apiFetcher<{ variants: typeof restockVariants; warehouses: { id: number; warehouse_name: string }[] }>("/api/admin/restock");
      setRestockVariants(r.variants);
      if (r.warehouses.length === 1) setRWarehouseId(String(r.warehouses[0].id));
      if (r.variants.length) setRVariantId(String(r.variants[0].variant_id));
    } catch (e) {
      setRestockErr((e as Error).message);
    }
  };

  const pickVariant = (id: string) => {
    setRVariantId(id);
    const v = restockVariants.find((x) => x.variant_id === Number(id));
    if (v) setRNewPrice(String(v.price));
  };

  const submitRestock = async () => {
    setRestockErr(null);
    setRestockMsg(null);
    setRestockSaving(true);
    try {
      const r = await apiFetcher<{ ok: boolean; qty_available: number; price: number }>("/api/admin/restock", {
        method: "POST",
        body: JSON.stringify({
          variant_id: Number(rVariantId),
          warehouse_id: Number(rWarehouseId),
          qty: Number(rQty),
          update_price: rUpdatePrice,
          new_price: rUpdatePrice ? Number(rNewPrice) : null,
        }),
      });
      setRestockMsg(`✓ Stok berhasil dimasukkan. Tersedia sekarang: ${r.qty_available} unit.`);
      load(warehouse, q, category);
      setTimeout(() => { setRestockOpen(false); setRestockMsg(null); }, 1800);
    } catch (e) {
      setRestockErr((e as Error).message);
    } finally {
      setRestockSaving(false);
    }
  };

  const load = React.useCallback(async (wh: number | null, query: string, cat: string) => {
    const sp = new URLSearchParams();
    if (wh) sp.set("warehouse", String(wh));
    if (query.trim()) sp.set("q", query.trim());
    if (cat !== "all") sp.set("category", cat);
    try {
      const r = await apiFetcher<{ warehouses: typeof warehouses; stocks: Stock[]; lowStockCount: number }>(`/api/inventory?${sp}`);
      setWarehouses(r.warehouses);
      setStocks(r.stocks);
      setLowCount(r.lowStockCount);
    } catch {
      setStocks([]);
    }
  }, []);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setStocks(null);
      load(warehouse, q, category);
    }, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [warehouse, q, category, load]);

  const totalAvailable = (stocks ?? []).reduce((s, x) => s + Number(x.qty_available), 0);
  const totalAllocated = (stocks ?? []).reduce((s, x) => s + Number(x.qty_allocated), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink">
            <Warehouse className="h-5 w-5 text-agro" /> Inventaris Gudang
          </h1>
          <p className="text-sm text-slate-500">
            {totalAvailable.toLocaleString("id-ID")} unit tersedia · {totalAllocated.toLocaleString("id-ID")} unit terkunci (3x24 jam)
          </p>
        </div>
        {lowCount > 0 && (
          <span className="flex items-center gap-1 rounded-xl bg-warning-soft px-3 py-2 text-xs font-bold text-warning">
            <AlertTriangle className="h-4 w-4" /> {lowCount} SKU stok menipis
          </span>
        )}
        {isAdmin && (
          <Button size="md" onClick={openRestock} className="shrink-0">
            <PackagePlus className="h-4 w-4" /> Restok Barang Masuk
          </Button>
        )}
      </div>

      {/* Warehouse selector */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          <MapPin className="h-3.5 w-3.5" /> Pilih Gudang · kunci stok mengikuti lokasi deal
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setWarehouse(null)}
            className={`shrink-0 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${warehouse === null ? "border-agro bg-agro text-white" : "border-slate-200 bg-mist text-slate-600"}`}
          >
            Semua Gudang
          </button>
          {warehouses.map((w) => (
            <button
              key={w.id}
              onClick={() => setWarehouse(w.id)}
              className={`shrink-0 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${warehouse === w.id ? "border-agro bg-agro text-white" : "border-slate-200 bg-mist text-slate-600"}`}
            >
              {w.warehouse_name.replace(/^Gudang\s*/, "").split(" ")[0]} {w.warehouse_name.split("(")[1] ? "★" : ""}
            </button>
          ))}
        </div>
      </div>

      {/* Search + category */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari produk, SKU, varian…"
            className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-agro focus:ring-2 focus:ring-agro/20"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "KIMIA", "ALAT PERKEBUNAN"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-xl border px-4 py-2.5 text-xs font-bold transition ${category === c ? "border-corporate bg-corporate text-white" : "border-slate-200 bg-white text-slate-600"}`}
            >
              {c === "all" ? "Semua" : c}
            </button>
          ))}
        </div>
      </div>

      {/* Stock list */}
      {!stocks ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : stocks.length === 0 ? (
        <EmptyState title="Produk tidak ditemukan" desc="Ubah kata kunci atau pilihan gudang/kategori." />
      ) : (
        <div className="space-y-3">
          {stocks.map((s) => {
            const isChemical = s.category === "KIMIA";
            const low = Number(s.qty_available) <= Number(s.qty_warning);
            const meta = isChemical
              ? { exp: s.attrs.expiry_date, license: s.attrs.license_no }
              : { warranty: s.attrs.warranty_months, sn: s.attrs.serial_no };
            const expiredMark = s.is_expired ? "text-danger" : "";

            return (
              <div key={s.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${isChemical ? "bg-danger-soft text-danger" : "bg-violet-100 text-violet-600"}`}>
                    {isChemical ? <FlaskConical className="h-5 w-5" /> : <Wrench className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip tone={isChemical ? "red" : "violet"}>{s.category}</Chip>
                      <span className="text-[11px] font-semibold text-slate-400">{s.sku}</span>
                    </div>
                    <div className="mt-1 truncate text-[15px] font-bold text-ink">{s.variant_name}</div>
                    <div className="text-xs text-slate-500">{s.product_name} · {s.warehouse_name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-medium text-slate-400">Harga</div>
                    <div className="text-sm font-bold text-ink">{formatIDR(s.price)}</div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-100 pt-3">
                  <div>
                    <div className="text-[10px] font-medium text-slate-400">Tersedia</div>
                    <div className={`text-lg font-extrabold ${low ? "text-danger" : "text-ink"}`}>
                      {s.qty_available} <span className="text-xs font-medium text-slate-400">{s.uom}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-medium text-slate-400">Terkunci (alokasi)</div>
                    <div className="text-sm font-bold text-warning">{s.qty_allocated} {s.uom}</div>
                  </div>
                  <div className="ml-auto space-y-0.5 text-right text-[11px] text-slate-500">
                    {isChemical ? (
                      <>
                        {meta.exp && (
                          <span className={`flex items-center gap-1 justify-end ${expiredMark}`}>
                            <CalendarClock className="h-3 w-3" /> Exp {formatDate(meta.exp)}
                          </span>
                        )}
                        {meta.license && <span>Reg. {meta.license}</span>}
                      </>
                    ) : (
                      <>
                        {meta.warranty && (
                          <span className="flex items-center gap-1 justify-end">
                            <CalendarClock className="h-3 w-3" /> Garansi {meta.warranty} bln
                          </span>
                        )}
                        {meta.sn && <span>SN {meta.sn}</span>}
                      </>
                    )}
                  </div>
                </div>

                {low && (
                  <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-warning-soft px-3 py-1.5 text-[11px] font-bold text-warning">
                    <AlertTriangle className="h-3.5 w-3.5" /> Stok di bawah ambang {s.qty_warning}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between rounded-2xl border border-dashed border-corporate/40 bg-corporate-soft px-4 py-3 text-sm">
        <div>
          <div className="font-bold text-corporate">Perlu kunci stok untuk transaksi?</div>
          <div className="text-xs text-slate-500">Buka detail deal lalu gunakan panel “Kunci Stok” (alokasi 3x24 jam, bukan konsumsi).</div>
        </div>
        <Link href="/app/pipeline">
          <Button variant="secondary" className="shrink-0"><Package className="h-4 w-4" /> Ke pipeline</Button>
        </Link>
      </div>

      {/* Modal Restok */}
      {restockOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={() => setRestockOpen(false)}>
          <div
            className="w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-ink">
                <PackagePlus className="h-4 w-4 text-agro" /> Restok Barang Masuk
              </div>
              <button onClick={() => setRestockOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <div className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Pilih Varian Produk *</div>
                <select
                  value={rVariantId}
                  onChange={(e) => pickVariant(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm"
                >
                  <option value="">— pilih —</option>
                  {restockVariants.map((v) => (
                    <option key={v.variant_id} value={v.variant_id}>
                      {v.product_name} — {v.variant_name} ({v.sku}) @ {formatIDR(v.price)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Pilih Gudang *</div>
                <select
                  value={rWarehouseId}
                  onChange={(e) => setRWarehouseId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm"
                >
                  <option value="">— pilih —</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.warehouse_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Jumlah Masuk *</div>
                <input
                  type="number"
                  min={1}
                  value={rQty}
                  onChange={(e) => setRQty(e.target.value)}
                  placeholder="Contoh: 50"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-mist px-3 py-2.5 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={rUpdatePrice}
                  onChange={(e) => setRUpdatePrice(e.target.checked)}
                  className="h-4 w-4 accent-agro"
                />
                <span>Ubah harga varian ini?</span>
              </label>

              {rUpdatePrice && (
                <div>
                  <div className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Harga Baru (Rp) *</div>
                  <input
                    type="number"
                    min={0}
                    value={rNewPrice}
                    onChange={(e) => setRNewPrice(e.target.value)}
                    placeholder="Contoh: 685000"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                  />
                </div>
              )}

              <p className="rounded-lg bg-slate-100 px-3 py-2 text-[11px] text-slate-500">
                SKU + gudang yang sama tidak diduplikat — jumlahnya akan <b>ditambahkan</b> ke stok yang ada. Harga hanya berubah jika kamu centang kotak di atas.
              </p>

              {restockErr && <div className="rounded-xl bg-danger-mist px-4 py-3 text-xs font-medium text-danger">{restockErr}</div>}
              {restockMsg && <div className="rounded-xl bg-agro-mist px-4 py-3 text-xs font-semibold text-agro">{restockMsg}</div>}

              <Button size="lg" className="w-full" loading={restockSaving} onClick={submitRestock}>
                {restockSaving ? undefined : <PackagePlus className="h-4 w-4" />}
                Simpan Stok Masuk
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}