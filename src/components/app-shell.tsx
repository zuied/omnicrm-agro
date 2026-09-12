"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  GitBranch,
  Warehouse,
  Camera,
  MessageCircle,
  BarChart3,
  Settings,
  LogOut,
  MapPin,
  Leaf,
  Menu,
  ShieldCheck,
} from "lucide-react";
import type { SessionUser } from "@/lib/types";

const NAV_ITEMS = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard, desktop: true, mobile: true },
  { href: "/app/pipeline", label: "CRM Transaksi", icon: GitBranch, desktop: true, mobile: true },
  { href: "/app/inventory", label: "Gudang & Inventaris", icon: Warehouse, desktop: true, mobile: true },
  { href: "/app/demplot", label: "Kamera Demplot", icon: Camera, desktop: true, mobile: true },
  { href: "/app/inbox", label: "Inbox WA & Email", icon: MessageCircle, desktop: true, mobile: true },
  { href: "/app/reports", label: "Laporan Pipeline", icon: BarChart3, desktop: true, mobile: false },
  { href: "/app/approvals", label: "Persetujuan", icon: ShieldCheck, desktop: true, mobile: false, roles: ["manager", "hos", "admin"] },
  { href: "/app/settings", label: "Konfigurasi CRM", icon: Settings, desktop: true, mobile: false, roles: ["admin"] },
];

const MOBILE_NAV = NAV_ITEMS.filter((n) => n.mobile);

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    admin: { label: "Admin", cls: "bg-danger-soft text-danger" },
    hos: { label: "Head of Sales", cls: "bg-violet-100 text-violet-700" },
    manager: { label: "Manager", cls: "bg-warning-soft text-warning" },
    agent: { label: "Agent", cls: "bg-corporate-soft text-corporate" },
  };
  const m = map[role] ?? { label: role, cls: "bg-slate-200 text-slate-700" };
  return (
    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${m.cls}`}>{m.label}</span>
  );
}

export default function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const canSee = (item: (typeof NAV_ITEMS)[number]) => {
    if (item.roles && !item.roles.includes(user.role)) return false;
    return true;
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const SidebarNav = (
    <nav className="space-y-1">
      {NAV_ITEMS.filter(canSee).map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setSidebarOpen(false)}
          className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
            isActive(item.href) ? "bg-agro text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-ink"
          }`}
        >
          <item.icon className="h-[18px] w-[18px]" />
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      {/* ================= DESKTOP SIDEBAR ================= */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex items-center gap-3 px-6 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-agro text-white">
            <Leaf className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[15px] font-bold leading-tight text-ink">OmniCRM Agro</div>
            <div className="text-[11px] text-slate-500">B2B Enterprise Portal</div>
          </div>
        </div>

        <div className="flex-1 px-4 py-2">{SidebarNav}</div>

        <div className="mx-4 mb-4 rounded-xl border border-slate-200 bg-mist p-4">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <MapPin className="h-3.5 w-3.5" /> Lokasi Aktif
          </div>
          <div className="mt-1.5 text-sm font-semibold text-ink">Gudang Pekanbaru (PKU)</div>
          <div className="text-xs text-slate-500">Sektor Sawit Riau &amp; Sumatra</div>
        </div>

        <div className="flex items-center gap-3 border-t border-slate-200 px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-corporate text-xs font-bold text-white">
            {user.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-ink">{user.full_name}</div>
            <RoleBadge role={user.role} />
          </div>
          <button
            onClick={logout}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-danger-mist hover:text-danger"
            title="Keluar"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* ============ MOBILE TOP BAR ============ */}
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="text-[15px] font-bold leading-tight text-ink">{pageTitle(pathname)}</div>
          <div className="text-xs text-slate-500">OmniCRM Agro</div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 rounded-xl border border-danger/30 bg-danger-mist px-3 py-2 text-xs font-bold text-danger hover:bg-danger hover:text-white"
          aria-label="Keluar"
        >
          <LogOut className="h-4 w-4" /> Keluar
        </button>
      </header>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 animate-fade" onClick={() => setSidebarOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[280px] flex-col bg-white shadow-xl animate-pop">
            <div className="flex items-center gap-3 px-5 py-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-agro text-white">
                <Leaf className="h-5 w-5" />
              </div>
              <div className="text-[15px] font-bold text-ink">OmniCRM Agro</div>
            </div>
            <div className="flex-1 px-3">{SidebarNav}</div>
            <div className="flex items-center gap-3 border-t px-4 py-4">
              <RoleBadge role={user.role} />
              <button onClick={logout} className="ml-auto flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:text-danger">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ MAIN ============ */}
      <div className="flex min-h-screen flex-col lg:pl-[260px]">
        <main className="mx-auto w-full max-w-[1120px] flex-1 px-4 pb-28 pt-4 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">{children}</main>
      </div>

      {/* ============ MOBILE BOTTOM NAV ============ */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="grid grid-cols-5">
          {MOBILE_NAV.filter(canSee).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold ${
                isActive(item.href) ? "text-agro" : "text-slate-400"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label.split(" ")[0]}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

function pageTitle(pathname: string): string {
  if (pathname.startsWith("/app/deals")) return "Detail Transaksi";
  const t: Record<string, string> = {
    "/app": "Dashboard",
    "/app/pipeline": "CRM Transaksi",
    "/app/inventory": "Inventaris Gudang",
    "/app/demplot": "Kamera Demplot",
    "/app/inbox": "Inbox WA & Email",
    "/app/reports": "Laporan Pipeline",
    "/app/approvals": "Persetujuan Diskon",
    "/app/settings": "Konfigurasi CRM",
  };
  return t[pathname] ?? "OmniCRM Agro";
}