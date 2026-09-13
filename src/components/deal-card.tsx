"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, ChevronLeft, X, Truck, Factory, AlertTriangle, ChevronsUp } from "lucide-react";
import type { DealCard } from "@/lib/types";
import { formatIDR, timeAgo } from "@/lib/format";
import { STAGE_ORDER, STAGE_PROGRESS, STAGE_COLORS } from "@/lib/stages";

export default function DealCardView({ deal, onMove }: { deal: DealCard; onMove?: (stage: string) => void }) {
  const stageIdx = STAGE_ORDER.indexOf(deal.pipeline_stage as any);
  const progress = STAGE_PROGRESS[deal.pipeline_stage] ?? 0;
  const nextStage = STAGE_ORDER[stageIdx + 1];
  const prevStage = STAGE_ORDER[stageIdx - 1];
  const [jumpOpen, setJumpOpen] = React.useState(false);
  const [confirmTarget, setConfirmTarget] = React.useState<string | null>(null);
  const jumpRef = React.useRef<HTMLDivElement>(null);

  const urgent = deal.urgency === "urgent";
  const pendingApproval = deal.has_approval > 0 || deal.discount_status === "pending";

  // Tahap yang bisa dilompati: semua kecuali yang berurusan dengan approval.
  // Closed Won (menjual + potong stok) dilarang selama approval masih menggantung.
  const jumpTargets =
    onMove && stageIdx >= 0
      ? STAGE_ORDER.filter(
          (s) => s !== deal.pipeline_stage && s !== "Pending Approval" && s !== "Closed Lost"
          && !(s === "Closed Won" && pendingApproval)
        )
      : [];

  // Tutup panel saat klik di luar atau menekan Escape
  React.useEffect(() => {
    if (!jumpOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (jumpRef.current && !jumpRef.current.contains(e.target as Node)) {
        setJumpOpen(false);
        setConfirmTarget(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setJumpOpen(false);
        setConfirmTarget(null);
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [jumpOpen]);

  const stageLabel = (s: string) => s.replace("Quotation & Negotiation", "Negosiasi");

  const pickJump = (t: string) => {
    if (t === "Closed Won") {
      setConfirmTarget(t);
      return;
    }
    setJumpOpen(false);
    onMove?.(t);
  };

  return (
    <Link
      href={`/app/deals/${deal.id}`}
      className="group block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-agro/40 hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] font-bold tracking-wide">
          <span className="text-slate-400">{deal.customer_type === "B2B" ? "B2B" : "B2C"}</span>
          <span className="text-corporate">{deal.ref_no}</span>
          {urgent && (
            <span className="flex items-center gap-0.5 rounded-md bg-warning-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-warning">
              <AlertTriangle className="h-3 w-3" /> Urgent
            </span>
          )}
        </div>
        <span className={`text-[11px] ${STAGE_COLORS[deal.pipeline_stage] ?? "text-slate-500"}`}>
          {deal.pipeline_stage}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2">
        {deal.customer_type === "B2B" ? (
          <Factory className="h-4 w-4 text-slate-400" />
        ) : (
          <Truck className="h-4 w-4 text-slate-400" />
        )}
        <h3 className="truncate text-[15px] font-bold text-ink">{deal.customer_name}</h3>
      </div>
      <p className="mt-1 truncate text-[13px] text-slate-500">{deal.product_label}</p>

      <div className="mt-3 flex items-end justify-between">
        <div>
          <div className="text-lg font-extrabold text-ink">{formatIDR(deal.total_value)}</div>
          {deal.discount_percent > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-danger">diskon {deal.discount_percent}%</span>
              {deal.discount_status === "auto" && (
                <span className="rounded bg-agro-mist px-1 text-[10px] font-bold text-agro">AUTO</span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-agro" />
          {timeAgo(deal.updated_at)}
        </div>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${STAGE_COLORS_BAR[deal.pipeline_stage] ?? "bg-agro"}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {(pendingApproval || onMove) && (
        <div className="mt-3 flex items-center gap-2">
          {pendingApproval && (
            <span className="flex items-center gap-1 rounded-lg bg-warning-soft px-2 py-1 text-[11px] font-bold text-warning">
              <AlertTriangle className="h-3.5 w-3.5" /> PENDING APPROVAL
            </span>
          )}
          {!pendingApproval && deal.discount_status === "none" && deal.pipeline_stage !== "Closed Won" && (
            <span className="flex items-center gap-1 rounded-lg bg-agro-mist px-2 py-1 text-[11px] font-bold text-agro">
              BUTUH RESPON
            </span>
          )}
          <span className="ml-auto flex items-center gap-0.5 text-[11px] font-semibold text-slate-400">
            oleh {deal.owner_name}
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      )}

      {onMove && (
        <div
          ref={jumpRef}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          className="relative mt-3 space-y-2"
        >
          <div className="flex gap-2">
            {prevStage && (
              <button
                onClick={() => onMove(prevStage)}
                className="flex-1 rounded-lg border border-slate-200 py-1.5 text-xs font-semibold text-slate-500 hover:border-agro hover:text-agro"
              >
                ← {stageLabel(prevStage)}
              </button>
            )}
            {nextStage && deal.pipeline_stage !== "Pending Approval" && (
              <button
                onClick={() => onMove(nextStage)}
                className="flex-1 rounded-lg bg-agro py-1.5 text-xs font-semibold text-white hover:bg-agro-deep"
              >
                {stageLabel(nextStage)} →
              </button>
            )}
            {jumpTargets.length > 0 && (
              <button
                onClick={() => {
                  setJumpOpen((v) => !v);
                  setConfirmTarget(null);
                }}
                aria-expanded={jumpOpen}
                className={`flex items-center gap-1 rounded-lg border border-dashed px-3 py-1.5 text-[11px] font-semibold transition ${jumpOpen ? "border-agro bg-agro-mist text-agro" : "border-agro/40 text-agro hover:bg-agro-mist"}`}
              >
                <ChevronsUp className="h-3.5 w-3.5" /> Lompat
              </button>
            )}
          </div>
          {jumpOpen && jumpTargets.length > 0 && (
            <div className="absolute right-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-2 shadow-xl animate-pop">
              <div className="flex items-center justify-between px-2">
                <div className="text-[10px] font-bold uppercase text-slate-400">Lompat ke tahap</div>
                <button
                  onClick={() => setJumpOpen(false)}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-ink"
                  aria-label="Tutup"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-1 max-h-60 space-y-0.5 overflow-auto">
                {jumpTargets.map((t) => {
                  const backward = STAGE_ORDER.indexOf(t) < stageIdx;
                  return (
                    <button
                      key={t}
                      onClick={() => pickJump(t)}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-slate-600 transition hover:bg-agro-mist hover:text-agro"
                    >
                      {backward ? (
                        <ChevronLeft className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-agro/60" />
                      )}
                      <span className="flex-1">{stageLabel(t)}</span>
                      {t === "Closed Won" && (
                        <span className="shrink-0 rounded bg-danger-mist px-1.5 py-0.5 text-[9px] font-bold uppercase text-danger">Potong stok</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {confirmTarget && (
                <div className="mt-2 space-y-2 rounded-lg border border-danger-soft bg-danger-mist p-3">
                  <div className="text-xs font-bold text-danger">Pindah ke {stageLabel(confirmTarget)}?</div>
                  <div className="text-[11px] leading-relaxed text-slate-600">
                    Deal dianggap menutup penjualan. Alokasi stok aktif akan <b>dipotong dari stok tersedia</b>.
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setJumpOpen(false);
                        setConfirmTarget(null);
                        onMove(confirmTarget);
                      }}
                      className="flex-1 rounded-lg bg-danger py-2 text-xs font-bold text-white hover:bg-danger/90"
                    >
                      Ya, tutup &amp; potong stok
                    </button>
                    <button
                      onClick={() => setConfirmTarget(null)}
                      className="flex-1 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-2 border-t border-slate-100 px-2 pt-1.5 text-[10px] text-slate-400">
                Tahap Pending Approval punya alur persetujuan dan tidak tersedia untuk lompat.
              </div>
            </div>
          )}
        </div>
      )}
    </Link>
  );
}

const STAGE_COLORS_BAR: Record<string, string> = {
  "Sample Testing": "bg-sky-500",
  "Quotation & Negotiation": "bg-corporate",
  "PO Verification": "bg-warning",
  "Pending Approval": "bg-violet-500",
  "Closed Won": "bg-agro",
  Prospecting: "bg-slate-400",
  "Closed Lost": "bg-danger",
};