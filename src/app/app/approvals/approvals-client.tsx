"use client";

import React from "react";
import { ShieldCheck, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { apiFetcher } from "@/lib/types";
import { formatIDR, formatDateTime } from "@/lib/format";
import { Button, Chip, Modal, EmptyState, Spinner } from "@/components/ui";

interface Approval {
  id: number;
  ref_no: string;
  customer_name: string;
  discount_percent: number;
  value_before: number;
  value_after: number;
  status: "pending" | "approved" | "rejected";
  tier: "manager" | "hos";
  requested_by_name: string;
  requested_at: string;
  urgency: string;
  review_note: string | null;
}

export default function ApprovalsClient({ role = "agent" }: { role?: string }) {
  const canReview = (a: Approval) => role === "admin" || (a.tier === "manager" && role === "manager") || (a.tier === "hos" && role === "hos");
  const [approvals, setApprovals] = React.useState<Approval[] | null>(null);
  const [filter, setFilter] = React.useState<"pending" | "all">("pending");
  const [selected, setSelected] = React.useState<Approval | null>(null);
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState<"approved" | "rejected" | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    apiFetcher<{ approvals: Approval[] }>("/api/approvals").then((r) => setApprovals(r.approvals)).catch(() => setApprovals([]));
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const list = (approvals ?? []).filter((a) => (filter === "pending" ? a.status === "pending" : true));
  const pendingCount = (approvals ?? []).filter((a) => a.status === "pending").length;

  const decide = async () => {
    if (!selected) return;
    setMsg(null);
    try {
      await apiFetcher(`/api/approvals/${selected.id}`, { method: "POST", body: JSON.stringify({ action: busy === "approved" ? "approved" : "rejected", note }) });
      setSelected(null);
      setNote("");
      load();
      setMsg("Keputusan tersimpan.");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink">
            <ShieldCheck className="h-5 w-5 text-warning" /> Persetujuan Diskon
          </h1>
          <p className="text-sm text-slate-500">{pendingCount} menunggu tindakan Anda</p>
        </div>
        <div className="flex gap-1 rounded-xl bg-slate-200/70 p-1">
          {(["pending", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${filter === f ? "bg-white text-ink shadow-sm" : "text-slate-500"}`}
            >
              {f === "pending" ? "Menunggu" : "Semua"}
            </button>
          ))}
        </div>
      </div>

      {!approvals ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : list.length === 0 ? (
        <EmptyState emoji="✅" title="Tidak ada pengajuan" desc={filter === "pending" ? "Semua approval sudah diproses." : "Belum ada riwayat approval."} />
      ) : (
        <div className="space-y-3">
          {list.map((a) => (
            <div key={a.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${a.status === "pending" ? "border-warning/40" : "border-slate-200"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-corporate">{a.ref_no}</span>
                    {a.urgency === "urgent" && (
                      <span className="flex items-center gap-1 rounded-md bg-warning-soft px-1.5 py-0.5 text-[10px] font-bold text-warning"><AlertTriangle className="h-3 w-3" /> URGENT</span>
                    )}
                    <Chip tone={a.tier === "hos" ? "violet" : "blue"}>{a.tier === "hos" ? "HOS" : "Manager"}</Chip>
                  </div>
                  <div className="mt-1 text-base font-extrabold text-ink">{a.customer_name}</div>
                  <div className="text-xs text-slate-500">
                    Diusulkan {a.requested_by_name} · {formatDateTime(a.requested_at)}
                  </div>
                </div>
                {a.status === "pending" ? <Chip tone="yellow">Menunggu</Chip>
                  : a.status === "approved" ? <Chip tone="green">Disetujui</Chip>
                  : <Chip tone="red">Ditolak</Chip>}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-mist px-3 py-2">
                  <div className="text-[10px] font-medium text-slate-400">Normal</div>
                  <div className="text-xs font-bold text-slate-500 line-through">{formatIDR(a.value_before)}</div>
                </div>
                <div className="rounded-xl bg-agro-mist px-3 py-2">
                  <div className="text-[10px] font-medium text-agro">Setelah diskon</div>
                  <div className="text-xs font-extrabold text-agro">{formatIDR(a.value_after)}</div>
                </div>
                <div className="rounded-xl bg-danger-mist px-3 py-2">
                  <div className="text-[10px] font-medium text-danger">Diskon</div>
                  <div className="text-xs font-extrabold text-danger">-{a.discount_percent}%</div>
                </div>
              </div>

              {a.status === "pending" && canReview(a) && (
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 border-danger/30 text-danger hover:bg-danger-mist"
                    onClick={() => { setSelected(a); setBusy("rejected"); }}
                  >
                    <XCircle className="h-4 w-4" /> Tolak
                  </Button>
                  <Button className="flex-1" onClick={() => { setSelected(a); setBusy("approved"); }}>
                    <CheckCircle2 className="h-4 w-4" /> Setujui
                  </Button>
                </div>
              )}
              {a.status === "pending" && !canReview(a) && (
                <div className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-500">
                  Menunggu review oleh {a.tier === "hos" ? "Head of Sales" : "Sales Manager"} (di luar kewenangan Anda).
                </div>
              )}
              {a.review_note && <div className="mt-2 rounded-lg bg-mist px-3 py-2 text-xs text-slate-500">Catatan: {a.review_note}</div>}
            </div>
          ))}
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)}>
        <h2 className="mb-1 pr-8 text-lg font-bold text-ink">
          {busy === "approved" ? "Setujui Diskon" : "Tolak Diskon"}
        </h2>
        <p className="text-sm text-slate-500">
          {selected?.customer_name} · {selected?.ref_no} · diskon {selected?.discount_percent}%{" "}
          ({formatIDR(selected?.value_before ?? 0)} → {formatIDR(selected?.value_after ?? 0)})
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Catatan keputusan (opsional)…"
          className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
        />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => setSelected(null)}>Batal</Button>
          <Button
            variant={busy === "approved" ? "primary" : "danger"}
            onClick={decide}
          >
            {busy === "approved" ? "Ya, Setujui" : "Ya, Tolak"}
          </Button>
        </div>
      </Modal>

      {msg && (
        <div className="fixed inset-x-0 bottom-20 z-50 mx-auto max-w-sm rounded-xl bg-ink px-4 py-3 text-center text-sm font-medium text-white lg:bottom-8">{msg}</div>
      )}
    </div>
  );
}