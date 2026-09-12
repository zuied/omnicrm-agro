"use client";

import React from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Button, Modal, Field } from "@/components/ui";
import { apiFetcher } from "@/lib/types";
import { formatIDR } from "@/lib/format";

interface MasterData {
  accounts?: { id: number; company_name: string; region: string | null }[];
  b2c?: { id: number; full_name: string; region: string | null }[];
  variants?: { id: number; variant_name: string; sku: string; price: number; category: string; uom: string; product_name: string }[];
}

interface LineItem {
  variant_id: number;
  quantity: number;
  unit_price: number;
}

export default function CreateDeal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [master, setMaster] = React.useState<MasterData | null>(null);
  const [ctype, setCtype] = React.useState<"B2B" | "B2C">("B2B");
  const [customerId, setCustomerId] = React.useState("");
  const [items, setItems] = React.useState<LineItem[]>([{ variant_id: 0, quantity: 1, unit_price: 0 }]);
  const [discount, setDiscount] = React.useState(0);
  const [urgency, setUrgency] = React.useState<"normal" | "urgent">("normal");
  const [closingDate, setClosingDate] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{ ref: string; token: string | null; waLink?: string; approveUrl?: string } | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      setResult(null);
      setError(null);
      apiFetcher<MasterData>("/api/deals").then(setMaster).catch((e) => setError((e as Error).message));
    }, 0);
    return () => clearTimeout(t);
  }, [open]);

  const rawTotal = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0);
  const total = rawTotal * (1 - (Number(discount) || 0) / 100);

  const setItem = (idx: number, patch: Partial<LineItem>) =>
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const chooseVariant = (idx: number, v: { id: number; price: number }) => {
    setItem(idx, { variant_id: v.id, unit_price: Number(v.price) });
  };

  const submit = async () => {
    setError(null);
    if (!customerId) return setError("Pilih pelanggan.");
    if (items.length === 0 || items.some((i) => !i.variant_id || Number(i.quantity) <= 0)) {
      return setError("Lengkapi minimal 1 item produk.");
    }
    setSaving(true);
    try {
      const body = {
        customer_type: ctype,
        customer_id: Number(customerId),
        items: items.map((i) => ({ variant_id: i.variant_id, quantity: i.quantity, unit_price: i.unit_price })),
        discount_percent: Number(discount) || 0,
        urgency,
        closing_date: closingDate || undefined,
        notes: notes || undefined,
      };
      const r = await apiFetcher<typeof result & { ref: string; token: string | null }>("/api/deals", { method: "POST", body: JSON.stringify(body) });
      setResult({ ref: r.ref, token: r.token });
      onCreated();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const customerOptions = ctype === "B2B" ? master?.accounts ?? [] : master?.b2c ?? [];

  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="mb-4 pr-8 text-lg font-bold text-ink">Tambah Deal Baru</h2>
      {result ? (
        <div className="space-y-4 py-2">
          <div className="rounded-xl bg-agro-mist px-4 py-3 text-sm text-agro">
            Deal <b>{result.ref}</b> berhasil dibuat.
          </div>
          {result.token && (
            <div className="rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">
              Diskon &gt;5% → transaksi terkunci &amp; pengajuan approval telah dikirim ke WhatsApp Manager.
            </div>
          )}
          <Button size="lg" className="w-full" onClick={onClose}>Selesai</Button>
        </div>
      ) : (
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-2">
            {(["B2B", "B2C"] as const).map((c) => (
              <button
                key={c}
                onClick={() => { setCtype(c); setCustomerId(""); }}
                className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                  ctype === c ? "border-agro bg-agro text-white" : "border-slate-200 bg-mist text-slate-600"
                }`}
              >
                {c === "B2B" ? "Perusahaan (B2B)" : "Petani (B2C)"}
              </button>
            ))}
          </div>

          <Field label={ctype === "B2B" ? "Pelanggan Perusahaan" : "Pelanggan Petani"}>
            <select className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Pilih pelanggan…</option>
              {customerOptions.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.company_name ?? c.full_name}{c.region ? ` — ${c.region}` : ""}
                </option>
              ))}
            </select>
          </Field>

          <div>
            <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">Item Produk</div>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="flex items-start gap-2 rounded-xl border border-slate-200 p-2">
                  <div className="flex-1 space-y-1">
                    <select
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={it.variant_id || ""}
                      onChange={(e) => {
                        const v = master?.variants?.find((vv) => vv.id === Number(e.target.value));
                        if (v) chooseVariant(i, v);
                      }}
                    >
                      <option value="">Pilih produk…</option>
                      {master?.variants?.map((v) => (
                        <option key={v.id} value={v.id}>{v.product_name} — {v.variant_name}</option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={1}
                        placeholder="Jumlah"
                        value={it.quantity || ""}
                        onChange={(e) => setItem(i, { quantity: Number(e.target.value) })}
                        className="w-1/2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                      <input
                        type="number"
                        min={0}
                        placeholder="Harga"
                        value={it.unit_price || ""}
                        onChange={(e) => setItem(i, { unit_price: Number(e.target.value) })}
                        className="w-1/2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => setItems((arr) => arr.filter((_, idx) => idx !== i))}
                    disabled={items.length === 1}
                    className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-danger-mist hover:text-danger disabled:opacity-30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setItems((arr) => [...arr, { variant_id: 0, quantity: 1, unit_price: 0 }])}
              className="mt-2 flex items-center gap-1 text-xs font-bold text-agro"
            >
              <Plus className="h-3.5 w-3.5" /> Tambah item
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Diskon (%)">
              <input type="number" min={0} max={100} value={discount || ""} onChange={(e) => setDiscount(Number(e.target.value))} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" />
            </Field>
            <Field label="Perkiraan Closing">
              <input type="date" value={closingDate} onChange={(e) => setClosingDate(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" />
            </Field>
          </div>

          {Number(discount) > 5 && (
            <div className="rounded-xl bg-warning-soft px-4 py-3 text-xs leading-relaxed text-warning">
              Diskon {discount}% melebihi kewenangan agen. Deal akan terkunci dan menunggu persetujuan{" "}
              {Number(discount) > 15 ? "Head of Sales" : "Manager"} via WhatsApp.
            </div>
          )}

          <Field label="Prioritas">
            <div className="flex gap-2">
              {(["normal", "urgent"] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => setUrgency(u)}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                    urgency === u ? "border-agro bg-agro text-white" : "border-slate-200 bg-mist text-slate-600"
                  }`}
                >
                  {u === "urgent" ? "Urgent" : "Normal"}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Catatan">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" placeholder="Catatan deal…" />
          </Field>

          {error && <div className="rounded-xl bg-danger-mist px-4 py-3 text-sm text-danger">{error}</div>}

          <div className="rounded-xl bg-mist px-4 py-3">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Subtotal</span><span>{formatIDR(rawTotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-500">
              <span>Diskon</span><span>-{formatIDR(rawTotal * (Number(discount) || 0) / 100)}</span>
            </div>
            <div className="mt-1 flex justify-between text-base font-extrabold text-ink">
              <span>Total</span><span>{formatIDR(total)}</span>
            </div>
          </div>

          <Button size="lg" className="w-full" onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Simpan Deal
          </Button>
        </div>
      )}
    </Modal>
  );
}