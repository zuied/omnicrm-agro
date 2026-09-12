"use client";

import React from "react";
import { BarChart3, TrendingUp, Target, Trophy, Users } from "lucide-react";
import { apiFetcher } from "@/lib/types";
import { formatIDR } from "@/lib/format";
import { KANBAN_COLUMNS } from "@/lib/types";
import { EmptyState, Spinner } from "@/components/ui";

interface Rep {
  stages: { key: string; label: string; cnt: number; total: number }[];
  pipelineValue: number;
  conversionRate: number;
  ownerPerformance: { full_name: string; cnt: number; total: number }[];
}

export default function ReportsClient() {
  const [rep, setRep] = React.useState<Rep | null>(null);
  const [ownerFilter, setOwnerFilter] = React.useState("all");

  React.useEffect(() => {
    apiFetcher<Rep>(`/api/reports${ownerFilter !== "all" ? `?owner=${encodeURIComponent(ownerFilter)}` : ""}`).then(setRep).catch(() => setRep(null));
  }, [ownerFilter]);

  if (!rep) return <div className="flex justify-center py-20"><Spinner /></div>;

  const totalDeals = rep.stages.reduce((s, x) => s + x.cnt, 0);
  const maxTotal = Math.max(...rep.stages.map((s) => s.total), 1);
  const wonTotal = rep.stages.find((s) => s.key === "Closed Won")?.total ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink">
            <BarChart3 className="h-5 w-5 text-agro" /> Laporan Pipeline
          </h1>
          <p className="text-sm text-slate-500">Ringkasan performa per tahap &amp; per sales.</p>
        </div>
        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm"
        >
          <option value="all">Semua sales</option>
          {rep.ownerPerformance.map((o) => (
            <option key={o.full_name} value={o.full_name}>{o.full_name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: TrendingUp, label: "Nilai Pipeline", value: formatIDR(rep.pipelineValue) },
          { icon: Target, label: "Konversi", value: `${rep.conversionRate}%` },
          { icon: Trophy, label: "Closed Won", value: formatIDR(wonTotal) },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-agro-mist text-agro"><c.icon className="h-5 w-5" /></span>
            <div className="mt-2 text-lg font-extrabold text-ink">{c.value}</div>
            <div className="text-[11px] text-slate-400">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-bold text-ink">Distribusi Deal per Tahap</h2>
        <div className="space-y-4">
          {KANBAN_COLUMNS.map((stage) => {
            const s = rep.stages.find((x) => x.key === stage) ?? { cnt: 0, total: 0 };
            const pct = maxTotal ? Math.round((s.total / maxTotal) * 100) : 0;
            return (
              <div key={stage}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-semibold text-ink">{stage}</span>
                  <span className="text-xs text-slate-500">{s.cnt} deal · {formatIDR(s.total)}</span>
                </div>
                <div className="h-4 w-full overflow-hidden rounded-lg bg-slate-100">
                  <div className={`h-full rounded-lg ${stage === "Closed Won" ? "bg-agro" : stage === "Pending Approval" ? "bg-violet-500" : "bg-corporate"}`} style={{ width: `${Math.max(pct, s.cnt > 0 ? 4 : 0)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 text-[11px] text-slate-400">{totalDeals} deal total pada pipeline aktif.</div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-ink">
          <Users className="h-4 w-4 text-corporate" /> Performa Sales
        </div>
        {rep.ownerPerformance.length === 0 ? (
          <EmptyState title="Belum ada data sales" />
        ) : (
          <div className="space-y-3">
            {rep.ownerPerformance.map((o, i) => (
              <div key={o.full_name} className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-corporate-soft text-xs font-bold text-corporate">{i + 1}</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-ink">{o.full_name}</div>
                  <div className="text-xs text-slate-500">{o.cnt} deal aktif</div>
                </div>
                <div className="text-sm font-bold text-ink">{formatIDR(o.total)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}