"use client";

import React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft, Factory, Truck, ReceiptText, Lock, Unlock,
  Camera, MessageSquareText, Copy, Check, Send, CalendarClock, AlertTriangle,
} from "lucide-react";
import { apiFetcher, type DealCard } from "@/lib/types";
import { formatIDR, formatDate, formatDateTime, timeAgo } from "@/lib/format";
import { STAGE_PROGRESS, STAGE_BAR_COLORS, STAGE_COLORS } from "@/lib/stages";
import { Button, Chip, Modal, Spinner, EmptyState } from "@/components/ui";

interface Deali {
  deal: DealCard & {
    items: any[];
    approvals: any[];
    timeline: any[];
    allocations: any[];
  };
}

export default function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = React.useState<Deali | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [discountDraft, setDiscountDraft] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [approvalOpen, setApprovalOpen] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const r = await apiFetcher<Deali>(`/api/deals/${id}`);
      setData(r);
      setDiscountDraft(String(r.deal.discount_percent ?? ""));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  React.useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const deal = data?.deal;

  const saveDiscount = async () => {
    if (!deal) return;
    setSaving(true);
    setMsg(null);
    try {
      await apiFetcher(`/api/deals/${deal.id}`, { method: "PATCH", body: JSON.stringify({ discount_percent: Number(discountDraft) || 0 }) });
      await load();
      if (Number(discountDraft) > 5) {
        setApprovalOpen(true);
        setMsg("Transaksi terkunci. Kirim pengajuan persetujuan.");
      } else {
        setMsg("Diskon diperbarui.");
      }
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const submitApproval = async () => {
    if (!deal) return;
    setSaving(true);
    setMsg(null);
    try {
      await apiFetcher<{ waLink: string; approveUrl: string }>(`/api/deals/${deal.id}/submit-approval`, { method: "POST" });
      setApprovalOpen(false);
      setMsg("Pengajuan approval terkirim. Transaksi terkunci.");
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async () => {
    if (!approvalLink) return;
    await navigator.clipboard.writeText(approvalLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (error) return <EmptyState emoji="⚠️" title="Gagal memuat deal" desc={error} />;
  if (!data || !deal) return <div className="flex justify-center py-20"><Spinner /></div>;

  const pendingApproval = deal.has_approval > 0 || deal.discount_status === "pending";
  const progress = STAGE_PROGRESS[deal.pipeline_stage] ?? 0;
  const pendingToken = deal.approvals.find((a: any) => a.status === "pending")?.token;
  const approvalLink = pendingToken ? `${window.location.origin}/approve/${pendingToken}` : "";

  return (
    <div className="space-y-4">
      <Link href="/app/pipeline" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-agro">
        <ArrowLeft className="h-4 w-4" /> Kembali ke pipeline
      </Link>

      {/* ================= HEADER ================= */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={deal.customer_type === "B2B" ? "blue" : "green"}>
            {deal.customer_type === "B2B" ? <Factory className="h-3 w-3" /> : <Truck className="h-3 w-3" />}
            {deal.customer_type}
          </Chip>
          <span className="text-sm font-bold text-corporate">{deal.ref_no}</span>
          {deal.urgency === "urgent" && (
            <span className="flex items-center gap-1 rounded-lg bg-warning-soft px-2 py-1 text-[11px] font-bold text-warning">
              <AlertTriangle className="h-3.5 w-3.5" /> URGENT
            </span>
          )}
          {pendingApproval ? (
            <Chip tone="yellow">PENDING APPROVAL</Chip>
          ) : deal.discount_status === "approved" ? (
            <Chip tone="green">DISETUJUI</Chip>
          ) : deal.discount_status === "rejected" ? (
            <Chip tone="red">DISKON DITOLAK</Chip>
          ) : null}
          <span className={`ml-auto text-xs font-semibold ${STAGE_COLORS[deal.pipeline_stage] ?? "text-slate-500"}`}>
            {deal.pipeline_stage}
          </span>
        </div>

        <div className="mt-4 flex items-center gap-3">
          {deal.customer_type === "B2B" ? (
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-corporate-soft text-corporate"><Factory className="h-5 w-5" /></div>
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-agro-mist text-agro"><Truck className="h-5 w-5" /></div>
          )}
          <div>
            <h1 className="text-lg font-extrabold text-ink">{deal.customer_name}</h1>
            <div className="text-xs text-slate-500">Dikelola {deal.owner_name} · update {timeAgo(deal.updated_at)}</div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${STAGE_BAR_COLORS[deal.pipeline_stage] ?? "bg-agro"}`} style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between text-[11px] font-medium text-slate-400">
            <span>Prospecting</span><span>{progress}%</span>
          </div>
        </div>
      </div>

      {/* ================= NILAI & DISKON ================= */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          <ReceiptText className="h-4 w-4" /> Nilai Transaksi
        </div>
        <div className="mt-2 text-2xl font-extrabold text-ink">{formatIDR(deal.total_value)}</div>
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
          <span>Diskon terapkan: <b className="text-danger">{deal.discount_percent}%</b></span>
          {deal.closing_date && (
            <span className="flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> Closing {formatDate(deal.closing_date)}</span>
          )}
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 p-3">
          <div className="mb-2 text-xs font-bold text-slate-500">Ubah Diskon ({deal.discount_percent}%)</div>
          <div className="flex gap-2">
            <input
              type="number" min={0} max={100} value={discountDraft}
              onChange={(e) => setDiscountDraft(e.target.value)}
              className="h-11 flex-1 rounded-xl border border-slate-300 px-4 text-sm"
            />
            <Button onClick={saveDiscount} loading={saving} disabled={pendingApproval}>Simpan</Button>
          </div>
          {Number(discountDraft) > 5 && !pendingApproval && (
            <div className="mt-2 flex items-start gap-2 rounded-xl bg-warning-soft px-3 py-2.5 text-xs leading-relaxed text-warning">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Simpan diskon &gt;5% akan mengunci transaksi dan mengirim pengajuan approval ke Manager/HOS via WhatsApp.
            </div>
          )}
          {pendingApproval && (
            <div className="mt-2 flex items-start gap-2 rounded-xl bg-warning-soft px-3 py-2.5 text-xs leading-relaxed text-warning">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
              Transaksi terkunci hingga approval selesai. Harga/diskon tidak dapat diubah.
            </div>
          )}
        </div>
      </div>

      {/* ================= APPROVAL ================= */}
      {deal.approvals.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Send className="h-4 w-4" /> Riwayat Persetujuan
          </div>
          <div className="space-y-2">
            {deal.approvals.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-mist px-4 py-3">
                <div>
                  <div className="text-sm font-bold text-ink">
                    Diskon {a.discount_percent}% · {a.tier === "hos" ? "Head of Sales" : "Manager"}
                  </div>
                  <div className="text-xs text-slate-500">
                    Diajukan {a.requested_by_name} · {formatDateTime(a.requested_at)}
                    {a.review_note ? ` · “${a.review_note}”` : ""}
                  </div>
                </div>
                {a.status === "pending" ? <Chip tone="yellow">Menunggu</Chip>
                  : a.status === "approved" ? <Chip tone="green">Disetujui</Chip>
                  : <Chip tone="red">Ditolak</Chip>}
              </div>
            ))}
          </div>
          {!pendingApproval && Number(deal.discount_percent) > 5 && (
            <Button variant="warning" className="mt-3 w-full" onClick={submitApproval} loading={saving}>
              <Send className="h-4 w-4" /> Kirim Ulang Permintaan Persetujuan
            </Button>
          )}
          {pendingToken && (
            <Button variant="outline" className="mt-2 w-full" onClick={copyLink}>
              {copied ? <Check className="h-4 w-4 text-agro" /> : <Copy className="h-4 w-4" />}
              {copied ? "Link disalin!" : "Salin Link Persetujuan (WA Deep-Link)"}
            </Button>
          )}
        </div>
      )}

      {/* ================= STOK LOCK ================= */}
      <StockLockPanel deal={deal} onChanged={load} disabled={pendingApproval} />

      {/* ================= TIMELINE ================= */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          <MessageSquareText className="h-4 w-4" /> Timeline Aktivitas
        </div>
        {deal.timeline.length === 0 ? (
          <EmptyState title="Belum ada aktivitas" desc="Foto demplot dan catatan akan muncul di sini." />
        ) : (
          <div className="space-y-3">
            {deal.timeline.map((t: any) => (
              <div key={t.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${t.kind === "photo" ? "bg-agro-mist text-agro" : "bg-corporate-soft text-corporate"}`}>
                    {t.kind === "photo" ? <Camera className="h-4 w-4" /> : <MessageSquareText className="h-4 w-4" />}
                  </div>
                  <div className="w-px flex-1 bg-slate-200" />
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-ink">{t.title ?? t.kind}</div>
                    <span className="text-[11px] text-slate-400">{timeAgo(t.created_at)}</span>
                  </div>
                  {t.description && <div className="mt-0.5 text-xs text-slate-500">{t.description}</div>}
                  {t.media_url && (
                    <a href={t.media_url} target="_blank" rel="noreferrer" className="relative mt-2 block h-36 w-full overflow-hidden rounded-xl border border-slate-200">
                      <Image src={t.media_url} alt="Demplot" fill className="object-cover" sizes="(max-width: 768px) 100vw, 640px" unoptimized />
                    </a>
                  )}
                  {t.media_size_kb ? <div className="mt-1 text-[11px] text-slate-400">{t.media_size_kb} KB</div> : null}
                </div>
              </div>
            ))}
          </div>
        )}
        <Link href={`/app/demplot?deal=${deal.id}`}>
          <Button variant="outline" className="mt-3 w-full">
            <Camera className="h-4 w-4" /> Ambil Foto Demplot untuk Deal Ini
          </Button>
        </Link>
      </div>

      {msg && (
        <div className="fixed inset-x-0 bottom-20 z-40 mx-auto max-w-sm rounded-xl bg-ink px-4 py-3 text-center text-sm font-medium text-white shadow-lg lg:bottom-8">
          {msg}
        </div>
      )}

      {/* Modal: buat pengajuan approval */}
      <Modal open={approvalOpen} onClose={() => setApprovalOpen(false)}>
        <h2 className="mb-2 pr-8 text-lg font-bold text-ink">Persetujuan Diperlukan</h2>
        <p className="text-sm leading-relaxed text-slate-500">
          Diskon <b>{deal.discount_percent}%</b> ({formatIDR(deal.total_value)}) melebihi kewenangan agen.
          Transaksi akan <b>terkunci</b> dan link persetujuan dikirim ke Manager/HOS via WhatsApp.
        </p>
        <Button size="lg" className="mt-4 w-full" onClick={submitApproval} loading={saving}>
          <Send className="h-4 w-4" /> Kirim ke WhatsApp Manager
        </Button>
      </Modal>
    </div>
  );
}

/* ============================= STOK LOCK PANEL ============================= */
function StockLockPanel({ deal, onChanged, disabled }: { deal: any; onChanged: () => void; disabled: boolean }) {
  const [inventory, setInventory] = React.useState<any[]>([]);
  const [selectedInv, setSelectedInv] = React.useState("");
  const [qty, setQty] = React.useState(1);
  const [pending, setPending] = React.useState(false);
  const [res, setRes] = React.useState<any | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!disabled) {
      apiFetcher<{ stocks: any[] }>("/api/inventory")
        .then((r) => setInventory(r.stocks.filter((s) => s.qty_available > 0)))
        .catch(() => {});
    }
  }, [disabled]);

  const lock = async () => {
    if (!selectedInv || !qty) return;
    setPending(true);
    setErr(null);
    setRes(null);
    try {
      const r = await apiFetcher<any>(`/api/deals/${deal.id}/lock-stock`, {
        method: "POST",
        body: JSON.stringify({ inventoryId: Number(selectedInv), qty: Number(qty) }),
      });
      setRes(r);
      onChanged();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
        {disabled ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
        Kunci Stok (alokasi 3x24 jam)
      </div>

      {deal.allocations.length > 0 && (
        <div className="mb-3 space-y-2">
          {deal.allocations.map((a: any) => {
            const expired = a.is_expired;
            return (
              <div key={a.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-mist px-4 py-2.5 text-sm">
                <div>
                  <div className="font-semibold text-ink">{a.variant_name} · {a.qty} {a.uom}</div>
                  <div className="text-[11px] text-slate-400">Berakhir {formatDateTime(a.expires_at)}{expired ? " · KEDALUWARSA" : ""}</div>
                </div>
                <Chip tone={expired ? "slate" : "green"}>{expired ? "Rilis" : "Terkunci"}</Chip>
              </div>
            );
          })}
        </div>
      )}

      {disabled ? (
        <div className="rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">
          Kunci stok dinonaktifkan selama menunggu approval diskon.
        </div>
      ) : (
        <div className="space-y-2">
          <select
            value={selectedInv}
            onChange={(e) => setSelectedInv(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
          >
            <option value="">Pilih gudang & produk…</option>
            {inventory.map((s) => (
              <option key={s.id} value={s.id}>
                {s.warehouse_name} · {s.variant_name} (tersedia {s.qty_available})
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="number" min={1} value={qty || ""} onChange={(e) => setQty(Number(e.target.value))}
              placeholder="Jumlah" className="h-11 w-28 rounded-xl border border-slate-300 px-4 text-sm"
            />
            <Button onClick={lock} loading={pending} className="flex-1">
              <Lock className="h-4 w-4" /> Kunci Stok
            </Button>
          </div>
          {err && <div className="rounded-xl bg-danger-mist px-3 py-2 text-xs text-danger">{err}</div>}
          {res && (
            <div className="rounded-xl bg-agro-mist px-4 py-3 text-xs text-agro">
              {res.qty} unit terkunci hingga {formatDateTime(res.expiresAt)} · respons {res.elapsedMs}ms
              {res.uat?.lockUnder1500ms ? " · ✓ sesaat" : " · lambat"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}