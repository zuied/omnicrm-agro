"use client";

import React from "react";
import Link from "next/link";
import { TrendingUp, Target, Trophy, AlertTriangle, ArrowRight, Warehouse, Camera, Plus, GitBranch } from "lucide-react";
import { apiFetcher, type DealCard } from "@/lib/types";
import { useSessionUser } from "@/lib/session";
import { formatIDR } from "@/lib/format";
import DealCardView from "@/components/deal-card";

interface DashData {
  pipelineValue: number;
  conversionRate: number;
  openCount: number;
  ownerPerformance: { full_name: string; cnt: number; total: number }[];
  deals: DealCard[];
  lowStock: { variant_name: string; warehouse_name: string; qty_available: number; qty_warning: number }[];
  pendingApprovals: number;
}

export default function DashboardClient() {
  const user = useSessionUser();
  const [data, setData] = React.useState<DashData | null>(null);

  React.useEffect(() => {
    Promise.all([
      apiFetcher<any>("/api/reports"),
      apiFetcher<{ deals: DealCard[] }>("/api/pipeline"),
      apiFetcher<any>("/api/inventory"),
      apiFetcher<{ approvals: any[] }>("/api/approvals").catch(() => ({ approvals: [] })),
    ])
      .then(([rep, pipe, inv, appr]) => {
        setData({
          pipelineValue: rep.pipelineValue,
          conversionRate: rep.conversionRate,
          openCount: rep.openCount,
          ownerPerformance: rep.ownerPerformance,
          deals: pipe.deals,
          lowStock: (inv.stocks ?? []).filter((s: any) => Number(s.qty_available) <= Number(s.qty_warning)),
          pendingApprovals: (appr.approvals ?? []).filter((a: any) => a.status === "pending").length,
        });
      })
      .catch(() => {});
  }, []);

  const recent = data?.deals.slice(0, 5) ?? [];
  const requiresAction = (data?.deals ?? []).filter(
    (d) => d.discount_status === "pending" || d.urgency === "urgent"
  ).slice(0, 4);

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Halo, {user?.full_name?.split(" ")[0]} 👋</h1>
          <p className="text-sm text-slate-500">Ringkasan pipeline &amp; inventaris Anda hari ini.</p>
        </div>
        <Link href="/app/pipeline">
          <span className="hidden items-center gap-2 rounded-xl bg-agro px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-agro-deep sm:inline-flex">
            <Plus className="h-4 w-4" /> Tambah Deal
          </span>
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { icon: TrendingUp, label: "Pipeline Value", value: formatIDR(data?.pipelineValue ?? 0), tone: "text-agro bg-agro-mist" },
          { icon: Target, label: "Konversi", value: `${data?.conversionRate ?? 0}%`, tone: "text-corporate bg-corporate-soft" },
          { icon: Trophy, label: "Deal Aktif", value: String(data?.openCount ?? 0), tone: "text-warning bg-warning-soft" },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${c.tone}`}>
              <c.icon className="h-5 w-5" />
            </span>
            <div className="mt-3 text-lg font-extrabold text-ink">{c.value}</div>
            <div className="text-[11px] font-medium text-slate-400">{c.label}</div>
          </div>
        ))}
      </div>

      {user?.role !== "agent" && (
        <div className="flex items-center gap-3 rounded-2xl border border-warning/20 bg-warning-soft px-4 py-3 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
          <span className="text-ink">
            {data?.pendingApprovals ?? 0} persetujuan diskon menunggu Anda.
          </span>
          <Link href="/app/approvals" className="ml-auto inline-flex items-center gap-1 rounded-lg bg-warning px-3 py-1.5 text-xs font-bold text-white">
            Tinjau <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Butuh respon */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">Butuh Respon</h2>
            <Link href="/app/pipeline" className="text-xs font-bold text-agro">Lihat semua</Link>
          </div>
          {requiresAction.length === 0 ? (
            <div className="rounded-xl bg-mist px-4 py-8 text-center text-sm text-slate-400">Semua deal dalam kondisi baik 🌱</div>
          ) : (
            <div className="space-y-2">
              {requiresAction.map((d) => (
                <DealCardView key={d.id} deal={d} />
              ))}
            </div>
          )}
        </div>

        {/* Stok menipis */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">Stok Menipis</h2>
            <Link href="/app/inventory" className="inline-flex items-center gap-1 text-xs font-bold text-agro">
              <Warehouse className="h-3.5 w-3.5" /> Gudang
            </Link>
          </div>
          {data?.lowStock.length === 0 ? (
            <div className="rounded-xl bg-mist px-4 py-8 text-center text-sm text-slate-400">Stok aman</div>
          ) : (
            <div className="space-y-2">
              {data?.lowStock.map((s, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-mist px-3 py-2.5">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-ink">{s.variant_name}</div>
                    <div className="text-[11px] text-slate-500">{s.warehouse_name}</div>
                  </div>
                  <div className={`text-sm font-bold ${s.qty_available <= s.qty_warning ? "text-danger" : "text-ink"}`}>
                    {s.qty_available}
                    <span className="text-[10px] font-medium text-slate-400"> tersisa</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex justify-center gap-4 rounded-xl bg-agro-mist py-3 text-[11px] font-semibold text-agro lg:hidden">
            <Link href="/app/pipeline" className="inline-flex items-center gap-1"><GitBranch className="h-3.5 w-3.5" /> Pipeline</Link>
            <Link href="/app/demplot" className="inline-flex items-center gap-1"><Camera className="h-3.5 w-3.5" /> Demplot</Link>
          </div>
        </div>
      </div>

      {/* Deal terbaru */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">Deal Aktif Terbaru</h2>
          <Link href="/app/pipeline" className="text-xs font-bold text-agro">Buka pipeline</Link>
        </div>
        {recent.length === 0 ? (
          <div className="rounded-xl bg-mist px-4 py-10 text-center text-sm text-slate-400">Belum ada deal</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((d) => <DealCardView key={d.id} deal={d} />)}
          </div>
        )}
      </div>
    </div>
  );
}