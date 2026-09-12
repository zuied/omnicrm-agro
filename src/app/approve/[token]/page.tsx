"use client";

import React from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, XCircle, Leaf, AlertTriangle, Loader2, ShieldCheck } from "lucide-react";
import { apiFetcher } from "@/lib/types";
import { formatIDR, formatDateTime } from "@/lib/format";

interface Approval {
  id: number;
  ref_no: string;
  customer_name: string;
  product_label: string;
  discount_percent: number;
  value_before: number;
  value_after: number;
  status: "pending" | "approved" | "rejected";
  tier: "manager" | "hos";
  requested_by_name: string;
  requested_at: string;
  urgency: string;
}

export default function ApprovePage() {
  const { token } = useParams<{ token: string }>();
  const [approval, setApproval] = React.useState<Approval | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<"approved" | "rejected" | null>(null);
  const [note, setNote] = React.useState("");
  const [done, setDone] = React.useState<"approved" | "rejected" | null>(null);

  React.useEffect(() => {
    apiFetcher<{ approval: Approval; alreadyReviewed?: boolean }>(`/api/approvals/token/${token}`)
      .then((r) => {
        setApproval(r.approval);
        if (r.alreadyReviewed && r.approval.status !== "pending") setDone(r.approval.status);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [token]);

  const decide = async (action: "approved" | "rejected") => {
    setBusy(action);
    try {
      await apiFetcher(`/api/approvals/token/${token}`, {
        method: "POST",
        body: JSON.stringify({ action, note, reviewer_name: "Manager via WhatsApp" }),
      });
      setDone(action);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-agro" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-agro-deep via-agro to-agro px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-4 flex items-center justify-center gap-2 text-white">
          <Leaf className="h-5 w-5" />
          <span className="text-sm font-bold">OmniCRM Agro · Persetujuan Diskon</span>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-2xl">
          {error ? (
            <div className="space-y-3 text-center">
              <XCircle className="mx-auto h-10 w-10 text-danger" />
              <h1 className="text-lg font-bold text-ink">Link tidak valid</h1>
              <p className="text-sm text-slate-500">{error}</p>
            </div>
          ) : done ? (
            <div className="space-y-3 py-4 text-center">
              {done === "approved" ? <CheckCircle2 className="mx-auto h-12 w-12 text-agro" /> : <XCircle className="mx-auto h-12 w-12 text-danger" />}
              <h1 className="text-lg font-bold text-ink">{done === "approved" ? "Diskon Disetujui" : "Diskon Ditolak"}</h1>
              <p className="text-sm text-slate-500">
                {done === "approved"
                  ? "Transaksi siap diproses. Agen telah dinotifikasi."
                  : "Agen akan menyesuaikan harga dan negosiasi ulang."}
              </p>
            </div>
          ) : approval ? (
            <>
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5" /> Permintaan Persetujuan
              </div>
              <h1 className="text-xl font-extrabold text-ink">{approval.customer_name}</h1>
              <div className="mt-0.5 text-xs text-slate-500">{approval.ref_no} · diajukan {formatDateTime(approval.requested_at)} oleh {approval.requested_by_name}</div>
              <p className="mt-2 text-sm text-slate-600">{approval.product_label}</p>

              {approval.urgency === "urgent" && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-warning-soft px-3 py-2 text-xs font-semibold text-warning">
                  <AlertTriangle className="h-4 w-4" /> Pelanggan prioritas — butuh respon cepat
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-mist p-3">
                  <div className="text-[11px] font-medium text-slate-400">Harga Normal</div>
                  <div className="text-sm font-bold text-slate-500 line-through">{formatIDR(approval.value_before)}</div>
                </div>
                <div className="rounded-xl bg-agro-mist p-3">
                  <div className="text-[11px] font-medium text-agro">Setelah Diskon</div>
                  <div className="text-sm font-extrabold text-agro">{formatIDR(approval.value_after)}</div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between rounded-xl border border-danger/20 bg-danger-mist px-4 py-3">
                <span className="text-sm font-semibold text-danger">Diskon diminta</span>
                <span className="text-xl font-extrabold text-danger">{approval.discount_percent}%</span>
              </div>

              <div className="mt-2 text-[11px] text-slate-400">
                Tingkat persetujuan: <b>{approval.tier === "hos" ? "Head of Sales" : "Sales Manager"}</b> (kebijakan diskon &gt;15% → HOS)
              </div>

              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Catatan (opsional)…"
                className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              />

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => decide("rejected")}
                  disabled={!!busy}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl border border-danger/30 bg-white font-bold text-danger transition hover:bg-danger-mist disabled:opacity-50"
                >
                  {busy === "rejected" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} Tolak
                </button>
                <button
                  onClick={() => decide("approved")}
                  disabled={!!busy}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-agro font-bold text-white transition hover:bg-agro-deep disabled:opacity-50"
                >
                  {busy === "approved" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Setujui
                </button>
              </div>
            </>
          ) : null}
        </div>

        <p className="mt-5 text-center text-xs text-white/60">Link berlaku 3x24 jam · Tindakan ini dicatat pada audit log</p>
      </div>
    </div>
  );
}