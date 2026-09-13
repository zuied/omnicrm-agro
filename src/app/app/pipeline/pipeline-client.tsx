"use client";

import React from "react";
import { Search, Plus, Filter, TrendingUp, Target, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiFetcher, MOBILE_TABS, type DealCard } from "@/lib/types";
import { formatIDR } from "@/lib/format";
import { STAGE_ORDER } from "@/lib/stages";
import DealCardView from "@/components/deal-card";
import CreateDeal from "@/components/create-deal";
import { Button, EmptyState, Spinner } from "@/components/ui";

interface PipelineResp { deals: DealCard[]; }
interface ReportResp {
  stages: { key: string; cnt: number; total: number }[];
  pipelineValue: number;
  conversionRate: number;
  openCount: number;
}

export default function PipelineClient({ canCreate = true }: { canCreate?: boolean }) {
  const router = useRouter();
  const [tab, setTab] = React.useState("testing");
  const [q, setQ] = React.useState("");
  const [deals, setDeals] = React.useState<DealCard[] | null>(null);
  const [report, setReport] = React.useState<ReportResp | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sp = new URLSearchParams();
      if (q.trim()) sp.set("q", q.trim());
      const [pipe, rep] = await Promise.all([
        apiFetcher<PipelineResp>(`/api/pipeline?${sp.toString()}`),
        apiFetcher<ReportResp>("/api/reports"),
      ]);
      setDeals(pipe.deals);
      setReport(rep);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [q]);

  React.useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const moveStage = async (deal: DealCard, stage: string) => {
    try {
      await apiFetcher(`/api/deals/${deal.id}`, { method: "PATCH", body: JSON.stringify({ stage }) });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const grouped: Record<string, DealCard[]> = {};
  for (const d of deals ?? []) {
    (grouped[d.pipeline_stage] ??= []).push(d);
  }

  const activeTab = MOBILE_TABS.find((t) => t.id === tab)!;
  const tabDeals = (deals ?? []).filter((d) => activeTab.stages.includes(d.pipeline_stage as any));

  return (
    <div className="space-y-4">
      {/* ============ STAT CARDS (desktop) ============ */}
      <div className="hidden grid-cols-3 gap-4 lg:grid">
        {[
          { icon: TrendingUp, label: "Total Pipeline Aktif", value: formatIDR(report?.pipelineValue ?? 0), sub: "Semua kanal & sales" },
          { icon: Target, label: "Tingkat Konversi", value: `${report?.conversionRate ?? 0}%`, sub: "Closed Won vs total deal" },
          { icon: Trophy, label: "Deal Sedang Berjalan", value: String(report?.openCount ?? 0), sub: "di luar Closed Won/Lost" },
        ].map((c) => (
          <div key={c.label} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-agro-mist text-agro">
              <c.icon className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{c.label}</div>
              <div className="text-xl font-extrabold text-ink">{c.value}</div>
              <div className="text-xs text-slate-500">{c.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ============ TOOLBAR ============ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari pelanggan, ref deal, produk…"
            className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-agro focus:ring-2 focus:ring-agro/20"
          />
        </div>
        <div className="flex gap-2">
          <button className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-agro" aria-label="Filter">
            <Filter className="h-4 w-4" />
          </button>
          {canCreate && (
            <Button onClick={() => setCreateOpen(true)} className="flex-1 sm:flex-none">
              <Plus className="h-4 w-4" /> Tambah Deal
            </Button>
          )}
        </div>
      </div>

      {/* ============ MOBILE TABS ============ */}
      <div className="lg:hidden">
        <div className="grid grid-cols-4 gap-1 rounded-2xl bg-slate-200/70 p-1">
          {MOBILE_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-xl py-2.5 text-sm font-bold transition ${
                tab === t.id ? "bg-white text-agro shadow-sm" : "text-slate-500"
              }`}
            >
              {t.label}
              <span className="block text-[10px] font-medium text-slate-400">
                {t.stages.join(" + ").replace(" & Negotiation", "").trim()}
              </span>
            </button>
          ))}
        </div>

        {/* Mobile deal list */}
        {loading && deals === null ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : error ? (
          <EmptyState emoji="⚠️" title="Gagal memuat data" desc={error} />
        ) : tabDeals.length === 0 ? (
          <EmptyState title="Belum ada deal di tab ini" desc="Geser tahapan melalui tombol pada kartu atau tambahkan deal baru." />
        ) : (
          <div className="space-y-3">
            {tabDeals.map((d) => (
              <DealCardView key={d.id} deal={d} onMove={(s) => moveStage(d, s)} />
            ))}
          </div>
        )}
      </div>

      {/* ============ DESKTOP KANBAN ============ */}
      <div className="hidden lg:block">
        {loading && deals === null ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : error ? (
          <EmptyState emoji="⚠️" title="Gagal memuat data" desc={error} />
        ) : (
          <div className="grid grid-cols-5 gap-3">
            {STAGE_ORDER.filter((s) => s !== "Closed Lost" && s !== "Prospecting").map((stage) => {
              const col = grouped[stage] ?? [];
              return (
                <div key={stage} className="rounded-2xl bg-slate-200/60 p-2">
                  <div className="mb-2 flex items-center justify-between px-1 pt-1">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-600">
                      {stage.replace("Quotation & Negotiation", "Negosiasi")}
                    </div>
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-md bg-white px-1.5 text-[11px] font-bold text-slate-500">
                      {col.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {col.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 py-8 text-center text-xs text-slate-400">
                        Kosong
                      </div>
                    ) : (
                      col.map((d) => (
                        <div key={d.id} onClick={() => router.push(`/app/deals/${d.id}`)}>
                          <DealCardView deal={d} onMove={(s) => moveStage(d, s)} />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile FAB */}
      {canCreate && (
        <button
          onClick={() => setCreateOpen(true)}
          className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-agro text-white shadow-lg shadow-agro/40 active:scale-95 lg:hidden"
          aria-label="Tambah Deal"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      <CreateDeal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { setCreateOpen(false); load(); }}
      />
    </div>
  );
}