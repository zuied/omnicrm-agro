"use client";

import React, { useState } from "react";
import { X } from "lucide-react";

/* ---------------- Button ---------------- */
type BtnVariant = "primary" | "secondary" | "danger" | "outline" | "ghost" | "warning";
const btnStyles: Record<BtnVariant, string> = {
  primary: "bg-agro text-white hover:bg-agro-deep active:scale-[0.98] disabled:bg-slate-300 disabled:text-slate-500",
  secondary: "bg-corporate text-white hover:bg-corporate/90 active:scale-[0.98] disabled:bg-slate-300 disabled:text-slate-500",
  danger: "bg-danger text-white hover:bg-danger/90 active:scale-[0.98] disabled:bg-slate-300 disabled:text-slate-500",
  warning: "bg-warning text-white hover:bg-warning/90 active:scale-[0.98]",
  outline: "border border-slate-300 bg-white text-ink hover:bg-slate-50 active:scale-[0.98]",
  ghost: "text-slate-600 hover:bg-slate-100",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  disabled = false,
  loading = false,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}) {
  const sizes = { sm: "h-9 px-3 text-sm", md: "h-11 px-4 text-sm", lg: "h-12 px-5 text-base" };
  const minTouch = size !== "sm" ? "min-w-[44px]" : "";
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed ${sizes[size]} ${minTouch} ${btnStyles[variant]} ${className}`}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ---------------- Badge / Chip ---------------- */
export type ChipTone = "green" | "blue" | "yellow" | "red" | "slate" | "violet";
const chipTones: Record<ChipTone, string> = {
  green: "bg-agro-soft text-agro-deep",
  blue: "bg-corporate-soft text-corporate",
  yellow: "bg-warning-soft text-warning",
  red: "bg-danger-soft text-danger",
  slate: "bg-slate-100 text-slate-600",
  violet: "bg-violet-100 text-violet-700",
};

export function Chip({ tone = "slate", children, className = "" }: { tone?: ChipTone; children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold uppercase tracking-wide ${chipTones[tone]} ${className}`}>
      {children}
    </span>
  );
}

/** Status chip mapping per state bisnis. */
export function StatusChip({ status }: { status: string }) {
  const map: Record<string, { tone: ChipTone; label: string }> = {
    "Pending Approval": { tone: "yellow", label: "PENDING APPROVAL" },
    urgent: { tone: "red", label: "BUTUH RESPON" },
    "QUOTATION...": { tone: "slate", label: "Negosiasi" },
    approved: { tone: "green", label: "DISETUJUI" },
    rejected: { tone: "red", label: "DITOLAK" },
    "Closed Won": { tone: "green", label: "SELESAI" },
    "Sample Testing": { tone: "blue", label: "TESTING" },
    "Quotation & Negotiation": { tone: "violet", label: "NEGOSIASI" },
    "PO Verification": { tone: "blue", label: "VERIFIKASI PO" },
    KIMIA: { tone: "red", label: "KIMIA" },
    "ALAT PERKEBUNAN": { tone: "violet", label: "ALAT PERKEBUNAN" },
    auto: { tone: "green", label: "OTOMATIS" },
  };
  const m = map[status] ?? { tone: "slate" as ChipTone, label: status };
  return <Chip tone={m.tone}>{m.label}</Chip>;
}

/* ---------------- Progress bar ---------------- */
export function ProgressBar({ value, label, className = "" }: { value: number; label?: string; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="space-y-1">
        {label && <div className="text-[11px] font-medium text-slate-500">{label}</div>}
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full transition-all duration-500 ${value >= 100 ? "bg-agro progress-animated" : "bg-corporate"}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
        </div>
      </div>
    </div>
  );
}

/* ---------------- Input ---------------- */
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-ink">{label}</span>}
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-danger">{error}</span>}
    </label>
  );
}

/* ---------------- Modal ---------------- */
export function Modal({
  open,
  onClose,
  children,
  maxW = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxW?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50 animate-fade" onClick={onClose} />
      <div className={`relative w-full ${maxW} rounded-t-3xl bg-white p-6 shadow-2xl animate-pop sm:rounded-3xl`}>
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
          aria-label="Tutup"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

/* ---------------- Empty state ---------------- */
export function EmptyState({ emoji = "🌱", title, desc }: { emoji?: string; title: string; desc?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center">
      <div className="text-3xl">{emoji}</div>
      <div className="text-sm font-semibold text-ink">{title}</div>
      {desc && <div className="max-w-xs text-xs text-slate-500">{desc}</div>}
    </div>
  );
}

export function usePolling<T>(fetcher: () => Promise<T>, intervalMs: number, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const d = await fetcher();
        if (alive) {
          setData(d);
          setError(null);
        }
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    };
    run();
    const timer = setInterval(run, intervalMs);
    return () => {
      alive = false;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading };
}