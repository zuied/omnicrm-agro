"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, Truck, Factory, AlertTriangle, ChevronsUp } from "lucide-react";
import type { DealCard } from "@/lib/types";
import { formatIDR, timeAgo } from "@/lib/format";
import { STAGE_ORDER, STAGE_PROGRESS, STAGE_COLORS } from "@/lib/stages";

export default function DealCardView({ deal, onMove }: { deal: DealCard; onMove?: (stage: string) => void }) {
  const stageIdx = STAGE_ORDER.indexOf(deal.pipeline_stage as any);
  const progress = STAGE_PROGRESS[deal.pipeline_stage] ?? 0;
  const nextStage = STAGE_ORDER[stageIdx + 1];
  const prevStage = STAGE_ORDER[stageIdx - 1];
  const [jumpOpen, setJumpOpen] = React.useState(false);

  // Tahap yang bisa dilompati (abaikan Pending Approval / Closed Lost yang punya alur khusus)
  const jumpTargets =
    onMove && stageIdx >= 0
      ? STAGE_ORDER.filter((s, i) => i > stageIdx && s !== "Pending Approval" && s !== "Closed Lost")
      : [];

  const urgent = deal.urgency === "urgent";
  const pendingApproval = deal.has_approval > 0 || deal.discount_status === "pending";

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
        <div className="mt-3 space-y-2" onClick={(e) => e.preventDefault()}>
          <div className="flex gap-2">
            {prevStage && (
              <button
                onClick={() => onMove(prevStage)}
                className="flex-1 rounded-lg border border-slate-200 py-1.5 text-xs font-semibold text-slate-500 hover:border-agro hover:text-agro"
              >
                ← {prevStage.replace("Quotation & Negotiation", "Negosiasi").replace("&", "&")}
              </button>
            )}
            {nextStage && deal.pipeline_stage !== "Pending Approval" && (
              <button
                onClick={() => onMove(nextStage)}
                className="flex-1 rounded-lg bg-agro py-1.5 text-xs font-semibold text-white hover:bg-agro-deep"
              >
                {nextStage.replace("Quotation & Negotiation", "Negosiasi")} →
              </button>
            )}
            {jumpTargets.length > 0 && (
              <button
                onClick={() => setJumpOpen((v) => !v)}
                className="flex items-center gap-1 rounded-lg border border-dashed border-agro/40 px-3 py-1.5 text-[11px] font-semibold text-agro hover:bg-agro-mist"
              >
                <ChevronsUp className="h-3.5 w-3.5" /> Lompat
              </button>
            )}
          </div>
          {jumpOpen && jumpTargets.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
              <div className="mb-1 px-2 text-[10px] font-bold uppercase text-slate-400">Lompat ke tahap</div>
              {jumpTargets.map((t) => (
                <button
                  key={t}
                  onClick={() => { setJumpOpen(false); onMove(t); }}
                  className="block w-full rounded-lg px-3 py-1.5 text-left text-xs font-semibold text-slate-600 hover:bg-agro-mist hover:text-agro"
                >
                  → {t.replace("Quotation & Negotiation", "Negosiasi")}
                </button>
              ))}
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